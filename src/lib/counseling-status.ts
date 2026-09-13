import type { Student } from "./students";

export function counselingStatus(
  student: Pick<Student, "counseling_cycle_weeks" | "counseling_requested">,
  latestDate: string | undefined,
  today: string,
) {
  if (
    student.counseling_requested === false ||
    student.counseling_cycle_weeks === 0
  )
    return {
      label: "상담 필요 없음",
      needed: false,
      detail:
        student.counseling_requested === false
          ? "상담 미희망"
          : "정기 상담 대상 아님",
      tone: "bg-[#f1f3f6] text-[#748399]",
    };
  if (!latestDate)
    return {
      label: "상담 필요",
      needed: true,
      detail: "아직 상담 기록이 없습니다",
      tone: "bg-[#eaf0f7] text-[#426083]",
    };
  const elapsedDays = Math.floor(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${latestDate}T00:00:00Z`)) /
      86400000,
  );
  const overdueDays = elapsedDays - student.counseling_cycle_weeks * 7;
  return overdueDays > 0
    ? {
        label: "상담 필요",
        needed: true,
        detail: "",
        tone: "bg-[#eaf0f7] text-[#426083]",
      }
    : {
        label: "상담 필요 없음",
        needed: false,
        detail: `최근 ${latestDate.replaceAll("-", ".")} · ${student.counseling_cycle_weeks}주 주기`,
        tone: "bg-[#eaf0f7] text-[#426083]",
      };
}
