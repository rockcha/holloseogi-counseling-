import { PageHeading } from "./ui/page-heading";
import { CounselingSkeleton } from "./ui/skeleton";
import { useContext, useEffect, useRef, useState } from "react";
import { Eraser, Save, BookOpen, Eye, Plus, Search, Phone } from "lucide-react";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

import { MemberProfileContext } from "./auth-gate";
import { fetchStudents, type Student } from "@/lib/students";
import {
  counselingStatus,
  createJournal,
  deleteJournal,
  fetchAllJournals,
  fetchCounselingTeachers,
  fetchJournals,
  fetchLatestCounsels,
  updateJournal,
  type Journal,
  type LatestCounsel,
  type CounselingTeacher,
} from "@/lib/counseling-journals";
import { localDate } from "@/data";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  fetchLatestParentMessages,
  type LatestParentMessage,
} from "@/lib/parent-messages";

const richTextTags = new Set(["STRONG", "B", "MARK", "BR", "DIV", "P", "SPAN"]);

function sanitizeRichText(value: string) {
  if (!value.includes("<")) {
    const element = document.createElement("div");
    element.textContent = value;
    return element.innerHTML.replaceAll("\n", "<br>");
  }
  const documentFragment = new DOMParser().parseFromString(value, "text/html");
  documentFragment.body.querySelectorAll("*").forEach((element) => {
    if (!richTextTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }
    if (element.tagName === "SPAN") {
      const children = Array.from(element.childNodes);
      const color = (element as HTMLElement).style.backgroundColor;
      if (!color || !/^(#[0-9a-f]{6}|rgb\([^)]*\))$/i.test(color)) {
        element.replaceWith(...children);
        return;
      }
      element.setAttribute("style", `background-color: ${color}`);
      return;
    }
    Array.from(element.attributes).forEach((attribute) => {
      element.removeAttribute(attribute.name);
    });
  });
  return documentFragment.body.innerHTML;
}

function plainTextFromRichText(value: string) {
  const element = document.createElement("div");
  element.innerHTML = sanitizeRichText(value);
  return element.textContent ?? "";
}

function RichJournalEditor({
  value,
  readOnly,
  onDirty,
}: {
  value: string;
  readOnly: boolean;
  onDirty: () => void;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const savedSelection = useRef<Range | null>(null);
  const initialHtml = useRef(sanitizeRichText(value));
  const [html, setHtml] = useState(() => sanitizeRichText(value));
  const [removeHighlightMode, setRemoveHighlightMode] = useState(false);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const colors = [
    ["#fff1b8", "노랑 하이라이트"],
    ["#d9f3e6", "초록 하이라이트"],
    ["#dceeff", "파랑 하이라이트"],
    ["#f9d9e8", "분홍 하이라이트"],
    ["#e8def8", "보라 하이라이트"],
    ["#ffe0c2", "복숭아 하이라이트"],
  ];
  const emojis = ["😊", "👍", "⭐", "📌", "✅"];

  function update() {
    const next = sanitizeRichText(editor.current?.innerHTML ?? "");
    setHtml(next);
    onDirty();
  }
  function rememberSelection() {
    const selection = window.getSelection();
    if (
      selection?.rangeCount &&
      editor.current?.contains(selection.anchorNode)
    ) {
      savedSelection.current = selection.getRangeAt(0).cloneRange();
    }
  }
  function restoreSelection() {
    const selection = window.getSelection();
    const range = savedSelection.current;
    if (!selection || !range) return;
    selection.removeAllRanges();
    selection.addRange(range);
  }
  function format(command: string, argument?: string) {
    if (readOnly) return;
    editor.current?.focus();
    restoreSelection();
    if (command === "hiliteColor" || command === "backColor") {
      document.execCommand("styleWithCSS", false, "true");
    }
    document.execCommand(command, false, argument);
    update();
  }
  function applyHighlight(color: string) {
    const selection = window.getSelection();
    if (!selection?.toString()) return;
    setRemoveHighlightMode(false);
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("hiliteColor", false, color);
    update();
    setActiveColor(null);
  }
  function insertEmoji(emoji: string) {
    if (readOnly) return;
    editor.current?.focus();
    restoreSelection();
    document.execCommand("insertText", false, emoji);
    update();
  }
  function removeSelectedHighlight() {
    if (readOnly || !window.getSelection()?.toString()) return;
    format("hiliteColor", "transparent");
    setRemoveHighlightMode(false);
  }

  return (
    <div className="journal-rich-editor">
      {!readOnly && (
        <div
          className="journal-format-toolbar"
          role="toolbar"
          aria-label="내용 서식"
        >
          <div className="journal-highlight-tools">
            <span className="text-xs text-muted-foreground">하이라이트</span>
            {colors.map(([color, label]) => (
              <button
                key={color}
                type="button"
                aria-label={label}
                aria-pressed={activeColor === color}
                title={label}
                className={`journal-color-button ${activeColor === color ? "is-selected" : ""}`}
                style={{ backgroundColor: color }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  rememberSelection();
                }}
                onClick={() => {
                  setRemoveHighlightMode(false);
                  setActiveColor(color);
                }}
              />
            ))}
            <button
              type="button"
              aria-label="하이라이트 제거"
              title="하이라이트 제거 후 텍스트를 드래그하세요"
              className={removeHighlightMode ? "is-active" : ""}
              onMouseDown={(event) => {
                event.preventDefault();
                rememberSelection();
              }}
              onClick={() => {
                if (window.getSelection()?.toString())
                  removeSelectedHighlight();
                else {
                  setRemoveHighlightMode((active) => !active);
                  setActiveColor(null);
                }
              }}
            >
              <Eraser size={16} />
            </button>
          </div>
          <div className="journal-emoji-tools" aria-label="이모지 추가">
            <span className="text-xs text-muted-foreground">이모지</span>
            {emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={`${emoji} 삽입`}
                title={`${emoji} 삽입`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  rememberSelection();
                }}
                onClick={() => insertEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      <div
        ref={editor}
        className="journal-rich-content"
        contentEditable={!readOnly}
        role="textbox"
        aria-label="내용"
        aria-multiline="true"
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: initialHtml.current }}
        onInput={update}
        onMouseUp={() => {
          rememberSelection();
          if (removeHighlightMode) removeSelectedHighlight();
          else if (activeColor) applyHighlight(activeColor);
        }}
      />
      <input type="hidden" name="content" value={html} readOnly />
    </div>
  );
}

function StudentDetailsDialog({
  student,
  open,
  onOpenChange,
}: {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const details = [
    ["성별", student.gender ?? "미등록"],
    ["학적", student.student_status ?? "미등록"],
    ["학교", student.school || "미등록"],
    ["국어 선택과목", student.korean_subject || "미등록"],
    ["수학 선택과목", student.math_subject || "미등록"],
    ["탐구 1", student.inquiry_subject_1 || "미등록"],
    ["탐구 2", student.inquiry_subject_2 || "미등록"],
  ];
  const counselingRequest =
    student.counseling_requested === false ||
    student.counseling_cycle_weeks === 0
      ? "미희망"
      : "희망";
  const counselingCycle =
    student.counseling_cycle_weeks === 0
      ? "상담 없음"
      : `${student.counseling_cycle_weeks}주`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto p-6 sm:max-w-2xl sm:p-8">
        <DialogHeader className="border-b border-[#e1e7ef] pb-5 text-left">
          <DialogTitle className="text-sm font-bold text-[#426083]">
            학생 상세 정보
          </DialogTitle>
          <DialogDescription className="mt-3 text-2xl font-bold tracking-tight text-[#17283f]">
            {student.building}관 {student.seat_number} {student.name}
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-[#e1e7ef]">
          <section
            aria-labelledby="student-basic-info"
            className="py-5 first:pt-0"
          >
            <h3
              id="student-basic-info"
              className="text-sm font-bold text-[#17283f]"
            >
              기본 정보
            </h3>
            <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {[
                ["성별", student.gender ?? "미등록"],
                ["학적", student.student_status ?? "미등록"],
                ["학교", student.school || "미등록"],
                ["연락처", student.phone || "미등록"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[5.5rem_1fr] gap-3 text-sm"
                >
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 break-words font-medium text-[#17283f]">
                    {label === "연락처" && (
                      <Phone size={14} className="mr-2 inline text-[#426083]" />
                    )}
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="student-academic-info" className="py-5">
            <h3
              id="student-academic-info"
              className="text-sm font-bold text-[#17283f]"
            >
              학업 정보
            </h3>
            <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {details
                .filter(
                  ([label]) =>
                    label !== "성별" && label !== "학적" && label !== "학교",
                )
                .map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[7.5rem_1fr] gap-3 text-sm"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="min-w-0 break-words font-medium text-[#17283f]">
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>
          </section>
          <section aria-labelledby="student-counseling-info" className="py-5">
            <h3
              id="student-counseling-info"
              className="text-sm font-bold text-[#17283f]"
            >
              상담 정보
            </h3>
            <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <div className="grid grid-cols-[7.5rem_1fr] gap-3 text-sm">
                <dt className="text-muted-foreground">상담 희망</dt>
                <dd className="font-medium text-[#17283f]">
                  {counselingRequest}
                </dd>
              </div>
              <div className="grid grid-cols-[7.5rem_1fr] gap-3 text-sm">
                <dt className="text-muted-foreground">상담 주기</dt>
                <dd className="font-medium text-[#17283f]">
                  {counselingCycle}
                </dd>
              </div>
            </dl>
          </section>
          <section
            aria-labelledby="student-note-info"
            className="py-5 last:pb-0"
          >
            <h3
              id="student-note-info"
              className="text-sm font-bold text-[#17283f]"
            >
              특이사항
            </h3>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
              {student.special_notes || "등록된 특이사항이 없습니다."}
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CounselingManagement({
  building,
  teacherView,
  studentId,
  writing,
  journalId,
  onNavigate,
  onDirtyChange,
}: {
  building: string;
  teacherView?: boolean;
  studentId: string | null;
  writing: boolean;
  journalId: string | null;
  onNavigate: (path: string, replace?: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [deleting, setDeleting] = useState<Journal | null>(null);
  const [studentDetailsOpen, setStudentDetailsOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const member = useContext(MemberProfileContext);
  const [students, setStudents] = useState<Student[]>([]);
  const [latest, setLatest] = useState<LatestCounsel[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [allJournals, setAllJournals] = useState<Journal[]>([]);
  const [teachers, setTeachers] = useState<CounselingTeacher[]>([]);
  const [parentMessages, setParentMessages] = useState<LatestParentMessage[]>(
    [],
  );
  const [messageError, setMessageError] = useState("");
  const selectedJournal = journals.find((row) => row.id === journalId);
  const chronological = [...journals].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id),
  );
  const journalIndex = chronological.findIndex((row) => row.id === journalId);
  const previousJournal =
    journalIndex > 0 ? chronological[journalIndex - 1] : undefined;
  const nextJournal =
    journalIndex >= 0 ? chronological[journalIndex + 1] : undefined;
  function navigateJournal(journal: Journal | undefined) {
    if (!journal) return;
    setEditError("");
    onNavigate(`/counseling/students/${studentId}/journals/${journal.id}`);
  }
  const canEditJournal = (journal: Journal) =>
    !supabase ||
    Boolean(
      member?.is_teacher &&
      journal.counselor_id &&
      journal.counselor_id === member.id,
    );
  const readOnly = Boolean(selectedJournal && !canEditJournal(selectedJournal));
  useEffect(() => {
    onDirtyChange(false);
    return () => onDirtyChange(false);
  }, [studentId, journalId, writing, onDirtyChange]);
  function trackChanges(form: HTMLFormElement) {
    if (readOnly) return;
    const changed = Array.from(form.elements).some((element) => {
      if (element instanceof HTMLInputElement) {
        return element.type === "checkbox"
          ? element.checked !== element.defaultChecked
          : element.value !== element.defaultValue;
      }
      return (
        element instanceof HTMLTextAreaElement &&
        element.value !== element.defaultValue
      );
    });
    onDirtyChange(changed);
  }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [seatFilter, setSeatFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const [saveError, setSaveError] = useState("");
  const [editError, setEditError] = useState("");
  const [today, setToday] = useState(localDate());
  useEffect(() => {
    if (building === "1" && seatFilter === "502") setSeatFilter("all");
  }, [building, seatFilter]);
  useEffect(() => {
    const refresh = () => setToday(localDate());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    Promise.all([
      fetchStudents(),
      fetchLatestCounsels(),
      studentId ? fetchJournals(studentId) : Promise.resolve([]),
      teacherView ? fetchAllJournals() : Promise.resolve([]),
      teacherView ? fetchCounselingTeachers() : Promise.resolve([]),
    ])
      .then(([rows, summary, logs, allLogs, teacherRows]) => {
        if (active) {
          setStudents(rows);
          setLatest(summary);
          setJournals(logs);
          setAllJournals(allLogs);
          setTeachers(teacherRows);
        }
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [studentId, reload, teacherView]);

  useEffect(() => {
    if (teacherView && !teacherFilter && member?.id) {
      setTeacherFilter(member.id);
    }
  }, [teacherView, teacherFilter, member?.id]);

  const student = students.find((row) => row.id === studentId);
  useEffect(() => {
    let active = true;
    fetchLatestParentMessages()
      .then((rows) => {
        if (active) {
          setParentMessages(rows);
          setMessageError("");
        }
      })
      .catch((error) => {
        if (active) setMessageError(error.message);
      });
    return () => {
      active = false;
    };
  }, [reload, journals]);
  const messageDates = new Map(
    parentMessages.map((row) => [row.student_id, row.last_sent_date]),
  );
  const latestDates = new Map(
    latest.map((row) => [row.student_id, row.latest_date]),
  );
  const filtered = students
    .filter(
      (row) =>
        (building === "전체" || String(row.building) === building) &&
        (seatFilter === "all" ||
          (seatFilter === "502" && row.seat_number.startsWith("502-")) ||
          (seatFilter === "W" && row.seat_number.startsWith("W")) ||
          (seatFilter === "M" && row.seat_number.startsWith("M"))) &&
        row.name.includes(query.trim()),
    )
    .sort(
      (a, b) =>
        a.building - b.building ||
        a.seat_number.localeCompare(b.seat_number, undefined, {
          numeric: true,
        }),
    );
  const seatFilterOptions = [
    { value: "all", label: "전체 좌석" },
    ...(building === "1" ? [] : [{ value: "502", label: "502호" }]),
    { value: "W", label: "W" },
    { value: "M", label: "M" },
  ];
  const studentNames = new Map(students.map((row) => [row.id, row.name]));
  const teacherJournals = allJournals.filter((row) => {
    const student = students.find((item) => item.id === row.student_id);
    return (
      row.counselor_id === teacherFilter &&
      (!student ||
        building === "전체" ||
        String(student.building) === building) &&
      (studentNames.get(row.student_id) ?? "").includes(query.trim())
    );
  });
  const counselorName = member?.name ?? "홀로서기";
  async function save(form: HTMLFormElement) {
    if (!student || lock.current) return;
    const data = new FormData(form);
    const date = String(data.get("date"));
    const content = String(data.get("content")).trim();
    if (!plainTextFromRichText(content).trim()) {
      setSaveError("상담 내용을 입력해 주세요.");
      return;
    }
    if (!date || date > localDate()) {
      setSaveError("상담 날짜는 오늘 또는 이전 날짜로 입력해 주세요.");
      return;
    }
    lock.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const row = await createJournal(
        {
          student_id: student.id,
          date,
          content,
          special_notes: String(data.get("special_notes")).trim(),
          parent_message_sent: data.get("parent_message_sent") === "on",
        },
        counselorName,
      );
      setJournals((rows) =>
        [row, ...rows].sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.created_at.localeCompare(a.created_at),
        ),
      );
      setLatest((rows) => [
        ...rows.filter((item) => item.student_id !== student.id),
        {
          student_id: student.id,
          journal_count: journals.length + 1,
          latest_date: [latestDates.get(student.id) ?? "", row.date]
            .sort()
            .at(-1)!,
        },
      ]);
      toast.success("상담일지를 저장했습니다.");
      onDirtyChange(false);
      onNavigate("/counseling/students/" + student.id, true);
    } catch {
      setSaveError(
        "저장하지 못했습니다. 연결과 접근 권한을 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  async function removeJournal() {
    if (!deleting || !canEditJournal(deleting) || lock.current) return;
    lock.current = true;
    setSaving(true);
    setDeleteError("");
    try {
      await deleteJournal(deleting.id, counselorName);
      setDeleting(null);
      toast.success("상담일지를 삭제했습니다.");
      onDirtyChange(false);
      onNavigate(`/counseling/students/${studentId}`, true);
      setReload((value) => value + 1);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "삭제하지 못했습니다.",
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  async function editJournal(form: HTMLFormElement) {
    if (!selectedJournal || !canEditJournal(selectedJournal) || lock.current)
      return;
    const data = new FormData(form);
    const date = String(data.get("date"));
    const content = String(data.get("content")).trim();
    const specialNotes = String(data.get("special_notes")).trim();
    if (!plainTextFromRichText(content).trim()) {
      setEditError("상담 내용을 입력해 주세요.");
      return;
    }
    if (!date || date > localDate()) {
      setEditError("상담 날짜는 오늘 또는 이전 날짜로 입력해 주세요.");
      return;
    }
    lock.current = true;
    setSaving(true);
    setEditError("");
    try {
      const row = await updateJournal(
        selectedJournal.id,
        {
          student_id: selectedJournal.student_id,
          date,
          content,
          special_notes: specialNotes,
          parent_message_sent: data.get("parent_message_sent") === "on",
        },
        counselorName,
      );
      setJournals((rows) =>
        rows.map((item) => (item.id === row.id ? row : item)),
      );
      setReload((value) => value + 1);
      onDirtyChange(false);
      onNavigate(`/counseling/students/${studentId}`, true);
      toast.success("상담일지를 수정했습니다.");
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "수정하지 못했습니다.",
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  if (loading)
    return (
      <CounselingSkeleton
        detail={Boolean(studentId)}
        journal={Boolean(writing || journalId)}
      />
    );
  if (loadError)
    return (
      <section className="panel p-7">
        <p role="alert" className="text-sm">
          상담 정보를 불러오지 못했습니다. 연결과 상담일지 테이블 설정을 확인해
          주세요.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setReload((n) => n + 1)}
        >
          다시 불러오기
        </Button>
      </section>
    );
  if (studentId && !student)
    return (
      <section className="panel p-7">
        <p role="status">
          학생을 찾을 수 없습니다. 삭제되었거나 잘못된 주소입니다.
        </p>
      </section>
    );
  if (teacherView && !studentId)
    return (
      <section className="panel page-panel overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <PageHeading as="h2" emoji="👩‍🏫">
              선생님별 상담 리스트
            </PageHeading>
            <p className="mt-1 text-xs text-muted-foreground">
              선생님을 선택하면 해당 선생님이 작성한 상담 기록을 확인할 수
              있습니다.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            선생님
            <select
              aria-label="상담 선생님 선택"
              value={teacherFilter}
              onChange={(event) => setTeacherFilter(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"
            >
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} 선생님
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="px-5 sm:px-6 pb-5 flex flex-wrap items-center justify-between gap-3">
          <Input
            aria-label="학생 이름 검색"
            placeholder="학생 이름 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-64"
          />
          <span className="text-xs text-muted-foreground">
            {teacherJournals.length}건
          </span>
        </div>
        <div className="table-wrap page-table-wrap overflow-y-auto overscroll-contain">
          <table>
            <thead className="sticky top-0 z-10">
              <tr>
                <th>날짜</th>
                <th>학생</th>
                <th>상담자</th>
                <th>상담 내용</th>
              </tr>
            </thead>
            <tbody>
              {teacherJournals.map((row) => {
                const href = `/counseling/students/${row.student_id}/journals/${row.id}`;
                return (
                  <tr
                    key={row.id}
                    className="student-row cursor-pointer"
                    onClick={() => onNavigate(href)}
                  >
                    <td className="whitespace-nowrap">
                      {row.date.replaceAll("-", ".")}
                    </td>
                    <td className="font-semibold">
                      {studentNames.get(row.student_id) ?? "삭제된 학생"}
                    </td>
                    <td>{row.counselor_name}</td>
                    <td className="max-w-[28rem] truncate">
                      {plainTextFromRichText(row.content)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!teacherJournals.length && (
            <p className="p-12 text-center text-sm text-muted-foreground">
              선택한 조건에 맞는 상담 기록이 없습니다.
            </p>
          )}
        </div>
      </section>
    );
  if (!studentId)
    return (
      <section className="panel page-panel overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <PageHeading as="h2" emoji="💬">
              {writing ? "상담일지 작성" : "학생별 상담 리스트"}
            </PageHeading>
            <p className="mt-1 text-xs text-muted-foreground">
              {writing
                ? "상담일지를 작성할 학생을 선택해 주세요."
                : "학생들의 상담 현황을 체크할 수 있습니다."}
            </p>
          </div>
        </div>
        {messageError && (
          <p role="alert" className="px-6 pb-4 text-sm text-destructive">
            {messageError}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-2.5 text-muted-foreground"
              />
              <Input
                aria-label="상담 학생 이름 검색"
                placeholder="학생 이름 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-60 pl-9"
              />
            </div>
            <select
              aria-label="좌석 필터"
              value={seatFilter}
              onChange={(e) => setSeatFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {seatFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div
            className="ml-auto flex flex-wrap items-center gap-4 text-xs text-muted-foreground"
            aria-label="상담 상태 색상 안내"
          >
            <span className="inline-flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full bg-[#e99b45]"
                aria-hidden="true"
              />
              상담 필요
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full bg-[#426083]"
                aria-hidden="true"
              />
              상담 불필요
            </span>
          </div>
        </div>
        <div className="table-wrap page-table-wrap overflow-y-auto overscroll-contain">
          <table>
            <thead className="sticky top-0 z-10">
              <tr>
                <th>좌석번호</th>
                <th>이름</th>
                <th>마지막 상담</th>
                <th>마지막 문자 전송</th>
                <th>상담 주기</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const status = counselingStatus(
                  row,
                  latestDates.get(row.id),
                  today,
                );
                const href = `/counseling/students/${row.id}${writing ? "/new" : ""}`;
                return (
                  <tr
                    key={row.id}
                    className={`counseling-row cursor-pointer transition-colors ${status.needed ? "counseling-needed" : "counseling-current"}`}
                    onClick={() => onNavigate(href)}
                  >
                    <td>
                      {building === "전체"
                        ? `${row.building}관 ${row.seat_number}`
                        : row.seat_number}
                    </td>
                    <td>
                      <a
                        href={href}
                        className="font-bold inline-flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            !e.ctrlKey &&
                            !e.metaKey &&
                            !e.shiftKey &&
                            !e.altKey
                          ) {
                            e.preventDefault();
                            onNavigate(href);
                          }
                        }}
                      >
                        {row.name}
                        <span className="ml-2 text-sm font-semibold tabular-nums text-[#426083]">
                          {latest.find((item) => item.student_id === row.id)
                            ?.journal_count ?? 0}
                          건
                        </span>
                      </a>
                    </td>
                    <td className="whitespace-nowrap">
                      {latestDates.get(row.id)?.replaceAll("-", ".") ?? "—"}
                    </td>
                    <td className="whitespace-nowrap">
                      {messageError
                        ? "확인 불가"
                        : (messageDates.get(row.id)?.replaceAll("-", ".") ??
                          "—")}
                    </td>
                    <td>
                      <span
                        className="whitespace-nowrap font-semibold"
                        title={status.detail}
                        aria-label={`${row.counseling_cycle_weeks === 0 ? "상담 없음" : `${row.counseling_cycle_weeks}주`} · ${status.needed ? "상담 필요" : "상담 불필요"}`}
                      >
                        {row.counseling_cycle_weeks === 0
                          ? "상담 없음"
                          : `${row.counseling_cycle_weeks}주`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-12 text-center text-sm text-muted-foreground">
              {students.length
                ? "검색 조건에 맞는 학생이 없습니다."
                : "학생관리에서 학생을 먼저 등록해 주세요."}
            </p>
          )}
        </div>
      </section>
    );
  if (journalId && !selectedJournal)
    return (
      <section className="panel p-7">
        <p role="status">
          상담일지를 찾을 수 없습니다. 삭제되었거나 잘못된 주소입니다.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => onNavigate("/counseling/students/" + studentId)}
        >
          상담일지 목록으로
        </Button>
      </section>
    );
  if ((writing || selectedJournal) && student)
    return (
      <>
        <StudentDetailsDialog
          student={student}
          open={studentDetailsOpen}
          onOpenChange={setStudentDetailsOpen}
        />
        <form
          aria-label={
            readOnly
              ? "상담일지 읽기"
              : selectedJournal
                ? "상담일지 수정"
                : "상담일지 작성"
          }
          key={selectedJournal?.id ?? student.id}
          className="panel overflow-hidden"
          onChange={(event) => trackChanges(event.currentTarget)}
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedJournal) void editJournal(e.currentTarget);
            else void save(e.currentTarget);
          }}
        >
          <div className="border-b p-5 sm:p-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <PageHeading as="h2" emoji="📝">
                {selectedJournal ? "상담일지" : "상담일지 작성"}
              </PageHeading>
              {readOnly && (
                <p className="subtext mt-2">
                  읽기 전용 · 작성한 선생님만 수정·삭제할 수 있습니다.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setStudentDetailsOpen(true)}
              >
                <Eye size={16} />
                학생정보
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => onNavigate(`/counseling/students/${student.id}`)}
              >
                목록으로
              </Button>
              {!readOnly && (
                <Button type="submit" disabled={saving}>
                  <Save size={16} />
                  {saving ? "저장 중…" : "저장하기"}
                </Button>
              )}
            </div>
          </div>
          <fieldset disabled={saving} className="p-5 sm:p-7 grid gap-7">
            <label className="inline-flex items-center gap-2 text-sm w-fit">
              <input
                type="checkbox"
                name="parent_message_sent"
                defaultChecked={selectedJournal?.parent_message_sent ?? false}
                disabled={readOnly}
                className="h-4 w-4 accent-[#426083]"
              />
              부모님 문자 전송 완료
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <label className="field">
                좌석
                <Input value={student.seat_number} readOnly />
              </label>
              <label className="field">
                이름
                <Input value={student.name} readOnly />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <label className="field">
                날짜
                <input
                  name="date"
                  readOnly={readOnly}
                  type="date"
                  required
                  defaultValue={selectedJournal?.date ?? today}
                  max={today}
                />
              </label>
              <label className="field">
                상담자
                <input
                  value={selectedJournal?.counselor_name ?? counselorName}
                  readOnly
                  className="text-muted-foreground"
                />
              </label>
            </div>
            <div className="field">
              <span className="font-bold">내용</span>
              <RichJournalEditor
                key={selectedJournal?.id ?? `new-${student.id}`}
                value={selectedJournal?.content ?? ""}
                readOnly={readOnly}
                onDirty={() => onDirtyChange(true)}
              />
            </div>
            <label className="field">
              <span className="font-bold">
                특이사항{" "}
                <span className="font-normal text-muted-foreground">
                  (선택)
                </span>
              </span>
              <textarea
                name="special_notes"
                readOnly={readOnly}
                defaultValue={selectedJournal?.special_notes ?? ""}
                aria-label="특이사항"
                maxLength={5000}
                rows={6}
                spellCheck={false}
                autoCorrect="off"
                className="journal-textarea resize-y leading-8"
                placeholder="다음 상담에서 확인할 사항이나 특별히 살펴볼 점을 적어 주세요."
              />
            </label>
          </fieldset>
          {(selectedJournal ? editError : saveError) && (
            <p
              role="alert"
              className="px-5 sm:px-7 pb-4 text-sm text-destructive"
            >
              {selectedJournal ? editError : saveError}
            </p>
          )}
          <div className="border-t bg-[#f8f9fc] p-5 sm:px-7 flex justify-end gap-2">
            {selectedJournal && !readOnly && (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto"
                disabled={saving}
                onClick={() => {
                  setDeleteError("");
                  setDeleting(selectedJournal);
                }}
              >
                삭제
              </Button>
            )}
            {selectedJournal ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving || !previousJournal}
                  onClick={() => navigateJournal(previousJournal)}
                >
                  이전으로
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() =>
                    onNavigate(`/counseling/students/${student.id}`)
                  }
                >
                  목록으로
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving || !nextJournal}
                  onClick={() => navigateJournal(nextJournal)}
                >
                  다음으로
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => onNavigate(`/counseling/students/${student.id}`)}
              >
                목록으로
              </Button>
            )}
            {!readOnly && (
              <Button type="submit" disabled={saving}>
                <Save size={16} />
                {saving ? "저장 중…" : "저장하기"}
              </Button>
            )}
          </div>
        </form>
        <AlertDialog
          open={Boolean(deleting)}
          onOpenChange={(value) => {
            if (!value && !lock.current) setDeleting(null);
          }}
        >
          <AlertDialogContent
            onEscapeKeyDown={(event) => {
              if (saving) event.preventDefault();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>상담일지를 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleting?.date} 상담일지가 삭제됩니다. 삭제 후 복구할 수 없으며
                활동 로그는 유지됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError && (
              <p role="alert" className="text-sm text-destructive">
                {deleteError}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>취소</AlertDialogCancel>
              <AlertDialogAction
                disabled={saving}
                onClick={(event) => {
                  event.preventDefault();
                  void removeJournal();
                }}
              >
                {saving ? "삭제 중…" : "삭제"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  return (
    <>
      <StudentDetailsDialog
        student={student!}
        open={studentDetailsOpen}
        onOpenChange={setStudentDetailsOpen}
      />
      <section className="panel page-panel overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-wrap gap-3 justify-between items-center">
          <div className="flex min-w-0 items-center gap-3">
            <PageHeading as="h2" emoji="📚">
              {student!.seat_number} {student!.name}
            </PageHeading>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-normal text-muted-foreground">
              {journals.length}건
            </span>
            <Button
              variant="outline"
              onClick={() => setStudentDetailsOpen(true)}
            >
              <Eye size={16} />
              학생정보
            </Button>
            <Button
              onClick={() => {
                setSaveError("");
                onNavigate("/counseling/students/" + studentId + "/new");
              }}
            >
              <Plus size={16} />
              상담일지 작성
            </Button>
          </div>
        </div>
        <div
          className="table-wrap page-table-wrap overflow-y-auto overscroll-contain"
          role="region"
          aria-label="상담내역 목록"
          tabIndex={0}
        >
          <table className="journal-table">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th>날짜</th>
                <th>상담자</th>
              </tr>
            </thead>
            <tbody>
              {journals.map((row) => {
                const href =
                  "/counseling/students/" + studentId + "/journals/" + row.id;
                return (
                  <tr
                    key={row.id}
                    className="student-row cursor-pointer transition-colors"
                    onClick={() => {
                      setEditError("");
                      onNavigate(href);
                    }}
                  >
                    <td>
                      <a
                        href={href}
                        className="block font-semibold"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (
                            !event.ctrlKey &&
                            !event.metaKey &&
                            !event.shiftKey &&
                            !event.altKey
                          ) {
                            event.preventDefault();
                            setEditError("");
                            onNavigate(href);
                          }
                        }}
                      >
                        {row.date.replaceAll("-", ".")}
                      </a>
                    </td>
                    <td>{row.counselor_name}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {journals.length === 0 && (
            <div className="py-14 px-5 text-center">
              <BookOpen size={28} className="mx-auto text-[#9aaabe] mb-4" />
              <p className="font-bold text-sm">첫 상담 이야기를 남겨 주세요.</p>
              <p className="subtext mt-2">
                작성한 일지가 이 학생의 상담 기록으로 차곡차곡 모입니다.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
