import { useEffect, useState } from "react";
import { localDate } from "@/data";
import { fetchStudents, type Student } from "@/lib/students";
import { fetchJournalStatistics, type JournalStatistic } from "@/lib/counseling-journals";
import { PageHeading } from "./ui/page-heading";
import { Button } from "./ui/button";

export function CounselingStatistics({ building }: { building: string }) {
  const [data, setData] = useState<{ students: Student[]; journals: JournalStatistic[] } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [period, setPeriod] = useState<"week" | "month" | "all">("month");
  useEffect(() => {
    let active = true;
    setError(false);
    setData(null);
    Promise.all([fetchStudents(), fetchJournalStatistics()])
      .then(([students, journals]) => { if (active) setData({ students, journals }); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [retry]);

  const today = new Date();
  const todayKey = localDate(today);
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (today.getDay() + 6) % 7);
  const weekStart = localDate(monday);
  const monthStart = localDate(new Date(today.getFullYear(), today.getMonth(), 1));
  const students = (data?.students ?? []).filter(student => building === "전체" || String(student.building) === building);
  const ids = new Set(students.map(student => student.id));
  const journals = (data?.journals ?? []).filter(row => ids.has(row.student_id) && row.date <= todayKey);
  const weekCount = journals.filter(row => row.date >= weekStart).length;
  const monthCount = journals.filter(row => row.date >= monthStart).length;
  const selected = journals.filter(row => period === "all" || row.date >= (period === "week" ? weekStart : monthStart));
  const counts = new Map<string, number>();
  selected.forEach(row => counts.set(row.student_id, (counts.get(row.student_id) ?? 0) + 1));
  const ranked = students.map(student => ({ ...student, count: counts.get(student.id) ?? 0 }))
    .filter(student => student.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id));
  const weekly = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(monday);
    start.setDate(start.getDate() - (7 - index) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { label: `${start.getMonth() + 1}/${start.getDate()} 주`, count: journals.filter(row => row.date >= localDate(start) && row.date < localDate(end)).length };
  });
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
    const key = localDate(start).slice(0, 7);
    return { label: `${start.getFullYear()}.${String(start.getMonth() + 1).padStart(2, "0")}`, count: journals.filter(row => row.date.startsWith(key)).length };
  });

  return <section className="panel p-5 sm:p-6">
    <PageHeading emoji="📊">상담 통계</PageHeading>
    <p className="subtext mt-2">{building === "전체" ? "전체 관" : `${building}관`} · 상담일 기준 · {todayKey}까지의 기록</p>
    {error ? <div role="alert" className="py-12 text-center"><p>상담 통계를 불러오지 못했습니다.</p><Button className="mt-4" variant="outline" onClick={() => setRetry(value => value + 1)}>다시 불러오기</Button></div>
      : !data ? <p role="status" className="py-12 text-center text-sm text-muted-foreground">상담 통계를 불러오는 중…</p>
      : <div className="mt-6 space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {[["이번 주 상담", weekCount, `${weekStart} ~ ${todayKey}`], ["이번 달 상담", monthCount, `${monthStart} ~ ${todayKey}`], ["누적 상담", journals.length, "전체 기간"]].map(([label, count, note]) => <div key={label} className="rounded-xl border border-[#e1e7ef] bg-[#f8fafc] p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold text-[#17283f]">{count}<span className="ml-1 text-sm font-normal">건</span></p><p className="mt-2 text-xs text-muted-foreground">{note}</p></div>)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <CountChart title="주간 상담 건수" subtitle="최근 8주 · 월요일~일요일" rows={weekly} />
          <CountChart title="월간 상담 건수" subtitle="최근 6개월" rows={monthly} />
        </div>
        <div className="rounded-xl border border-[#e1e7ef] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-[#17283f]">학생별 상담 순위</h2>
            <div className="flex gap-1 rounded-lg bg-[#edf1f6] p-1">
              {([["week", "이번 주"], ["month", "이번 달"], ["all", "전체"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)} className={`rounded-md px-3 py-1.5 text-xs ${period === value ? "bg-white font-bold text-[#17283f] shadow-sm" : "text-muted-foreground"}`}>{label}</button>)}
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">같은 상담 건수는 공동 순위로 표시합니다.</p>
          {ranked.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">해당 기간의 상담 기록이 없습니다.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="py-3">순위</th><th>학생</th><th>관 · 좌석</th><th className="text-right">상담 건수</th></tr></thead><tbody>{ranked.map((student, index) => <tr key={student.id} className="border-b border-[#edf1f6] last:border-0"><td className="py-3">{ranked.findIndex(row => row.count === student.count) + 1}</td><td className="font-semibold">{student.name}</td><td>{student.building}관 · {student.seat_number || "—"}</td><td className="text-right tabular-nums">{ranked[index].count}건</td></tr>)}</tbody></table></div>}
        </div>
      </div>}
  </section>;
}

function CountChart({ title, subtitle, rows }: { title: string; subtitle: string; rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map(row => row.count));
  return <section className="rounded-xl border border-[#e1e7ef] p-5"><h2 className="font-bold text-[#17283f]">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p><ul className="mt-5 space-y-3">{rows.map(row => <li key={row.label} className="flex items-center gap-3 text-xs"><span className="w-16 shrink-0 text-muted-foreground">{row.label}</span><div aria-hidden="true" className="h-3 flex-1 overflow-hidden rounded-full bg-[#edf1f6]"><div className="h-full rounded-full bg-[#426083]" style={{ width: `${row.count / max * 100}%` }} /></div><span className="w-12 text-right tabular-nums">{row.count}건</span></li>)}</ul></section>;
}
