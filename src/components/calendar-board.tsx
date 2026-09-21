import {
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { MemberProfileContext } from "./auth-gate";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { PageHeading } from "./ui/page-heading";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { localDate } from "@/data";
import { koreanHolidayName } from "@/lib/korean-holidays";
import {
  addCalendarEvent,
  calendarEventTypeMap,
  calendarEventTypes,
  deleteCalendarEvent,
  fetchCalendarEvents,
  updateCalendarEvent,
  type CalendarEvent,
  type CalendarEventType,
} from "@/lib/calendar-events";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatDayTitle(date: string) {
  const [, month, day] = date.split("-").map(Number);
  const weekday = weekdays[new Date(`${date}T00:00:00`).getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

function ScheduleDialog({
  open,
  editingId,
  draftDate,
  draftType,
  draftTitle,
  draftMemo,
  busy,
  onOpenChange,
  onDateChange,
  onTypeChange,
  onTitleChange,
  onMemoChange,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  editingId: string | null;
  draftDate: string;
  draftType: CalendarEventType;
  draftTitle: string;
  draftMemo: string;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onDateChange: (date: string) => void;
  onTypeChange: (type: CalendarEventType) => void;
  onTitleChange: (title: string) => void;
  onMemoChange: (memo: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden border-[#dce3ed] p-0">
        <DialogHeader className="border-b border-[#e5eaf1] bg-[#f7f9fc] px-6 py-5">
          <DialogTitle>{editingId ? "일정 수정" : "새 일정 추가"}</DialogTitle>
          <DialogDescription>{formatDayTitle(draftDate)}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4 px-6 py-5" onSubmit={onSubmit}>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              날짜
            </p>
            <Input
              aria-label="일정 날짜"
              type="date"
              value={draftDate}
              disabled={busy}
              onChange={(event) => onDateChange(event.target.value)}
              className="mt-1.5 bg-white"
            />
          </div>
          <div
            className="flex flex-wrap gap-1.5"
            role="radiogroup"
            aria-label="일정 유형"
          >
            {calendarEventTypes.map((item) => (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={draftType === item.value}
                onClick={() => onTypeChange(item.value)}
                className="inline-flex items-center rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor:
                    draftType === item.value ? item.color : "#e1e7ef",
                  backgroundColor:
                    draftType === item.value ? item.background : "white",
                  color: item.color,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Input
            aria-label="일정 제목"
            placeholder="제목"
            maxLength={200}
            value={draftTitle}
            disabled={busy}
            onChange={(event) => onTitleChange(event.target.value)}
            className="mt-1.5 bg-white"
          />
          <div className="border-t border-[#e5eaf1] pt-4">
            <textarea
              aria-label="본문 내용"
              placeholder="본문 내용을 입력하세요 (선택)"
              maxLength={1000}
              value={draftMemo}
              disabled={busy}
              onChange={(event) => onMemoChange(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-sm border border-input bg-white px-3 py-2 text-sm font-normal text-[#17283f] shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <DialogFooter className="border-t border-[#e5eaf1] pt-4">
            <Button
              type="submit"
              disabled={!draftTitle.trim() || busy}
              className="flex-1 gap-1.5"
            >
              <Plus size={16} />
              {editingId ? "수정 완료" : "추가"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              취소
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CalendarBoard({
  selectedDate,
  onOpenDate,
  onCloseDate,
}: {
  selectedDate: string | null;
  onOpenDate: (date: string) => void;
  onCloseDate: () => void;
}) {
  const member = useContext(MemberProfileContext);
  const ownerId = member?.id ?? "demo";
  return (
    <CalendarWorkspace
      key={ownerId}
      ownerId={ownerId}
      selectedDate={selectedDate}
      onOpenDate={onOpenDate}
      onCloseDate={onCloseDate}
    />
  );
}

function CalendarWorkspace({
  ownerId,
  selectedDate,
  onOpenDate,
  onCloseDate,
}: {
  ownerId: string;
  selectedDate: string | null;
  onOpenDate: (date: string) => void;
  onCloseDate: () => void;
}) {
  const today = localDate();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftDate, setDraftDate] = useState(today);
  const [typeFilter, setTypeFilter] = useState<CalendarEventType | "all">(
    "all",
  );
  const [draftType, setDraftType] = useState<CalendarEventType>("schedule");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMemo, setDraftMemo] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    fetchCalendarEvents(ownerId)
      .then((rows) => {
        if (active) setEvents(rows);
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

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.event_date) ?? [];
      list.push(event);
      map.set(event.event_date, list);
    }
    return map;
  }, [events]);

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

  function resetForm() {
    setFormOpen(false);
    setEditingId(null);
    setDraftDate(today);
    setDraftType("schedule");
    setDraftTitle("");
    setDraftMemo("");
  }

  function openDay(date: string) {
    resetForm();
    setError("");
    setTypeFilter("all");
    onOpenDate(date);
  }

  function startAdd() {
    setEditingId(null);
    setDraftDate(selectedDate ?? today);
    setDraftType("schedule");
    setDraftTitle("");
    setDraftMemo("");
    setFormOpen(true);
  }

  function openAdd(date: string, navigate = false) {
    setError("");
    setTypeFilter("all");
    setEditingId(null);
    setDraftDate(date);
    setDraftType("schedule");
    setDraftTitle("");
    setDraftMemo("");
    setFormOpen(true);
    if (navigate) onOpenDate(date);
  }

  function startEdit(event: CalendarEvent) {
    setEditingId(event.id);
    setDraftType(event.type);
    setDraftTitle(event.title);
    setDraftMemo(event.memo ?? "");
    setFormOpen(true);
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftTitle.trim()) return;
    void mutate(async () => {
      if (editingId) {
        const row = await updateCalendarEvent(ownerId, editingId, {
          event_date: draftDate,
          type: draftType,
          title: draftTitle,
          memo: draftMemo,
        });
        setEvents((current) =>
          current.map((item) => (item.id === row.id ? row : item)),
        );
      } else {
        const row = await addCalendarEvent(ownerId, {
          event_date: draftDate,
          type: draftType,
          title: draftTitle,
          memo: draftMemo,
        });
        setEvents((current) => [...current, row]);
      }
      if (draftDate !== selectedDate) onOpenDate(draftDate);
      resetForm();
    });
  }

  const allDayEvents = selectedDate
    ? (eventsByDate.get(selectedDate) ?? [])
    : [];
  const dayEvents =
    typeFilter === "all"
      ? allDayEvents
      : allDayEvents.filter((event) => event.type === typeFilter);
  const holidayName = selectedDate
    ? koreanHolidayName(selectedDate)
    : undefined;

  if (selectedDate) {
    return (
      <section className="panel p-4 sm:p-5" aria-label="일정 상세">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e8edf3] pb-4">
          <div>
            <PageHeading
              as="h2"
              emoji="📌"
              className="gap-2 text-lg sm:text-xl"
            >
              일정 상세보기
            </PageHeading>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold text-[#17283f] sm:text-xl">
                {formatDayTitle(selectedDate)}
              </p>
              {holidayName && (
                <span className="rounded-sm bg-[#fdecec] px-2 py-1 text-xs font-medium text-[#c0392b]">
                  {holidayName}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-1.5" onClick={onCloseDate}>
              <ChevronLeft size={16} />
              캘린더로
            </Button>
            <Button className="gap-1.5" onClick={startAdd}>
              <Plus size={16} />
              일정 추가
            </Button>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#e8edf3] pb-3">
          <div
            className="flex flex-wrap items-center gap-1"
            role="group"
            aria-label="일정 유형 필터"
          >
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              유형
            </span>
            <button
              type="button"
              aria-pressed={typeFilter === "all"}
              onClick={() => setTypeFilter("all")}
              className={`rounded-sm px-2 py-1 text-xs transition-colors ${typeFilter === "all" ? "bg-[#eef1f5] font-semibold text-[#17283f]" : "text-muted-foreground hover:bg-[#f7f9fc]"}`}
            >
              전체
            </button>
            {calendarEventTypes.map((item) => {
              const active = typeFilter === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTypeFilter(item.value)}
                  className="rounded-sm px-2 py-1 text-xs font-medium transition-colors"
                  style={{
                    color: item.color,
                    backgroundColor: active ? item.background : "transparent",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <span className="text-xs text-muted-foreground">
            {dayEvents.length}개 일정
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {dayEvents.length ? (
            dayEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 rounded-sm border border-[#e5eaf1] px-3 py-2.5"
                style={{
                  backgroundColor: calendarEventTypeMap[event.type].background,
                }}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[11px] font-semibold"
                    style={{ color: calendarEventTypeMap[event.type].color }}
                  >
                    {calendarEventTypeMap[event.type].label}
                  </p>
                  <p className="wrap-break-word text-sm font-semibold text-[#17283f]">
                    {event.title}
                  </p>
                  {event.memo && (
                    <>
                      <div className="my-2 border-t border-black/10" />
                      <p className="whitespace-pre-wrap wrap-break-word text-xs leading-5 text-[#3f5067]">
                        {event.memo}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`${event.title} 수정`}
                    disabled={busy}
                    onClick={() => startEdit(event)}
                  >
                    <Pencil size={15} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    aria-label={`${event.title} 삭제`}
                    disabled={busy}
                    onClick={() =>
                      void mutate(async () => {
                        await deleteCalendarEvent(ownerId, event.id);
                        setEvents((current) =>
                          current.filter((row) => row.id !== event.id),
                        );
                        if (editingId === event.id) resetForm();
                      })
                    }
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full rounded-sm border border-dashed border-[#e1e7ef] px-4 py-8 text-center text-sm text-muted-foreground">
              {allDayEvents.length
                ? "선택한 유형의 일정이 없습니다."
                : "등록된 일정이 없습니다."}
            </p>
          )}
        </div>
        <ScheduleDialog
          open={formOpen}
          editingId={editingId}
          draftDate={draftDate}
          draftType={draftType}
          draftTitle={draftTitle}
          draftMemo={draftMemo}
          busy={busy}
          onOpenChange={(open) => (open ? setFormOpen(true) : resetForm())}
          onDateChange={setDraftDate}
          onTypeChange={setDraftType}
          onTitleChange={setDraftTitle}
          onMemoChange={setDraftMemo}
          onSubmit={submitForm}
          onCancel={resetForm}
        />
      </section>
    );
  }

  return (
    <section className="panel p-5 sm:p-6" aria-label="캘린더">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeading emoji="📅">캘린더</PageHeading>
        <Button className="gap-1.5" onClick={() => openAdd(today)}>
          <Plus size={16} />
          일정 추가
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {calendarEventTypes.map((item) => (
          <span key={item.value} className="inline-flex items-center gap-1">
            <span style={{ color: item.color }}>{item.label}</span>
          </span>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          aria-label="이전 달"
          className="rounded-md p-1.5 hover:bg-[#edf1f6]"
          onClick={() =>
            setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
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
            setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
          }
        >
          <ChevronRight size={17} />
        </button>
      </div>
      {loading ? (
        <p
          role="status"
          className="py-10 text-center text-sm text-muted-foreground"
        >
          캘린더를 불러오는 중…
        </p>
      ) : loadError ? (
        <div role="alert" className="py-6 text-center space-y-3">
          <p className="text-sm">일정을 불러오지 못했습니다.</p>
          <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
            다시 불러오기
          </Button>
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-[#e1e7ef]">
          <div className="grid grid-cols-7 bg-[#f7f9fc] text-center text-xs font-medium text-muted-foreground">
            {weekdays.map((day) => (
              <div key={day} className="border-b border-[#e1e7ef] py-2">
                {day}
              </div>
            ))}
          </div>
          <TooltipProvider delayDuration={350}>
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7">
                {week.map((date, dayIndex) => {
                  if (!date) {
                    return (
                      <div
                        key={dayIndex}
                        className="h-20 border-b border-l border-[#e1e7ef] bg-[#fbfcfe] first:border-l-0 sm:h-24"
                      />
                    );
                  }
                  const dayNumber = Number(date.slice(-2));
                  const dayItems = eventsByDate.get(date) ?? [];
                  const isToday = date === today;
                  const holiday = koreanHolidayName(date);
                  return (
                    <Tooltip key={date}>
                      <TooltipTrigger asChild>
                        <div
                          onClick={() => openDay(date)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openDay(date);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`${date} 일정 보기, ${dayItems.length}건`}
                          className={`group relative flex h-20 flex-col items-start gap-0.5 border-b border-l border-[#e1e7ef] p-1 text-left first:border-l-0 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#426083] sm:h-24 sm:p-1.5 ${holiday ? "bg-[#fdecec]" : "bg-white"}`}
                        >
                          <span className="flex min-w-0 max-w-full items-center gap-1 pr-5">
                            <span
                              className={`text-xs font-medium ${isToday ? "flex size-6 items-center justify-center rounded-full border-2 border-[#17283f] text-[#17283f]" : holiday ? "text-[#c0392b]" : "text-[#17283f]"}`}
                            >
                              {dayNumber}
                            </span>
                            {holiday && (
                              <span className="truncate text-[9px] font-medium text-[#c0392b]">
                                {holiday}
                              </span>
                            )}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                aria-label={`${date} 일정 추가`}
                                className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-sm text-[#62738a] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-white hover:text-[#17283f]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openAdd(date);
                                }}
                              >
                                <Plus size={13} aria-hidden="true" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              해당 날짜에 일정 추가하기
                            </TooltipContent>
                          </Tooltip>
                          <span className="min-h-0 w-full flex-1 space-y-0.5 overflow-y-auto pr-0.5">
                            {dayItems.map((item) => (
                              <span
                                key={item.id}
                                title={item.title}
                                className="flex min-w-0 items-center px-1 py-0.5 text-[10px] leading-tight"
                                style={{
                                  color: calendarEventTypeMap[item.type].color,
                                  backgroundColor:
                                    calendarEventTypeMap[item.type].background,
                                }}
                              >
                                <span className="min-w-0 truncate">
                                  {item.title}
                                </span>
                              </span>
                            ))}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>일정 상세보기</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </TooltipProvider>
        </div>
      )}
      <ScheduleDialog
        open={formOpen}
        editingId={editingId}
        draftDate={draftDate}
        draftType={draftType}
        draftTitle={draftTitle}
        draftMemo={draftMemo}
        busy={busy}
        onOpenChange={(open) => (open ? setFormOpen(true) : resetForm())}
        onDateChange={setDraftDate}
        onTypeChange={setDraftType}
        onTitleChange={setDraftTitle}
        onMemoChange={setDraftMemo}
        onSubmit={submitForm}
        onCancel={resetForm}
      />
    </section>
  );
}
