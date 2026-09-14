import { PageHeading } from "./ui/page-heading";
import { TableSkeleton, Skeleton } from "./ui/skeleton";
import { useContext, useEffect, useRef, useState } from "react";
import { MemberProfileContext } from "./auth-gate";
import { Plus, Search } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  deleteStudent,
  fetchStudents,
  saveStudent,
  type Student,
} from "@/lib/students";
import { toast } from "sonner";

export function StudentManagement({ building }: { building: string }) {
  const member = useContext(MemberProfileContext);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Student | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    fetchStudents()
      .then((rows) => {
        if (active) setStudents(rows);
      })
      .catch(() => {
        if (active)
          setLoadError(
            "학생 리스트를 불러오지 못했습니다. 연결과 students 테이블 설정을 확인해 주세요.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);
  function edit(student: Student | null) {
    setSelected(student);
    setError("");
    setConfirmDelete(false);
    setOpen(true);
  }
  async function mutate(student: Student | null) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (student) {
        const saved = await saveStudent(
          student,
          Boolean(selected),
          member?.name ?? "홀로서기",
        );
        setStudents((rows) =>
          selected
            ? rows.map((row) => (row.id === saved.id ? saved : row))
            : [...rows, saved],
        );
        toast.success("학생 정보를 저장했습니다.");
      } else if (selected) {
        await deleteStudent(selected.id, member?.name ?? "홀로서기");
        setStudents((rows) => rows.filter((row) => row.id !== selected.id));
        toast.success("학생을 삭제했습니다.");
      }
      setConfirmDelete(false);
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "처리하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const filtered = students
    .filter(
      (row) =>
        (building === "전체" || String(row.building) === building) &&
        row.name.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        a.building - b.building ||
        a.seat_number.localeCompare(b.seat_number, undefined, {
          numeric: true,
        }),
    );
  return (
    <>
      <section className="panel overflow-hidden">
        <div>
          <div className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <PageHeading as="h2" emoji="🎓">
                학생 리스트{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {loading ? (
                    <Skeleton className="inline-block h-4 w-8 align-middle" />
                  ) : (
                    `${filtered.length}명`
                  )}
                </span>
              </PageHeading>
              <p className="subtext mt-1">
                학생을 클릭하면 정보를 수정하거나 삭제할 수 있습니다.
              </p>
            </div>
            <Button
              onClick={() => edit(null)}
              disabled={loading || Boolean(loadError)}
            >
              <Plus size={16} />
              학생 추가
            </Button>
          </div>
          <div className="px-5 pb-5 flex flex-wrap gap-3 justify-between">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-2.5 text-muted-foreground"
              />
              <Input
                className="pl-9 w-60"
                aria-label="학생 검색"
                placeholder="학생 이름 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
        {loading ? (
          <TableSkeleton
            label="학생 리스트"
            columns={[
              "좌석번호",
              "이름",
              "구분",
              "학교",
              "선택과목",
              "특이사항",
              "전화번호",
            ]}
          />
        ) : loadError ? (
          <div role="alert" className="p-5">
            <p>{loadError}</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => setReload((n) => n + 1)}
            >
              다시 불러오기
            </Button>
          </div>
        ) : (
          <div className="table-wrap h-[420px] overflow-y-auto overscroll-contain">
            <table>
              <thead className="sticky top-0 z-10">
                <tr>
                  <th>좌석번호</th>
                  <th>이름</th>
                  <th>구분</th>
                  <th>학교</th>
                  <th>선택과목</th>
                  <th>특이사항</th>
                  <th>전화번호</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
                  <tr
                    key={student.id}
                    className="student-row cursor-pointer transition-colors"
                    onClick={() => edit(student)}
                  >
                    <td>{student.seat_number || "-"}</td>
                    <td>
                      <button
                        className="font-bold text-left"
                        aria-label={`${student.name} 학생 수정`}
                        onClick={(e) => {
                          e.stopPropagation();
                          edit(student);
                        }}
                      >
                        {student.name}
                      </button>
                    </td>
                    <td>{student.student_status || "-"}</td>
                    <td>{student.school || "-"}</td>
                    <td className="min-w-48">
                      {student.korean_subject ||
                      student.math_subject ||
                      student.inquiry_subject_1 ||
                      student.inquiry_subject_2 ? (
                        <div className="text-xs space-y-1">
                          <p>
                            국어: {student.korean_subject || "-"} · 수학:{" "}
                            {student.math_subject || "-"}
                          </p>
                          <p>
                            탐구 1: {student.inquiry_subject_1 || "-"} · 탐구 2:{" "}
                            {student.inquiry_subject_2 || "-"}
                          </p>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <p
                        className="max-w-60 line-clamp-2 whitespace-pre-wrap break-words"
                        title={student.special_notes || undefined}
                      >
                        {student.special_notes || "-"}
                      </p>
                    </td>
                    <td>{student.phone || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="p-10 text-center text-sm text-muted-foreground">
                {students.length
                  ? "검색 조건에 맞는 학생이 없습니다."
                  : "등록된 학생이 없습니다. 학생을 추가해 주세요."}
              </p>
            )}
          </div>
        )}
      </section>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!lock.current) setOpen(value);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selected ? "학생 정보 수정" : "학생 추가"}
            </DialogTitle>
            <DialogDescription>
              학생 정보와 주 단위 상담주기를 입력해 주세요.
            </DialogDescription>
          </DialogHeader>
          <form
            key={selected?.id ?? "new"}
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const name = String(data.get("name")).trim();
              if (!name) {
                setError("학생 이름을 입력해 주세요.");
                return;
              }
              void mutate({
                id: selected?.id ?? crypto.randomUUID(),
                name,
                student_status: (data.get("student_status") === "unset"
                  ? null
                  : data.get("student_status")) as Student["student_status"],
                building: Number(data.get("building")),
                gender: (data.get("gender") === "unset"
                  ? null
                  : data.get("gender")) as Student["gender"],
                seat_number: String(data.get("seat_number"))
                  .trim()
                  .toUpperCase(),
                phone: String(data.get("phone")).trim() || null,
                school: String(data.get("school") ?? "").trim() || null,
                korean_subject:
                  String(data.get("korean_subject") ?? "").trim() || null,
                math_subject:
                  String(data.get("math_subject") ?? "").trim() || null,
                inquiry_subject_1:
                  String(data.get("inquiry_subject_1") ?? "").trim() || null,
                inquiry_subject_2:
                  String(data.get("inquiry_subject_2") ?? "").trim() || null,
                special_notes:
                  String(data.get("special_notes") ?? "").trim() || null,
                counseling_cycle_weeks: Number(data.get("cycle")),
                counseling_requested:
                  data.get("counseling_requested") === "yes",
                ...(selected?.source_sheet
                  ? { source_sheet: selected.source_sheet }
                  : {}),
              });
            }}
          >
            <fieldset disabled={busy} className="grid grid-cols-2 gap-4">
              <label className="field">
                이름
                <input
                  name="name"
                  required
                  maxLength={50}
                  defaultValue={selected?.name}
                />
              </label>
              <div className="field">
                <label htmlFor="student-building">관</label>
                <Select
                  name="building"
                  defaultValue={String(
                    selected?.building ?? (building === "2" ? 2 : 1),
                  )}
                  disabled={busy}
                >
                  <SelectTrigger id="student-building" aria-label="관">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1관</SelectItem>
                    <SelectItem value="2">2관</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="field">
                <label htmlFor="student-gender">남녀</label>
                <Select
                  name="gender"
                  defaultValue={selected?.gender ?? "unset"}
                  disabled={busy}
                >
                  <SelectTrigger id="student-gender" aria-label="남녀">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">-</SelectItem>
                    <SelectItem value="남">남</SelectItem>
                    <SelectItem value="여">여</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="field">
                좌석번호
                <input
                  name="seat_number"
                  required
                  pattern="(?:[A-Za-z]+[0-9]+|502-[0-9]+)"
                  maxLength={20}
                  placeholder="M13, W01, 502-1"
                  defaultValue={selected?.seat_number}
                />
              </label>
              <div className="field">
                <label htmlFor="student-status">구분</label>
                <Select
                  name="student_status"
                  defaultValue={selected?.student_status ?? "unset"}
                  disabled={busy}
                >
                  <SelectTrigger id="student-status" aria-label="구분">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">-</SelectItem>
                    <SelectItem value="재학생">재학생</SelectItem>
                    <SelectItem value="재수생">재수생</SelectItem>
                    <SelectItem value="N수생">N수생</SelectItem>
                    <SelectItem value="자퇴생">자퇴생</SelectItem>
                    <SelectItem value="공시생">공시생</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="field">
                전화번호
                <input
                  type="tel"
                  name="phone"
                  maxLength={30}
                  placeholder="010-1234-5678"
                  defaultValue={selected?.phone ?? ""}
                />
              </label>
              <div className="field">
                <label htmlFor="student-cycle">상담주기</label>
                <Select
                  name="cycle"
                  required
                  defaultValue={
                    selected && selected.counseling_cycle_weeks > 4
                      ? ""
                      : String(selected?.counseling_cycle_weeks ?? 1)
                  }
                  disabled={busy}
                >
                  <SelectTrigger id="student-cycle" aria-label="상담주기">
                    <SelectValue placeholder="상담주기 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">상담 없음</SelectItem>
                    {Array.from({ length: 4 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1}주
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="field">
                <label htmlFor="student-requested">상담 희망 여부</label>
                <Select
                  name="counseling_requested"
                  defaultValue={
                    selected?.counseling_requested === false ||
                    selected?.counseling_cycle_weeks === 0
                      ? "no"
                      : "yes"
                  }
                  disabled={busy}
                >
                  <SelectTrigger
                    id="student-requested"
                    aria-label="상담 희망 여부"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">희망</SelectItem>
                    <SelectItem value="no">미희망</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="field col-span-2">
                학교
                <input
                  name="school"
                  maxLength={100}
                  placeholder="예: 고양외고(졸)"
                  defaultValue={selected?.school ?? ""}
                />
              </label>
              <label className="field">
                국어 선택과목
                <input
                  name="korean_subject"
                  maxLength={100}
                  placeholder="예: 언어와 매체"
                  defaultValue={selected?.korean_subject ?? ""}
                />
              </label>
              <label className="field">
                수학 선택과목
                <input
                  name="math_subject"
                  maxLength={100}
                  placeholder="예: 확률과 통계"
                  defaultValue={selected?.math_subject ?? ""}
                />
              </label>
              <label className="field">
                탐구 1
                <input
                  name="inquiry_subject_1"
                  maxLength={100}
                  placeholder="예: 생활과 윤리"
                  defaultValue={selected?.inquiry_subject_1 ?? ""}
                />
              </label>
              <label className="field">
                탐구 2
                <input
                  name="inquiry_subject_2"
                  maxLength={100}
                  placeholder="예: 윤리와 사상"
                  defaultValue={selected?.inquiry_subject_2 ?? ""}
                />
              </label>
              <div className="field col-span-2">
                <label htmlFor="student-special-notes">특이사항</label>
                <textarea
                  id="student-special-notes"
                  name="special_notes"
                  rows={4}
                  maxLength={5000}
                  placeholder="학생 지도 시 참고할 내용을 입력해 주세요."
                  defaultValue={selected?.special_notes ?? ""}
                />
              </div>
            </fieldset>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              {selected && (
                <Button
                  type="button"
                  variant="destructive"
                  className="mr-auto"
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    setConfirmDelete(true);
                  }}
                >
                  학생 삭제
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "처리 중…" : "저장"}
              </Button>
            </div>
          </form>
          <AlertDialog
            open={confirmDelete}
            onOpenChange={(value) => {
              if (!lock.current) setConfirmDelete(value);
            }}
          >
            <AlertDialogContent
              onEscapeKeyDown={(event) => {
                if (busy) event.preventDefault();
              }}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  {selected?.name} 학생 정보가 삭제됩니다. 삭제한 정보는 복구할
                  수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>취소</AlertDialogCancel>
                <AlertDialogAction
                  disabled={busy}
                  onClick={(event) => {
                    event.preventDefault();
                    void mutate(null);
                  }}
                >
                  {busy ? "삭제 중…" : "삭제"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>
    </>
  );
}
