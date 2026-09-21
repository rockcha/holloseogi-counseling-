import { expect, test } from "@playwright/test";

test("날짜 클릭은 URL을 갱신하고 오른쪽 패널에 할 일과 메모를 보여준다", async ({
  page,
}) => {
  await page.clock.install({ time: new Date(2026, 8, 21, 12) });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "holoseogi-calendar-todos-demo",
      JSON.stringify([
        {
          id: "todo-1",
          owner_id: "demo",
          todo_date: "2026-09-21",
          content: "학부모 상담 준비",
          done: false,
          created_at: "2026-09-01T00:00:00.000Z",
        },
        {
          id: "todo-2",
          owner_id: "demo",
          todo_date: "2026-09-21",
          content: "회의 자료 정리",
          done: true,
          created_at: "2026-09-01T00:00:01.000Z",
        },
      ]),
    );
    localStorage.setItem(
      "holoseogi-calendar-memos-demo",
      JSON.stringify([
        {
          owner_id: "demo",
          memo_date: "2026-09-21",
          content: "오늘의 메모 내용",
          updated_at: "2026-09-01T00:00:00.000Z",
        },
      ]),
    );
  });

  await page.goto("/calendar");
  await page.getByRole("button", { name: "2026-09-21 할 일 2건" }).click();

  await expect(page).toHaveURL(/\/calendar\/2026-09-21$/);
  const detail = page.getByRole("region", { name: "일정 상세" });
  await expect(detail).toContainText("9월 21일");
  await expect(detail).toContainText("학부모 상담 준비");
  await expect(detail).toContainText("회의 자료 정리");
  await expect(detail.getByLabel("날짜별 메모")).toHaveValue(
    "오늘의 메모 내용",
  );

  await detail.getByLabel("할 일 추가").fill("새 할 일 추가하기");
  await detail.getByLabel("할 일 추가").press("Enter");
  await expect(detail).toContainText("새 할 일 추가하기");
});
