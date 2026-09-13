import { fetchStudents } from "./students";
import { supabase } from "./supabase";

export type CounselingPlan = {
  id: string;
  student_id: string;
  date: string;
  time: string;
  note: string;
  created_by?: string | null;
};
export type PlanDraft = Omit<CounselingPlan, "id" | "created_by">;
const key = "holoseogi-counseling-plans";
const columns = "id,student_id,date,time,note,created_by";
export async function fetchPlans(teacherId?: string): Promise<CounselingPlan[]> {
  if (!supabase) return JSON.parse(localStorage.getItem(key) ?? "[]");
  if (!teacherId) return [];
  const result: CounselingPlan[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("counseling_plans")
      .select(columns)
      .eq("created_by", teacherId)
      .order("date")
      .order("time")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    result.push(...data.map((row) => ({ ...row, time: row.time.slice(0, 5) })));
    if (data.length < 1000) return result;
  }
}
export async function createPlan(
  draft: PlanDraft,
  actorName = "홀로서기",
): Promise<CounselingPlan> {
  if (!supabase) {
    const rows = await fetchPlans();
    if (
      rows.some(
        (row) =>
          row.student_id === draft.student_id &&
          row.date === draft.date &&
          row.time === draft.time,
      )
    )
      throw new Error("같은 학생의 동일한 시간에 이미 예정된 상담이 있습니다.");
    const row = { ...draft, id: crypto.randomUUID() };
    const student = (await fetchStudents()).find(
      (student) => student.id === draft.student_id,
    );
    if (!student) throw new Error("학생을 찾을 수 없습니다.");
    localStorage.setItem(key, JSON.stringify([...rows, row]));
    return row;
  }
  const { data, error } = await supabase
    .from("counseling_plans")
    .insert(draft)
    .select(columns)
    .single();
  if (error)
    throw new Error(
      error.code === "23505"
        ? "같은 학생의 동일한 시간에 이미 예정된 상담이 있습니다."
        : "예정을 저장하지 못했습니다. 연결과 권한을 확인해 주세요.",
    );
  return { ...data, time: data.time.slice(0, 5) } as CounselingPlan;
}

export async function deletePlan(id: string): Promise<void> {
  if (!supabase) {
    const rows = await fetchPlans();
    if (!rows.some((row) => row.id === id))
      throw new Error("상담 예정 정보를 찾을 수 없습니다.");
    localStorage.setItem(
      key,
      JSON.stringify(rows.filter((row) => row.id !== id)),
    );
    return;
  }
  const { error } = await supabase
    .from("counseling_plans")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (error)
    throw new Error(
      "상담 예정에서 제외하지 못했습니다. 연결과 권한을 확인해 주세요.",
    );
}
