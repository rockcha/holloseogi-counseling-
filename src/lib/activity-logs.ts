import { supabase } from "./supabase";

export const activityActions = [
  "학생 추가",
  "학생 수정",
  "학생 삭제",
  "상담 완료",
  "상담일지 수정",
  "상담 삭제",
  "상담일지 삭제",
  "전달 내용 등록",
] as const;
export type ActivityLog = {
  id: string;
  occurred_at: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  student_id: string | null;
  target_type?: string;
  target_name?: string;
  student_name: string;
  building: number | null;
  seat_number: string;
  changes: Record<string, { before: unknown; after: unknown }>;
};
export type LogFilters = {
  building: string;
  teacher: string;
  action: string;
  date: string;
};
const key = "holoseogi-activity-logs";
export const logFields: Record<string, string> = {
  audience: "전달 대상",
  name: "이름",
  building: "관",
  seat_number: "좌석번호",
  gender: "성별",
  student_status: "구분",
  phone: "전화번호",
  school: "학교",
  korean_subject: "국어 선택과목",
  math_subject: "수학 선택과목",
  inquiry_subject_1: "탐구 1",
  inquiry_subject_2: "탐구 2",
  counseling_cycle_weeks: "상담주기",
  counseling_requested: "상담 희망 여부",
  date: "상담 날짜",
  content: "내용",
  special_notes: "특이사항",
};

export function changesBetween(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  return Object.fromEntries(
    Object.keys(logFields)
      .filter(
        (key) =>
          JSON.stringify(before[key] ?? null) !==
          JSON.stringify(after[key] ?? null),
      )
      .map((key) => [
        key,
        { before: before[key] ?? null, after: after[key] ?? null },
      ]),
  );
}

// Keep local mutations and their audit entries together; restore data if log storage fails.
export function saveLocalWithLog(
  dataKey: string,
  rows: unknown[],
  entry: Omit<ActivityLog, "id" | "occurred_at" | "actor_id">,
) {
  const previous = localStorage.getItem(dataKey);
  if (
    !activityActions.includes(entry.action as (typeof activityActions)[number])
  ) {
    localStorage.setItem(dataKey, JSON.stringify(rows));
    return;
  }
  const logs: ActivityLog[] = JSON.parse(localStorage.getItem(key) ?? "[]");
  const nextLog: ActivityLog = {
    ...entry,
    id: crypto.randomUUID(),
    occurred_at: new Date().toISOString(),
    actor_id: null,
  };
  localStorage.setItem(dataKey, JSON.stringify(rows));
  try {
    localStorage.setItem(key, JSON.stringify([...logs, nextLog]));
  } catch (error) {
    if (previous === null) localStorage.removeItem(dataKey);
    else localStorage.setItem(dataKey, previous);
    throw error;
  }
}

export async function fetchActivityLogs(filters: LogFilters, page: number) {
  const size = 50;
  const start = filters.date
    ? new Date(`${filters.date}T00:00:00+09:00`).toISOString()
    : "";
  const end = filters.date
    ? new Date(`${filters.date}T23:59:59.999+09:00`).toISOString()
    : "";
  if (!supabase) {
    const rows: ActivityLog[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    const matching = rows
      .filter(
        (row) =>
          row.action !== "상담할 학생 추가" &&
          (filters.building === "전체" ||
            String(row.building) === filters.building ||
            (row.target_type === "announcement" && row.building === null)) &&
          (!filters.teacher || row.actor_name === filters.teacher) &&
          (!filters.action || row.action === filters.action) &&
          (!start || row.occurred_at >= start) &&
          (!end || row.occurred_at <= end),
      )
      .sort(
        (a, b) =>
          b.occurred_at.localeCompare(a.occurred_at) ||
          b.id.localeCompare(a.id),
      );
    return {
      rows: matching.slice(page * size, (page + 1) * size),
      hasMore: matching.length > (page + 1) * size,
    };
  }
  let query = supabase
    .from("activity_logs")
    .select("*")
    .neq("action", "상담할 학생 추가")
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false });
  const literal = (text: string) => text.replace(/[\\%_]/g, "\\$&");
  if (filters.building !== "전체")
    query = query.or(
      `building.eq.${Number(filters.building)},and(target_type.eq.announcement,building.is.null)`,
    );
  if (filters.teacher) query = query.eq("actor_name", filters.teacher);
  if (filters.action) query = query.eq("action", filters.action);
  if (start) query = query.gte("occurred_at", start);
  if (end) query = query.lte("occurred_at", end);
  const { data, error } = await query.range(page * size, (page + 1) * size);
  if (error) throw error;
  return {
    rows: data.slice(0, size) as ActivityLog[],
    hasMore: data.length > size,
  };
}

export async function fetchActivityTeachers(): Promise<string[]> {
  if (!supabase) {
    const rows: ActivityLog[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    return [...new Set(rows.map((row) => row.actor_name))].sort((a, b) =>
      a.localeCompare(b),
    );
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("name")
    .eq("is_teacher", true)
    .order("name");
  if (error) throw error;
  return [...new Set(data.map((row) => row.name as string))];
}
