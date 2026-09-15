import { useEffect, useState } from "react";
import { fetchStudents, type Student } from "@/lib/students";
import { PageHeading } from "./ui/page-heading";
import { Button } from "./ui/button";

export function StudentStatistics({ building }: { building: string }) {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setStudents(null);
    setError(false);
    fetchStudents()
      .then((rows) => {
        if (active) setStudents(rows);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  const filtered = (students ?? []).filter(
    (student) => building === "전체" || String(student.building) === building,
  );
  return (
    <section className="panel p-5 sm:p-6">
      <PageHeading emoji="📊">학생 통계</PageHeading>
      <p className="subtext mt-2">
        {building === "전체" ? "전체 관" : `${building}관`} · 현재 등록된 학생
        수
      </p>
      {error ? (
        <div role="alert" className="py-12 text-center">
          <p>학생 통계를 불러오지 못했습니다.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setRetry((value) => value + 1)}
          >
            다시 불러오기
          </Button>
        </div>
      ) : !students ? (
        <p
          role="status"
          className="py-12 text-center text-sm text-muted-foreground"
        >
          학생 통계를 불러오는 중…
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-3">
            <div className="rounded-xl border border-[#e1e7ef] bg-[#f8fafc] p-5">
              <h2 className="text-sm text-muted-foreground">전체 학생 수</h2>
              <p className="mt-2 text-3xl font-bold text-[#17283f]">
                {filtered.length}
                <span className="ml-1 text-sm font-normal">명</span>
              </p>
            </div>
          </div>
          {filtered.length === 0 && (
            <p role="status" className="text-sm text-muted-foreground">
              등록된 학생이 없습니다.
            </p>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <StudentCounts
              title="학적별 학생 수"
              rows={[
                "재학생",
                "재수생",
                "N수생",
                "자퇴생",
                "공시생",
                "미등록",
              ].map((label) => ({
                label,
                count: filtered.filter(
                  (student) => (student.student_status ?? "미등록") === label,
                ).length,
              }))}
            />
            <StudentCounts
              title="성별 학생 수"
              rows={["남", "여", "미등록"].map((label) => ({
                label,
                count: filtered.filter(
                  (student) => (student.gender ?? "미등록") === label,
                ).length,
              }))}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function StudentCounts({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number }[];
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <section className="rounded-xl border border-[#e1e7ef] p-5">
      <h2 className="font-bold text-[#17283f]">{title}</h2>
      <ul className="mt-5 space-y-4">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-3 text-sm">
            <span className="w-16 shrink-0 text-muted-foreground">
              {row.label}
            </span>
            <div
              aria-hidden="true"
              className="h-3 flex-1 overflow-hidden rounded-full bg-[#edf1f6]"
            >
              <div
                className="h-full rounded-full bg-[#426083]"
                style={{ width: `${total ? (row.count / total) * 100 : 0}%` }}
              />
            </div>
            <span className="w-24 text-right text-xs tabular-nums">
              {row.count}명 ·{" "}
              {total ? Math.round((row.count / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
