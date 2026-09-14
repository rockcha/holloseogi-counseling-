import { PageHeading } from "./ui/page-heading";
import { DashboardSkeleton } from "./ui/skeleton";
import { DashboardSortControl, type DashboardSort } from "./dashboard-sort";
import { useContext, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCheck,
  Clipboard,
  Clock3,
  MessageSquare,
  Plus,
  Search,
  X,
} from "lucide-react";
import { MemberProfileContext } from "./auth-gate";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { fetchStudents, type Student } from "@/lib/students";
import {
  counselingStatus,
  fetchLatestCounsels,
  fetchJournals,
  fetchMyTodayJournals,
  type Journal,
  type LatestCounsel,
} from "@/lib/counseling-journals";
import {
  createPlan,
  deletePlan,
  fetchPlans,
  type CounselingPlan,
} from "@/lib/counseling-plans";
import {
  fetchLatestParentMessages,
  recordParentMessage,
  type LatestParentMessage,
} from "@/lib/parent-messages";
import { localDate } from "@/data";
import { toast } from "sonner";

async function dashboardQuery<T>(label: string, query: Promise<T>): Promise<T> {
  try {
    return await query;
  } catch (cause) {
    const detail =
      cause && typeof cause === "object" && "message" in cause
        ? String(cause.message)
        : "조회 실패";
    throw new Error(`${label}: ${detail}`);
  }
}

function StudentCard({
  student,
  detail,
  note,
  tone = "blue",
  onNavigate,
  detailPath,
  onRemove,
  disabled = false,
  showBuilding = false,
}: {
  student: Student;
  detail?: string;
  note?: string;
  tone?: "orange" | "blue";
  onNavigate: (path: string) => void;
  detailPath?: string;
  onRemove?: () => void;
  disabled?: boolean;
  showBuilding?: boolean;
}) {
  const seatLabel = showBuilding
    ? `${student.building}관 ${student.seat_number}`
    : student.seat_number;
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`${seatLabel} ${student.name} 상담 상세 보기`}
        onClick={() =>
          onNavigate(detailPath ?? `/counseling/students/${student.id}`)
        }
        className={`w-full rounded-lg p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#426083] ${onRemove ? "pr-12" : ""} ${tone === "orange" ? "bg-[#fff0df] text-[#71370f] hover:bg-[#fbe0c2]" : "bg-[#edf2f8] text-[#17283f] hover:bg-[#dce6f2]"}`}
      >
        <span className="flex items-center gap-3 min-h-8">
          <span className="min-w-12 text-center text-xs font-bold">
            {seatLabel}
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-sm font-bold">{student.name}</span>
            {detail && (
              <span className="block mt-1 text-[11px] opacity-80">
                {detail}
              </span>
            )}
          </span>
        </span>
        {note && (
          <span className="block pt-2 text-xs whitespace-pre-wrap break-words opacity-80">
            {note}
          </span>
        )}
      </button>
      {onRemove && (
        <div className="absolute right-2 top-3">
          <RemoveButton
            student={student}
            disabled={disabled}
            onRemove={onRemove}
          />
        </div>
      )}
    </div>
  );
}

