import { saveLocalWithLog } from "./activity-logs";
import { fetchStudents } from "./students";
import { supabase } from "./supabase";
export { counselingStatus } from "./counseling-status";

export type Journal = {
  id: string;
  student_id: string;
  date: string;
  counselor_name: string;
  counselor_id?: string | null;
  content: string;
  special_notes: string;
  parent_message_sent?: boolean;
  created_at: string;
};
export type JournalDraft = Pick<
  Journal,
  "student_id" | "date" | "content" | "special_notes" | "parent_message_sent"
>;
export type LatestCounsel = {
  student_id: string;
  latest_date: string;
  journal_count: number;
};
const key = "holoseogi-counseling-journals";
const columns =
  "id,student_id,date,counselor_id,counselor_name,content,special_notes,parent_message_sent,created_at";
const localRows = (): Journal[] =>
  JSON.parse(localStorage.getItem(key) ?? "[]");

export async function fetchLatestCounsels(mineOnly = false): Promise<LatestCounsel[]> {
  if (!supabase) {
    const latest = new Map<string, string>();
    const counts = new Map<string, number>();
    for (const row of localRows()) {
      if (!latest.has(row.student_id) || row.date > latest.get(row.student_id)!)
        latest.set(row.student_id, row.date);
      counts.set(row.student_id, (counts.get(row.student_id) ?? 0) + 1);
    }
    return [...latest].map(([student_id, latest_date]) => ({
      student_id,
      latest_date,
      journal_count: counts.get(student_id)!,
    }));
  }
  const result: LatestCounsel[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(mineOnly ? "my_student_latest_counsels" : "student_latest_counsels")
      .select("student_id,latest_date,journal_count")
      .order("student_id")
      .range(from, from + 999);
    if (error) throw error;
    result.push(...data);
    if (data.length < 1000) return result;
  }
}

export async function fetchMyTodayJournals(date: string, teacherId?: string): Promise<Journal[]> {
  if (!supabase) return localRows().filter(row => row.date === date);
  if (!teacherId) return [];
  const result: Journal[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("counseling_journals").select(columns)
      .eq("counselor_id", teacherId).eq("date", date).order("created_at").order("id").range(from, from + 999);
    if (error) throw error;
    result.push(...data);
    if (data.length < 1000) return result;
  }
}

export async function fetchJournals(studentId: string): Promise<Journal[]> {
  if (!supabase)
    return localRows()
      .filter((row) => row.student_id === studentId)
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.created_at.localeCompare(a.created_at),
      );
  const result: Journal[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("counseling_journals")
      .select(columns)
      .eq("student_id", studentId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    result.push(...data);
    if (data.length < 1000) return result;
  }
}

export async function createJournal(
  draft: JournalDraft,
  counselorName: string,
): Promise<Journal> {
  if (!supabase) {
    const row: Journal = {
      ...draft,
      id: crypto.randomUUID(),
      counselor_name: counselorName,
      created_at: new Date().toISOString(),
    };
    const student = (await fetchStudents()).find(
      (student) => student.id === draft.student_id,
    );
    if (!student) throw new Error("학생을 찾을 수 없습니다.");
    saveLocalWithLog(key, [...localRows(), row], {
      actor_name: counselorName,
      action: "상담 완료",
      student_id: student.id,
      student_name: student.name,
      building: student.building,
      seat_number: student.seat_number,
      changes: { date: { before: null, after: draft.date } },
    });
    return row;
  }
  // The database fills in the authenticated counselor and their name.
  const { data, error } = await supabase
    .from("counseling_journals")
    .insert(draft)
    .select(columns)
    .single();
  if (error) throw error;
  return data as Journal;
}

export async function updateJournal(
  id: string,
  draft: JournalDraft,
  counselorName: string,
): Promise<Journal> {
  if (!supabase) {
    const rows = localRows();
    const existing = rows.find((row) => row.id === id);
    if (!existing) throw new Error("상담일지를 찾을 수 없습니다.");
    const student = (await fetchStudents()).find(
      (row) => row.id === existing.student_id,
    );
    if (!student) throw new Error("학생을 찾을 수 없습니다.");
    const row: Journal = {
      ...existing,
      ...draft,
      counselor_name: existing.counselor_name || counselorName,
    };
    saveLocalWithLog(
      key,
      rows.map((item) => (item.id === id ? row : item)),
      {
        actor_name: counselorName,
        action: "상담일지 수정",
        student_id: student.id,
        student_name: student.name,
        building: student.building,
        seat_number: student.seat_number,
        changes: { date: { before: existing.date, after: draft.date } },
      },
    );
    return row;
  }
  const { data, error } = await supabase
    .from("counseling_journals")
    .update({
      date: draft.date,
      content: draft.content,
      special_notes: draft.special_notes,
      parent_message_sent: draft.parent_message_sent,
    })
    .eq("id", id)
    .select(columns)
    .single();
  if (error)
    throw new Error(
      "상담일지를 수정하지 못했습니다. 연결과 권한을 확인해 주세요.",
    );
  return data as Journal;
}

export async function deleteJournal(id: string, actorName: string) {
  if (!supabase) {
    const rows = localRows();
    const journal = rows.find((row) => row.id === id);
    if (!journal) throw new Error("상담일지를 찾을 수 없습니다.");
    const student = (await fetchStudents()).find(
      (row) => row.id === journal.student_id,
    );
    if (!student) throw new Error("학생을 찾을 수 없습니다.");
    saveLocalWithLog(
      key,
      rows.filter((row) => row.id !== id),
      {
        actor_name: actorName,
        action: "상담 삭제",
        student_id: student.id,
        student_name: student.name,
        building: student.building,
        seat_number: student.seat_number,
        changes: { date: { before: journal.date, after: null } },
      },
    );
    return;
  }
  const { error } = await supabase
    .from("counseling_journals")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (error)
    throw new Error(
      "상담일지를 삭제하지 못했습니다. 연결과 권한을 확인해 주세요.",
    );
}
