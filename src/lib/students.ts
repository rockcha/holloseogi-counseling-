import { changesBetween, saveLocalWithLog } from "./activity-logs";
import { supabase } from "./supabase";

export type Student = {
  id: string;
  name: string;
  building: number;
  gender: "남" | "여" | null;
  seat_number: string;
  student_status: "재학생" | "재수생" | null;
  phone: string | null;
  counseling_cycle_weeks: number;
};
const key = "holoseogi-students";
const columns =
  "id,name,building,gender,seat_number,student_status,phone,counseling_cycle_weeks";
export async function fetchStudents(): Promise<Student[]> {
  if (!supabase)
    return JSON.parse(localStorage.getItem(key) ?? "[]").map(
      (
        row: Omit<Student, "student_status"> & {
          student_status?: string | null;
        },
      ) => ({
        ...row,
        student_status:
          row.student_status === "현역"
            ? "재학생"
            : (row.student_status ?? null),
      }),
    );
  const { data, error } = await supabase
    .from("students")
    .select(columns)
    .order("building")
    .order("seat_number");
  if (error) throw error;
  return data as Student[];
}
export async function saveStudent(
  student: Student,
  editing: boolean,
  actorName = "홀로서기",
): Promise<Student> {
  if (!supabase) {
    const rows = await fetchStudents();
    if (
      rows.some(
        (row) =>
          row.id !== student.id &&
          row.building === student.building &&
          row.seat_number === student.seat_number,
      )
    )
      throw new Error("이미 사용 중인 좌석입니다.");
    const before = rows.find((row) => row.id === student.id);
    const changes = editing && before ? changesBetween(before, student) : {};
    if (editing && !Object.keys(changes).length) return student;
    saveLocalWithLog(
      key,
      editing
        ? rows.map((row) => (row.id === student.id ? student : row))
        : [...rows, student],
      {
        actor_name: actorName,
        action: editing ? "학생 수정" : "학생 추가",
        student_id: student.id,
        student_name: student.name,
        building: student.building,
        seat_number: student.seat_number,
        changes,
      },
    );
    return student;
  }
  const query = editing
    ? supabase.from("students").update(student).eq("id", student.id)
    : supabase.from("students").insert(student);
  const { data, error } = await query.select(columns).single();
  if (error)
    throw new Error(
      error.code === "23505"
        ? "이미 사용 중인 좌석입니다."
        : "학생을 저장하지 못했습니다. 연결 및 권한을 확인해 주세요.",
    );
  return data as Student;
}
export async function deleteStudent(id: string, actorName = "홀로서기") {
  if (!supabase) {
    const rows = await fetchStudents();
    const student = rows.find((row) => row.id === id);
    if (!student) return;
    saveLocalWithLog(
      key,
      rows.filter((row) => row.id !== id),
      {
        actor_name: actorName,
        action: "학생 삭제",
        student_id: id,
        student_name: student.name,
        building: student.building,
        seat_number: student.seat_number,
        changes: {},
      },
    );
    return;
  }
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (error)
    throw new Error(
      "학생을 삭제하지 못했습니다. 연결 및 권한을 확인해 주세요.",
    );
}
