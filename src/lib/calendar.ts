import { supabase } from "./supabase";

export const calendarWeekdays = ["일", "월", "화", "수", "목", "금", "토"];

export function formatCalendarDayTitle(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  const weekday = calendarWeekdays[new Date(`${date}T00:00:00`).getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

export type CalendarTodo = {
  id: string;
  owner_id: string;
  todo_date: string;
  content: string;
  done: boolean;
  created_at: string;
};

export type CalendarDailyMemo = {
  owner_id: string;
  memo_date: string;
  content: string;
  updated_at: string;
};

const todoColumns = "id,owner_id,todo_date,content,done,created_at";
const memoColumns = "owner_id,memo_date,content,updated_at";

const todosKey = (ownerId: string) => `holoseogi-calendar-todos-${ownerId}`;
const memosKey = (ownerId: string) => `holoseogi-calendar-memos-${ownerId}`;

const localTodos = (ownerId: string): CalendarTodo[] =>
  JSON.parse(localStorage.getItem(todosKey(ownerId)) ?? "[]");
const localMemos = (ownerId: string): CalendarDailyMemo[] =>
  JSON.parse(localStorage.getItem(memosKey(ownerId)) ?? "[]");

// ---- Todos ----

export async function fetchCalendarTodos(
  ownerId: string,
): Promise<CalendarTodo[]> {
  if (!supabase) return localTodos(ownerId);
  const rows: CalendarTodo[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("calendar_todos")
      .select(todoColumns)
      .eq("owner_id", ownerId)
      .order("todo_date")
      .order("created_at")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

export async function addCalendarTodo(
  ownerId: string,
  input: { todo_date: string; content: string },
): Promise<CalendarTodo> {
  const content = input.content.trim();
  if (!content || content.length > 300)
    throw new Error("할 일은 1~300자로 입력해 주세요.");
  if (!supabase) {
    const row: CalendarTodo = {
      id: crypto.randomUUID(),
      owner_id: ownerId,
      todo_date: input.todo_date,
      content,
      done: false,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(
      todosKey(ownerId),
      JSON.stringify([...localTodos(ownerId), row]),
    );
    return row;
  }
  const { data, error } = await supabase
    .from("calendar_todos")
    .insert({ owner_id: ownerId, todo_date: input.todo_date, content })
    .select(todoColumns)
    .single();
  if (error) throw error;
  return data;
}

export async function updateCalendarTodo(
  ownerId: string,
  id: string,
  input: { content?: string; done?: boolean },
): Promise<CalendarTodo> {
  const content = input.content?.trim();
  if (content !== undefined && (!content || content.length > 300))
    throw new Error("할 일은 1~300자로 입력해 주세요.");
  if (!supabase) {
    const rows = localTodos(ownerId);
    const row = rows.find((item) => item.id === id);
    if (!row) throw new Error("할 일을 찾을 수 없습니다.");
    const next: CalendarTodo = {
      ...row,
      ...(content !== undefined ? { content } : {}),
      ...(input.done !== undefined ? { done: input.done } : {}),
    };
    localStorage.setItem(
      todosKey(ownerId),
      JSON.stringify(rows.map((item) => (item.id === id ? next : item))),
    );
    return next;
  }
  const patch: Record<string, unknown> = {};
  if (content !== undefined) patch.content = content;
  if (input.done !== undefined) patch.done = input.done;
  const { data, error } = await supabase
    .from("calendar_todos")
    .update(patch)
    .eq("owner_id", ownerId)
    .eq("id", id)
    .select(todoColumns)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCalendarTodo(ownerId: string, id: string) {
  if (!supabase) {
    localStorage.setItem(
      todosKey(ownerId),
      JSON.stringify(localTodos(ownerId).filter((row) => row.id !== id)),
    );
    return;
  }
  const { error } = await supabase
    .from("calendar_todos")
    .delete()
    .eq("owner_id", ownerId)
    .eq("id", id);
  if (error) throw error;
}

// ---- Daily memos ----

export async function fetchCalendarMemos(
  ownerId: string,
): Promise<CalendarDailyMemo[]> {
  if (!supabase) return localMemos(ownerId);
  const rows: CalendarDailyMemo[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("calendar_daily_memos")
      .select(memoColumns)
      .eq("owner_id", ownerId)
      .order("memo_date")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

export async function saveCalendarMemo(
  ownerId: string,
  date: string,
  content: string,
): Promise<CalendarDailyMemo> {
  if (content.length > 5000)
    throw new Error("메모는 5000자 이하로 입력해 주세요.");
  if (!supabase) {
    const rows = localMemos(ownerId).filter((item) => item.memo_date !== date);
    const row: CalendarDailyMemo = {
      owner_id: ownerId,
      memo_date: date,
      content,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(memosKey(ownerId), JSON.stringify([...rows, row]));
    return row;
  }
  const { data, error } = await supabase
    .from("calendar_daily_memos")
    .upsert(
      { owner_id: ownerId, memo_date: date, content },
      { onConflict: "owner_id,memo_date" },
    )
    .select(memoColumns)
    .single();
  if (error) throw error;
  return data;
}
