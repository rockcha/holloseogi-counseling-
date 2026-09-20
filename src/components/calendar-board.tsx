import { useContext, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { MemberProfileContext } from "./auth-gate";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PageHeading } from "./ui/page-heading";
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
  return `${month}월 ${day}일 ${weekday}요일`;
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
    setDraftType("schedule");
    setDraftTitle("");
    setDraftMemo("");
  }

  function openDay(date: string) {
    resetForm();
    setError("");
    onOpenDate(date);
  }

  function startAdd() {
    setEditingId(null);
    setDraftType("schedule");
    setDraftTitle("");
    setDraftMemo("");
    setFormOpen(true);
  }

  function startEdit(event: CalendarEvent) {
    setEditingId(event.id);
    setDraftType(event.type);
    setDraftTitle(event.title);
    setDraftMemo(event.memo ?? "");
    setFormOpen(true);
  }

  const dayEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : [];
  const holidayName = selectedDate
    ? koreanHolidayName(selectedDate)
    : undefined;

  if (selectedDate) {
    return (
      <section className="panel p-5 sm:p-6" aria-label="일정 상세">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <PageHeading as="h2" emoji="📌">
              일정 상세보기
            </PageHeading>
            <p className="mt-2 text-xl font-bold text-[#17283f] sm:text-2xl">
              {formatDayTitle(selectedDate)}
            </p>
            {holidayName && (
              <span className="mt-1 inline-block rounded-full bg-[#fdecec] px-2.5 py-0.5 text-xs font-medium text-[#c0392b]">
                {holidayName}
              </span>
            )}
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
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {dayEvents.length ? (
            dayEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-2.5 rounded-lg border border-[#e5eaf1] bg-white px-3.5 py-3"
              >
                <span aria-hidden="true" className="mt-0.5 text-base">
                  {calendarEventTypeMap[event.type].emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {calendarEventTypeMap[event.type].label}
                  </p>
                  <p className="mt-0.5 wrap-break-word text-sm font-medium text-[#17283f]">
                    {event.title}
                  </p>
                  {event.memo && (
                    <p className="mt-1 whitespace-pre-wrap wrap-break-word text-xs text-muted-foreground">
                      {event.memo}
                    </p>
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
            <p className="rounded-lg border border-dashed border-[#e1e7ef] px-4 py-8 text-center text-sm text-muted-foreground">
              등록된 일정이 없습니다.
            </p>
          )}
        </div>
        {formOpen && (
          <form
            className="mt-5 space-y-3 rounded-xl border border-[#e5eaf1] bg-[#fbfcfe] p-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!draftTitle.trim()) return;
              void mutate(async () => {
                if (editingId) {
                  const row = await updateCalendarEvent(ownerId, editingId, {
                    event_date: selectedDate,
                    type: draftType,
                    title: draftTitle,
                    memo: draftMemo,
                  });
                  setEvents((current) =>
                    current.map((item) => (item.id === row.id ? row : item)),
                  );
                } else {
                  const row = await addCalendarEvent(ownerId, {
                    event_date: selectedDate,
                    type: draftType,
                    title: draftTitle,
                    memo: draftMemo,
                  });
                  setEvents((current) => [...current, row]);
                }
                resetForm();
              });
            }}
          >
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
                  onClick={() => setDraftType(item.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${draftType === item.value ? "border-[#17283f] bg-[#17283f] text-white" : "border-[#e1e7ef] bg-white text-muted-foreground hover:border-[#c7d4e3]"}`}
                >
                  <span aria-hidden="true">{item.emoji}</span>
                  {item.label}
                </button>
              ))}
            </div>
            <Input
              aria-label="일정 제목"
              placeholder="제목을 입력하세요"
              maxLength={200}
              value={draftTitle}
              disabled={busy}
              onChange={(event) => setDraftTitle(event.target.value)}
            />
            <textarea
              aria-label="메모"
              placeholder="메모 (선택)"
              maxLength={1000}
              value={draftMemo}
              disabled={busy}
              onChange={(event) => setDraftMemo(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={!draftTitle.trim() || busy}
                className="flex-1 gap-1.5"
              >
                <Plus size={16} />
                {editingId ? "수정 완료" : "추가"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                취소
              </Button>
            </div>
          </form>
        )}
      </section>
    );
  }

  return (
    <section className="panel p-5 sm:p-6" aria-label="캘린더">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeading emoji="📅">캘린더</PageHeading>
        <Button className="gap-1.5" onClick={() => openDay(today)}>
          <Plus size={16} />
          일정 추가
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {calendarEventTypes.map((item) => (
          <span key={item.value} className="inline-flex items-center gap-1">
            <span aria-hidden="true">{item.emoji}</span>
            {item.label}
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
                const uniqueTypes = Array.from(
                  new Set(dayItems.map((item) => item.type)),
                );
                const isToday = date === today;
                const holiday = koreanHolidayName(date);
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => openDay(date)}
                    aria-label={`${date} 일정 보기, ${dayItems.length}건`}
                    className={`flex h-20 flex-col items-start gap-1 border-b border-l border-[#e1e7ef] p-1.5 text-left transition-colors first:border-l-0 hover:bg-[#f2f6fb] sm:h-24 sm:p-2 ${holiday ? "bg-[#fdecec]" : isToday ? "bg-[#eef4ff]" : "bg-white"}`}
                  >
                    <span
                      className={`text-xs font-medium ${isToday ? "flex size-5 items-center justify-center rounded-full bg-[#17283f] text-white" : holiday ? "text-[#c0392b]" : "text-[#17283f]"}`}
                    >
                      {dayNumber}
                    </span>
                    <span className="flex flex-wrap gap-0.5">
                      {uniqueTypes.slice(0, 3).map((type) => {
                        const titles = dayItems
                          .filter((item) => item.type === type)
                          .map((item) => item.title)
                          .join(", ");
                        return (
                          <span
                            key={type}
                            title={titles}
                            className="text-xs leading-none"
                          >
                            {calendarEventTypeMap[type].emoji}
                          </span>
                        );
                      })}
                      {dayItems.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{dayItems.length - 3}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
