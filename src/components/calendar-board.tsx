import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  SmilePlus,
  Trash2,
} from "lucide-react";
import { MemberProfileContext } from "./auth-gate";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PageHeading } from "./ui/page-heading";
import { IconTooltip } from "./ui/icon-tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { localDate } from "@/data";
import { koreanHolidayName } from "@/lib/korean-holidays";
import {
  addCalendarTodo,
  calendarWeekdays as weekdays,
  deleteCalendarTodo,
  fetchCalendarMemos,
  fetchCalendarTodos,
  formatCalendarDayTitle as formatDayTitle,
  saveCalendarMemo,
  updateCalendarTodo,
  type CalendarDailyMemo,
  type CalendarTodo,
} from "@/lib/calendar";

const memoEmojis = [
  "😊",
  "👍",
  "⭐",
  "📌",
  "✅",
  "💡",
  "📞",
  "📚",
  "🎯",
  "❤️",
  "🌱",
  "✨",
];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function CalendarBoard({
  selectedDate,
  onOpenDate,
}: {
  selectedDate: string | null;
  onOpenDate: (date: string) => void;
}) {
  const member = useContext(MemberProfileContext);
  const ownerId = member?.id ?? "demo";
  return (
    <CalendarWorkspace
      key={ownerId}
      ownerId={ownerId}
      selectedDate={selectedDate}
      onOpenDate={onOpenDate}
    />
  );
}