function RemoveButton({
  student,
  disabled,
  onRemove,
}: {
  student: Student;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-[#9a4d16] hover:bg-[#f6cfaa] hover:text-[#71370f]"
            aria-label={`${student.name} 상담 예정에서 제외`}
            disabled={disabled}
            onClick={onRemove}
          >
            <X size={15} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>상담 예정에서 제외</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function Dashboard({
  building,
  onNavigate,
}: {
  building: string;
  onNavigate: (path: string) => void;
}) {
  const member = useContext(MemberProfileContext);
  const [students, setStudents] = useState<Student[]>([]);
  const [latest, setLatest] = useState<LatestCounsel[]>([]);
  const [myLatest, setMyLatest] = useState<LatestCounsel[]>([]);
  const [todayJournals, setTodayJournals] = useState<Journal[]>([]);
  const [upcomingSort, setUpcomingSort] = useState<DashboardSort>("seat");
  const [completedSort, setCompletedSort] = useState<DashboardSort>("seat");
  const [plans, setPlans] = useState<CounselingPlan[]>([]);
  const [parentMessages, setParentMessages] = useState<LatestParentMessage[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [today, setToday] = useState(localDate());
  const [neededSort, setNeededSort] = useState("seat");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [markingMessages, setMarkingMessages] = useState(false);
  const [saveError, setSaveError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    let fetching = false;
    async function refresh() {
      if (fetching) return;
      fetching = true;
      try {
        const currentDay = localDate();
        const [rows, summary, personalSummary, upcoming, messages, journals] =
          await Promise.all([
            dashboardQuery("학생 정보", fetchStudents()),
            dashboardQuery("전체 상담 요약", fetchLatestCounsels()),
            dashboardQuery("내 상담 요약", fetchLatestCounsels(true)),
            dashboardQuery("상담 예정", fetchPlans(member?.id)),
            dashboardQuery(
              "내 부모님 문자 전송 기록",
              fetchLatestParentMessages(true),
            ),
            dashboardQuery(
              "오늘 상담일지",
              fetchMyTodayJournals(currentDay, member?.id),
            ),
          ]);
        if (active) {
          setStudents(rows);
          setLatest(summary);
          setMyLatest(personalSummary);
          setTodayJournals(journals);
          setPlans(upcoming);
          setParentMessages(messages);
          setToday(currentDay);
          setError("");
        }
      } catch (cause) {
        if (active)
          setError(cause instanceof Error ? cause.message : "조회 실패");
      } finally {
        fetching = false;
        if (active) setLoading(false);
      }
    }
    void refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 60_000);
    const focus = () => {
      void refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [reload, member?.id]);
  const latestDates = new Map(
    latest.map((row) => [row.student_id, row.latest_date]),
  );
  const visible = students
    .filter((row) => building === "전체" || String(row.building) === building)
    .sort(
      (a, b) =>
        a.building - b.building ||
        a.seat_number.localeCompare(b.seat_number, undefined, {
          numeric: true,
        }),
    );
  const seatOrder = (a: Student, b: Student) =>
    a.seat_number.localeCompare(b.seat_number, undefined, { numeric: true }) ||
    a.building - b.building ||
    a.name.localeCompare(b.name);
  const dueDate = (student: Student) => {
    const date = latestDates.get(student.id);
    return date
      ? Date.parse(date + "T00:00:00Z") +
          student.counseling_cycle_weeks * 7 * 86400000
      : null;
  };
  const needed = visible
    .filter(
      (row) => counselingStatus(row, latestDates.get(row.id), today).needed,
    )
    .sort((a, b) => {
      if (neededSort === "seat") return seatOrder(a, b);
      const aDue = dueDate(a),
        bDue = dueDate(b);
      if (aDue === null || bDue === null)
        return aDue === bDue ? seatOrder(a, b) : aDue === null ? 1 : -1;
      return aDue - bDue || seatOrder(a, b);
    });
  const myLatestDates = new Map(
    myLatest.map((row) => [row.student_id, row.latest_date]),
  );
  const firstCounselTimes = new Map<string, string>();
  for (const journal of todayJournals) {
    const previous = firstCounselTimes.get(journal.student_id);
    if (!previous || journal.created_at < previous)
      firstCounselTimes.set(journal.student_id, journal.created_at);
  }
  const completed = visible
    .filter((row) => myLatestDates.get(row.id) === today)
    .sort(
      (a, b) =>
        (completedSort === "oldest"
          ? (firstCounselTimes.get(a.id) ?? "").localeCompare(
              firstCounselTimes.get(b.id) ?? "",
            )
          : 0) || seatOrder(a, b),
    );
  const todayJournalByStudent = new Map<string, Journal>();
  for (const journal of todayJournals) {
    todayJournalByStudent.set(journal.student_id, journal);
  }
  const messageDates = new Map(
    parentMessages.map((row) => [row.student_id, row.last_sent_date]),
  );
  const completedMessageCount = completed.filter(
    (student) => messageDates.get(student.id) === today,
  ).length;
  const messageProgress = completed.length
    ? Math.round((completedMessageCount / completed.length) * 100)
    : 0;
  async function markAllTodayMessages() {
    if (
      markingMessages ||
      !completed.length ||
      completedMessageCount === completed.length
    )
      return;
    const unmarked = completed.filter(
      (student) => messageDates.get(student.id) !== today,
    );
    setMarkingMessages(true);
    try {
      await Promise.all(
        unmarked.map((student) => recordParentMessage(student.id, today)),
      );
      setParentMessages((previous) => [
        ...previous.filter(
          (row) => !unmarked.some((student) => student.id === row.student_id),
        ),
        ...unmarked.map((student) => ({
          student_id: student.id,
          last_sent_date: today,
        })),
      ]);
      toast.success("오늘 상담한 학생의 문자 전송을 모두 체크했습니다.");
    } catch {
      toast.error("문자 전송 체크를 저장하지 못했습니다.");
    } finally {
      setMarkingMessages(false);
    }
  }
  async function copyTodayJournals() {
    if (copying) return;
    setCopying(true);
    try {
      const journalGroups = await Promise.all(
        completed.map(async (student) => ({
          student,
          journals: (await fetchJournals(student.id)).filter(
            (journal) =>
              journal.date === today &&
              (!member || journal.counselor_id === member.id),
          ),
        })),
      );
      const lines: string[] = [];
      const grouped = new Map<
        number,
        { student: Student; journal: Journal }[]
      >();
      for (const { student, journals } of journalGroups) {
        for (const journal of journals) {
          const rows = grouped.get(student.building) ?? [];
          rows.push({ student, journal });
          grouped.set(student.building, rows);
        }
      }
      for (const [buildingNumber, rows] of [...grouped].sort(
        ([a], [b]) => a - b,
      )) {
        lines.push(`${buildingNumber}관)`);
        for (const { student, journal } of rows.sort((a, b) =>
          a.student.seat_number.localeCompare(
            b.student.seat_number,
            undefined,
            {
              numeric: true,
            },
          ),
        )) {
          lines.push(`${student.seat_number} ${student.name}`);
          lines.push(`~${journal.content.trim()}`);
          lines.push("");
        }
      }
      if (!lines.length) {
        toast.info("오늘 작성한 상담일지가 없습니다.");
        return;
      }
      await navigator.clipboard.writeText(lines.join("\n").trim());
      toast.success("오늘 상담일지를 클립보드에 복사했습니다.");
    } catch {
      toast.error("상담일지를 복사하지 못했습니다.");
    } finally {
      setCopying(false);
    }
  }
  const studentMap = new Map(visible.map((row) => [row.id, row]));
  const upcoming = plans
    .filter(
      (plan) =>
        studentMap.has(plan.student_id) &&
        (!myLatestDates.get(plan.student_id) ||
          myLatestDates.get(plan.student_id)! < plan.date),
    )
    .sort(
      (a, b) =>
        (upcomingSort === "oldest"
          ? a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
          : 0) ||
        seatOrder(studentMap.get(a.student_id)!, studentMap.get(b.student_id)!),
    );
  const available = needed.filter(
    (student) => !upcoming.some((plan) => plan.student_id === student.id),
  );
  const options = available
    .filter((row) => row.name.includes(query.trim()))
    .sort(
      (a, b) =>
        a.building - b.building ||
        a.seat_number.localeCompare(b.seat_number, undefined, {
          numeric: true,
        }),
    );
  function toggleStudent(studentId: string) {
    setSelectedStudentIds((ids) =>
      ids.includes(studentId)
        ? ids.filter((id) => id !== studentId)
        : [...ids, studentId],
    );
  }
  async function saveSelected() {
    if (lock.current) return;
    const selected = available.filter((row) =>
      selectedStudentIds.includes(row.id),
    );
    if (!selected.length) {
      setSaveError("상담이 필요한 학생을 선택해 주세요.");
      return;
    }
    lock.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const rows = await Promise.all(
        selected.map((student) =>
          createPlan(
            {
              student_id: student.id,
              date: localDate(),
              time: "00:00",
              note: "",
            },
            member?.name ?? "홀로서기",
          ),
        ),
      );
      setPlans((plans) => [...plans, ...rows]);
      setSelectedStudentIds([]);
      setOpen(false);
      toast.success("상담할 학생을 추가했습니다.");
    } catch (cause) {
      setSaveError(
        cause instanceof Error
          ? cause.message
          : "상담 예정을 저장하지 못했습니다.",
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  async function removePlan(plan: CounselingPlan) {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    try {
      await deletePlan(plan.id);
      setPlans((rows) => rows.filter((row) => row.id !== plan.id));
      toast.success("상담 예정에서 제외했습니다.");
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "상담 예정에서 제외하지 못했습니다.",
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  if (loading) return <DashboardSkeleton />;
  if (error)
    return (
      <section className="panel p-7">
        <p role="alert">
          대시보드를 불러오지 못했습니다. 아래 조회 오류를 확인해 주세요.
        </p>
        <p className="mt-2 text-sm break-words text-muted-foreground">
          {error}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            setLoading(true);
            setReload((n) => n + 1);
          }}
        >
          다시 불러오기
        </Button>
      </section>
    );
  return (
    <>
      <PageHeading emoji="🏠" className="mb-4">
        대시보드
      </PageHeading>
      <div className="dashboard-columns">
        <section
          aria-label="상담 필요한 학생"
          className="panel p-5 dashboard-section"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock3 size={18} className="text-[#426083]" />
            <h2 className="font-bold">상담 필요한 학생</h2>
            <span className="ml-auto text-lg font-bold text-[#426083]">
              {needed.length}
              <small className="ml-1 text-xs font-normal">명</small>
            </span>
          </div>
          <DashboardSortControl
            label="상담 필요한 학생"
            value={neededSort === "seat" ? "seat" : "oldest"}
            onChange={(value) =>
              setNeededSort(value === "seat" ? "seat" : "overdue")
            }
          />
          <div
            className="dashboard-list space-y-2"
            tabIndex={0}
            role="region"
            aria-label="상담 필요한 학생 목록"
          >
            {needed.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                tone="orange"
                showBuilding={building === "전체"}
                onNavigate={onNavigate}
                detail={
                  latestDates.has(student.id)
                    ? counselingStatus(
                        student,
                        latestDates.get(student.id),
                        today,
                      ).detail
                    : ""
                }
              />
            ))}
            {!needed.length && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                상담이 필요한 학생이 없습니다.
              </p>
            )}
          </div>
        </section>
        <section aria-label="상담 예정" className="panel p-5 dashboard-section">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={18} className="text-[#426083]" />
            <h2 className="font-bold">상담 예정</h2>
            <span className="ml-auto text-lg font-bold text-[#426083]">
              {upcoming.length}
              <small className="ml-1 text-xs font-normal">건</small>
            </span>
          </div>
          <DashboardSortControl
            label="상담 예정"
            value={upcomingSort}
            onChange={setUpcomingSort}
          />
          <div
            className="dashboard-list space-y-2"
            tabIndex={0}
            role="region"
            aria-label="상담 예정 목록"
          >
            {upcoming.map((plan) => (
              <StudentCard
                key={plan.id}
                student={studentMap.get(plan.student_id)!}
                tone="orange"
                onNavigate={onNavigate}
                detail={
                  plan.time === "00:00" && !plan.note
                    ? ""
                    : `${plan.date.replaceAll("-", ".")} ${plan.time}${plan.date < today ? " · 일정 지남" : ""}`
                }
                note={plan.note}
                disabled={saving}
                onRemove={() => void removePlan(plan)}
              />
            ))}
            {!upcoming.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {students.length
                  ? "예정된 상담이 없습니다."
                  : "학생관리에서 학생을 먼저 추가해 주세요."}
              </p>
            )}
          </div>
          <div className="mt-5 border-t border-[#dce6f2] pt-4">
            <Button
              variant="outline"
              className="w-full"
              disabled={!available.length}
              onClick={() => {
                setQuery("");
                setSaveError("");
                setSelectedStudentIds([]);
                setOpen(true);
              }}
            >
              <Plus size={15} />
              상담할 학생 추가
            </Button>
          </div>
        </section>
        <section
          aria-label="오늘 상담한 학생"
          className="panel p-5 dashboard-section"
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCheck size={18} className="text-[#426083]" />
            <h2 className="font-bold">오늘 상담한 학생</h2>
            <span className="ml-auto text-lg font-bold text-[#426083]">
              {completed.length}
              <small className="ml-1 text-xs font-normal">명</small>
            </span>
          </div>
          <DashboardSortControl
            label="오늘 상담한 학생"
            value={completedSort}
            onChange={setCompletedSort}
          />
          <div
            className="dashboard-list space-y-2"
            tabIndex={0}
            role="region"
            aria-label="오늘 상담한 학생 목록"
          >
            {completed.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                onNavigate={onNavigate}
                detailPath={
                  todayJournalByStudent.has(student.id)
                    ? `/counseling/students/${student.id}/journals/${todayJournalByStudent.get(student.id)!.id}`
                    : undefined
                }
              />
            ))}
            {!completed.length && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                오늘 작성된 상담 기록이 없습니다.
              </p>
            )}
          </div>
          <div
            className="mt-5 border-t border-[#dce6f2] pt-4"
            aria-label="문자 전송 진행도"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-[#426083]">
                    문자 전송 진행도
                  </span>
                  <span className="font-bold tabular-nums text-[#426083]">
                    {completedMessageCount}/{completed.length}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-[#e4ebf3]"
                  role="progressbar"
                  aria-label="부모님 문자 전송 진행률"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={messageProgress}
                >
                  <div
                    className="h-full rounded-full bg-[#426083] transition-[width]"
                    style={{ width: `${messageProgress}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="오늘 상담한 학생 문자 전송 모두 체크"
                        disabled={
                          markingMessages ||
                          !completed.length ||
                          completedMessageCount === completed.length
                        }
                        onClick={() => void markAllTodayMessages()}
                        className="size-11 text-[#426083] hover:bg-[#dce6f2] hover:text-[#17283f]"
                      >
                        <MessageSquare size={20} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      오늘 상담한 학생 문자 전송 모두 체크
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="오늘 상담일지 복사"
                        disabled={copying || !completed.length}
                        onClick={() => void copyTodayJournals()}
                        className="size-11 text-[#426083] hover:bg-[#dce6f2] hover:text-[#17283f]"
                      >
                        <Clipboard size={20} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>오늘의 상담 일지 복사</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!lock.current) setOpen(value);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>상담할 학생 추가</DialogTitle>
            <DialogDescription>
              여러 학생을 선택한 뒤 한 번에 상담 예정으로 추가할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-2.5 text-muted-foreground"
            />
            <Input
              aria-label="예정 학생 이름 검색"
              placeholder="학생 이름 검색"
              className="pl-9"
              disabled={saving}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {options.map((student) => (
              <button
                key={student.id}
                type="button"
                disabled={saving}
                aria-pressed={selectedStudentIds.includes(student.id)}
                onClick={() => toggleStudent(student.id)}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors disabled:opacity-50 ${selectedStudentIds.includes(student.id) ? "bg-[#314d73] text-white hover:bg-[#294365]" : "bg-muted hover:bg-accent"}`}
              >
                <span
                  className={`text-xs font-bold ${selectedStudentIds.includes(student.id) ? "text-white" : "text-[#426083]"}`}
                >
                  {student.seat_number}
                </span>
                <span className="flex-1 text-sm">{student.name}</span>
                <span
                  className={`text-xs ${selectedStudentIds.includes(student.id) ? "text-white" : "text-muted-foreground"}`}
                >
                  {selectedStudentIds.includes(student.id) ? "선택됨" : "선택"}
                </span>
              </button>
            ))}
            {!options.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                추가할 학생이 없습니다.
              </p>
            )}
          </div>
          {saving && (
            <p role="status" className="text-sm text-muted-foreground">
              추가 중…
            </p>
          )}
          {saveError && (
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
          )}
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <span className="text-xs text-muted-foreground">
              {selectedStudentIds.length}명 선택
            </span>
            <Button
              type="button"
              disabled={saving || selectedStudentIds.length === 0}
              onClick={() => void saveSelected()}
            >
              {saving ? "추가 중…" : "선택한 학생 추가"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
