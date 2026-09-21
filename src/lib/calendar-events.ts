import { supabase } from "./supabase";

export type CalendarEventType = "work" | "schedule" | "etc" | "hobby";

export type CalendarEvent = {
  id: string;
  owner_id: string;
  event_date: string;
  type: CalendarEventType;
  title: string;
  memo: string | null;
  created_at: string;
};

export const calendarEventTypes: {
  value: CalendarEventType;
  label: string;
  color: string;
  background: string;
}[] = [
  { value: "work", label: "업무", color: "#2f6fed", background: "#edf3ff" },
  { value: "schedule", label: "일정", color: "#d97706", background: "#fff7e8" },
  { value: "hobby", label: "취미", color: "#0f8a72", background: "#eafaf5" },
  { value: "etc", label: "기타", color: "#8b5cf6", background: "#f3efff" },
];

export const calendarEventTypeMap = Object.fromEntries(
  calendarEventTypes.map((item) => [item.value, item]),
) as Record<CalendarEventType, (typeof calendarEventTypes)[number]>;

const columns = "id,owner_id,event_date,type,title,memo,created_at";
const localKey = (ownerId: string) => `holoseogi-calendar-events-${ownerId}`;
const localRows = (ownerId: string): CalendarEvent[] =>
  JSON.parse(localStorage.getItem(localKey(ownerId)) ?? "[]");

export async function fetchCalendarEvents(
  ownerId: string,
): Promise<CalendarEvent[]> {
  if (!supabase) return localRows(ownerId);
  const rows: CalendarEvent[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("calendar_events")
      .select(columns)
      .eq("owner_id", ownerId)
      .order("event_date")
      .order("created_at")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

export async function addCalendarEvent(
  ownerId: string,
  input: {
    event_date: string;
    type: CalendarEventType;
    title: string;
    memo?: string;
  },
): Promise<CalendarEvent> {
  const title = input.title.trim();
  if (!title || title.length > 200)
    throw new Error("제목은 1~200자로 입력해 주세요.");
  const memo = input.memo?.trim() || null;
  if (!supabase) {
    const row: CalendarEvent = {
      id: crypto.randomUUID(),
      owner_id: ownerId,
      event_date: input.event_date,
      type: input.type,
      title,
      memo,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(
      localKey(ownerId),
      JSON.stringify([...localRows(ownerId), row]),
    );
    return row;
  }
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      owner_id: ownerId,
      event_date: input.event_date,
      type: input.type,
      title,
      memo,
    })
    .select(columns)
    .single();
  if (error) throw error;
  return data;
}

export async function updateCalendarEvent(
  ownerId: string,
  id: string,
  input: {
    event_date: string;
    type: CalendarEventType;
    title: string;
    memo?: string;
  },
): Promise<CalendarEvent> {
  const title = input.title.trim();
  if (!title || title.length > 200)
    throw new Error("제목은 1~200자로 입력해 주세요.");
  const memo = input.memo?.trim() || null;
  if (!supabase) {
    const rows = localRows(ownerId);
    const row = rows.find((item) => item.id === id);
    if (!row) throw new Error("일정을 찾을 수 없습니다.");
    const next: CalendarEvent = {
      ...row,
      event_date: input.event_date,
      type: input.type,
      title,
      memo,
    };
    localStorage.setItem(
      localKey(ownerId),
      JSON.stringify(rows.map((item) => (item.id === id ? next : item))),
    );
    return next;
  }
  const { data, error } = await supabase
    .from("calendar_events")
    .update({ event_date: input.event_date, type: input.type, title, memo })
    .eq("owner_id", ownerId)
    .eq("id", id)
    .select(columns)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCalendarEvent(ownerId: string, id: string) {
  if (!supabase) {
    localStorage.setItem(
      localKey(ownerId),
      JSON.stringify(localRows(ownerId).filter((row) => row.id !== id)),
    );
    return;
  }
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("owner_id", ownerId)
    .eq("id", id);
  if (error) throw error;
}
