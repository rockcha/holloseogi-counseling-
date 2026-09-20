import { expect, test } from "@playwright/test";

test("날짜 클릭은 URL 기반 일정 상세보기와 2열 일정 카드를 연다", async ({
  page,
}) => {
  await page.clock.install({ time: new Date(2026, 8, 21, 12) });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "holoseogi-calendar-events-demo",
      JSON.stringify([
        {
          id: "schedule-1",
          owner_id: "demo",
          event_date: "2026-09-21",
          type: "schedule",
          title: "학부모 상담",
          memo: null,
          created_at: "2026-09-01T00:00:00.000Z",
        },
        {
          id: "schedule-2",
          owner_id: "demo",
          event_date: "2026-09-21",
          type: "work",
          title: "회의 준비",
          memo: null,
          created_at: "2026-09-01T00:00:00.000Z",
        },
      ]),
    );
  });

  await page.goto("/calendar");
  await page.getByRole("button", { name: "2026-09-21 일정 보기, 2건" }).click();

  await expect(page).toHaveURL(/\/calendar\/2026-09-21$/);
  const detail = page.getByRole("region", { name: "일정 상세" });
  await expect(
    detail.getByRole("heading", { name: "일정 상세보기" }),
  ).toBeVisible();
  await expect(detail.getByRole("button", { name: "캘린더로" })).toBeVisible();
  await expect(detail.getByRole("button", { name: "일정 추가" })).toBeVisible();
  await expect(detail).toContainText("📌");

  const firstCard = detail.getByText("학부모 상담").locator("../..");
  const secondCard = detail.getByText("회의 준비").locator("../..");
  const [firstBox, secondBox] = await Promise.all([
    firstCard.boundingBox(),
    secondCard.boundingBox(),
  ]);
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  expect(secondBox!.x).toBeGreaterThan(firstBox!.x);
  expect(secondBox!.y).toBe(firstBox!.y);
});