function CalendarWorkspace({
  ownerId,
  selectedDate,
  onOpenDate,
}: {
  ownerId: string;
  selectedDate: string | null;
  onOpenDate: (date: string) => void;
}) {
  const today = localDate();
  const activeDate = selectedDate ?? today;
  const [month, setMonth] = useState(() =>
    startOfMonth(new Date(`${activeDate}T00:00:00`)),
  );
  const [todos, setTodos] = useState<CalendarTodo[]>([]);
  const [memos, setMemos] = useState<CalendarDailyMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draftTodo, setDraftTodo] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [memoContent, setMemoContent] = useState("");
  const [memoSaved, setMemoSaved] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const memoLock = useRef(false);
  const memoTextarea = useRef<HTMLTextAreaElement>(null);
  const emojiTrigger = useRef<HTMLButtonElement>(null);
  const emojiMenu = useRef<HTMLDivElement>(null);
  const memoSelection = useRef({ start: 0, end: 0 });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    Promise.all([fetchCalendarTodos(ownerId), fetchCalendarMemos(ownerId)])
      .then(([todoRows, memoRows]) => {
        if (!active) return;
        setTodos(todoRows);
        setMemos(memoRows);
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
  }, [ownerId, retry]);

  useEffect(() => {
    if (loading) return;
    const value = memos.find((m) => m.memo_date === activeDate)?.content ?? "";
    setMemoContent(value);
    setMemoSaved(value);
  }, [activeDate, loading]);

  useEffect(() => {
    if (memoContent === memoSaved || loading || loadError) return;
    const timer = window.setTimeout(() => void saveMemo(), 600);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoContent, memoSaved, loading, loadError, activeDate]);

  useEffect(() => {
    if (!emojiOpen) return;
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !emojiMenu.current?.contains(target) &&
        !emojiTrigger.current?.contains(target)
      ) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [emojiOpen]);

  async function saveMemo() {
    if (memoLock.current || memoContent === memoSaved) return;
    memoLock.current = true;
    setMemoSaving(true);
    const date = activeDate;
    const snapshot = memoContent;
    try {
      const row = await saveCalendarMemo(ownerId, date, snapshot);
      setMemos((current) => [
        ...current.filter((m) => m.memo_date !== date),
        row,
      ]);
      setMemoSaved(snapshot);
    } catch {
      setError("메모를 저장하지 못했습니다. 연결을 확인해 주세요.");
    } finally {
      memoLock.current = false;
      setMemoSaving(false);
    }
  }

  const todosByDate = useMemo(() => {
    const map = new Map<string, CalendarTodo[]>();
    for (const todo of todos) {
      const list = map.get(todo.todo_date) ?? [];
      list.push(todo);
      map.set(todo.todo_date, list);
    }
    return map;
  }, [todos]);

  const weeks = useMemo(() => {
    const firstWeekday = month.getDay();
    const daysInMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();
    const cells: (string | null)[] = [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from(
        { length: daysInMonth },
        (_, i) =>
          `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
      ),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const result: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7)
      result.push(cells.slice(i, i + 7));
    return result;
  }, [month]);

  async function mutate(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch {
      setError("저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  function openDay(date: string) {
    setError("");
    setEditingId(null);
    setEmojiOpen(false);
    onOpenDate(date);
    setMonth(startOfMonth(new Date(`${date}T00:00:00`)));
  }

  function submitTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftTodo.trim()) return;
    void mutate(async () => {
      const row = await addCalendarTodo(ownerId, {
        todo_date: activeDate,
        content: draftTodo,
      });
      setTodos((current) => [...current, row]);
      setDraftTodo("");
      setAddOpen(false);
    });
  }

  function insertMemoEmoji(emoji: string) {
    const start =
      memoTextarea.current?.selectionStart ?? memoSelection.current.start;
    const end = memoTextarea.current?.selectionEnd ?? memoSelection.current.end;
    const next = memoContent.slice(0, start) + emoji + memoContent.slice(end);
    if (next.length > 5000) return;
    setMemoContent(next);
    const caret = start + emoji.length;
    requestAnimationFrame(() => {
      const node = memoTextarea.current;
      if (!node) return;
      const scrollTop = node.scrollTop;
      node.focus({ preventScroll: true });
      node.setSelectionRange(caret, caret);
      node.scrollTop = scrollTop;
    });
  }

  function submitEdit(id: string) {
    const content = editDraft.trim();
    if (!content) return;
    void mutate(async () => {
      const row = await updateCalendarTodo(ownerId, id, { content });
      setTodos((current) => current.map((t) => (t.id === id ? row : t)));
      setEditingId(null);
    });
  }

  const dayTodos = (todosByDate.get(activeDate) ?? [])
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const doneCount = dayTodos.filter((t) => t.done).length;
  const holidayName = koreanHolidayName(activeDate);

  return (
    <section className="panel p-5 sm:p-6" aria-label="캘린더">
      <PageHeading emoji="📅">캘린더</PageHeading>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {loading ? (
        <p
          role="status"
          className="py-10 text-center text-sm text-muted-foreground"
        >
          캘린더를 불러오는 중…
        </p>
      ) : loadError ? (
        <div role="alert" className="py-6 text-center space-y-3">
          <p className="text-sm">캘린더 정보를 불러오지 못했습니다.</p>
          <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
            다시 불러오기
          </Button>
        </div>
      ) : (
        <div className="calendar-layout">
          <div className="calendar-left">
            <div className="mt-1 flex items-center justify-between">
              <button
                type="button"
                aria-label="이전 달"
                className="rounded-md p-1.5 hover:bg-[#edf1f6]"
                onClick={() =>
                  setMonth(
                    (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronLeft size={17} />
              </button>
              <h3 className="text-sm font-semibold text-[#17283f]">
                {month.getFullYear()}년 {month.getMonth() + 1}월
              </h3>
              <button
                type="button"
                aria-label="다음 달"
                className="rounded-md p-1.5 hover:bg-[#edf1f6]"
                onClick={() =>
                  setMonth(
                    (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronRight size={17} />
              </button>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-[#e1e7ef]">
              <div className="grid grid-cols-7 bg-[#f7f9fc] text-center text-xs font-medium text-muted-foreground">
                {weekdays.map((day) => (
                  <div key={day} className="border-b border-[#e1e7ef] py-2">
                    {day}
                  </div>
                ))}
              </div>
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7">
                  {week.map((date, dayIndex) => {
                    if (!date) {
                      return (
                        <div
                          key={dayIndex}
                          className="calendar-cell calendar-cell-empty"
                        />
                      );
                    }
                    const dayNumber = Number(date.slice(-2));
                    const items = todosByDate.get(date) ?? [];
                    const remaining = items.filter((i) => !i.done).length;
                    const isToday = date === today;
                    const isSelected = date === activeDate;
                    const holiday = koreanHolidayName(date);
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => openDay(date)}
                        aria-label={`${date} 할 일 ${items.length}건`}
                        aria-pressed={isSelected}
                        className={`calendar-cell ${isSelected ? "calendar-cell-selected" : ""} ${holiday ? "calendar-cell-holiday" : ""}`}
                      >
                        <span
                          className={`calendar-cell-day ${isToday ? "calendar-cell-today" : ""} ${holiday && !isToday ? "text-[#c0392b]" : ""}`}
                        >
                          {dayNumber}
                        </span>
                        {holiday && (
                          <span className="calendar-cell-holiday-name">
                            {holiday}
                          </span>
                        )}
                        {remaining > 0 && (
                          <span className="calendar-cell-todo-count">
                            할 일 : {remaining}개
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="calendar-right" role="region" aria-label="일정 상세">
            <div className="calendar-day-header">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-bold text-[#17283f]">
                  {formatDayTitle(activeDate)}
                </p>
                {holidayName && (
                  <span className="calendar-holiday-tag">{holidayName}</span>
                )}
              </div>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setAddOpen(true)}
              >
                <Plus size={15} />할 일 추가
              </Button>
            </div>

            <div className="calendar-todo-section">
              <div className="calendar-section-title">
                <span>할 일</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {doneCount}/{dayTodos.length} 완료
                </span>
              </div>
              {dayTodos.length ? (
                <ul className="calendar-todo-list">
                  {dayTodos.map((todo) => (
                    <li
                      key={todo.id}
                      className={`calendar-todo-item ${todo.done ? "calendar-todo-item-done" : ""}`}
                    >
                      <button
                        type="button"
                        aria-label={todo.done ? "완료 취소" : "완료 처리"}
                        aria-pressed={todo.done}
                        disabled={busy}
                        className="calendar-todo-check"
                        onClick={() =>
                          void mutate(async () => {
                            const row = await updateCalendarTodo(
                              ownerId,
                              todo.id,
                              { done: !todo.done },
                            );
                            setTodos((current) =>
                              current.map((t) => (t.id === row.id ? row : t)),
                            );
                          })
                        }
                      >
                        {todo.done && <Check size={13} />}
                      </button>
                      {editingId === todo.id ? (
                        <Input
                          autoFocus
                          aria-label="할 일 수정"
                          maxLength={300}
                          value={editDraft}
                          disabled={busy}
                          onChange={(event) => setEditDraft(event.target.value)}
                          onBlur={() => submitEdit(todo.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              submitEdit(todo.id);
                            }
                            if (event.key === "Escape") setEditingId(null);
                          }}
                          className="h-8 flex-1"
                        />
                      ) : (
                        <span className="calendar-todo-text">
                          {todo.content}
                        </span>
                      )}
                      <div className="calendar-todo-actions">
                        <button
                          type="button"
                          aria-label={`${todo.content} 수정`}
                          disabled={busy}
                          onClick={() => {
                            setEditingId(todo.id);
                            setEditDraft(todo.content);
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          aria-label={`${todo.content} 삭제`}
                          disabled={busy}
                          onClick={() =>
                            void mutate(async () => {
                              await deleteCalendarTodo(ownerId, todo.id);
                              setTodos((current) =>
                                current.filter((t) => t.id !== todo.id),
                              );
                            })
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="calendar-todo-empty">등록된 할 일이 없습니다.</p>
              )}
            </div>

            <div className="calendar-memo-section">
              <div className="calendar-section-title">
                <span>메모</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-normal text-muted-foreground">
                    {memoSaving ? "저장 중…" : ""}
                  </span>
                  <div className="relative">
                    <IconTooltip label="이모지 추가">
                      <button
                        ref={emojiTrigger}
                        type="button"
                        className="memo-tool-button"
                        aria-label="이모지 추가"
                        aria-expanded={emojiOpen}
                        onClick={() => setEmojiOpen((value) => !value)}
                      >
                        <SmilePlus size={16} />
                      </button>
                    </IconTooltip>
                    {emojiOpen && (
                      <div
                        ref={emojiMenu}
                        className="memo-emoji-menu"
                        role="menu"
                        aria-label="이모지 선택"
                      >
                        {memoEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            role="menuitem"
                            aria-label={`${emoji} 삽입`}
                            onClick={() => {
                              insertMemoEmoji(emoji);
                              setEmojiOpen(false);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <textarea
                ref={memoTextarea}
                aria-label="날짜별 메모"
                placeholder="이 날의 메모를 입력하세요"
                maxLength={5000}
                value={memoContent}
                onSelect={(event) => {
                  memoSelection.current = {
                    start: event.currentTarget.selectionStart,
                    end: event.currentTarget.selectionEnd,
                  };
                }}
                onChange={(event) => setMemoContent(event.target.value)}
                className="calendar-memo-textarea calendar-memo-textarea-tall"
              />
            </div>
          </div>
        </div>
      )}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm gap-0 overflow-hidden border-[#dce3ed] p-0">
          <DialogHeader className="border-b border-[#e5eaf1] bg-[#f7f9fc] px-6 py-5">
            <DialogTitle>할 일 추가</DialogTitle>
            <DialogDescription>{formatDayTitle(activeDate)}</DialogDescription>
          </DialogHeader>
          <form className="px-6 py-5" onSubmit={submitTodo}>
            <Input
              autoFocus
              aria-label="할 일 내용"
              placeholder="할 일을 입력하세요"
              maxLength={300}
              value={draftTodo}
              disabled={busy}
              onChange={(event) => setDraftTodo(event.target.value)}
              className="bg-white"
            />
            <DialogFooter className="mt-5">
              <Button
                type="submit"
                disabled={!draftTodo.trim() || busy}
                className="flex-1 gap-1.5"
              >
                <Plus size={16} />
                추가
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                취소
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
