import { test, expect } from "@playwright/test";

test("전달 대상별 등록·목록, 알림 읽음·새로고침, 작성 로그와 모바일", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("announcements-seeded")) return;
    localStorage.setItem("announcements-seeded", "1");
    localStorage.setItem(
      "holoseogi-announcements",
      JSON.stringify(
        [null, 1, 2].map((building, index) => ({
          id: `notice-${index}`,
          title: `${building ?? "전체"} 전달사항`,
          content: "다른 선생님이 남긴 전달 내용",
          building,
          author_id: "other-teacher",
          author_name: "김선생",
          created_at: "2026-09-12T01:00:00Z",
        })),
      ),
    );
  });
  await page.goto("/");
  await expect(page.getByLabel("읽지 않은 알림 3개")).toBeVisible();
  await page.getByRole("button", { name: "1관", exact: true }).click();
  await expect(page.getByLabel("읽지 않은 알림 2개")).toBeVisible();
  await page.getByRole("button", { name: "알림", exact: true }).click();
  await page
    .locator(".notification-row")
    .filter({ hasText: "전체 전달사항" })
    .click();
  await expect(page).toHaveURL(/\/community\/announcements\/notice-0$/);
  await expect(page.getByRole("main")).toContainText(
    "다른 선생님이 남긴 전달 내용",
  );
  await page.getByLabel("댓글 작성").fill("확인했습니다.");
  await page.getByRole("button", { name: "댓글 등록", exact: true }).click();
  await expect(page.getByRole("main")).toContainText("확인했습니다.");
  await page
    .getByRole("button", { name: "전달 내용 목록", exact: true })
    .click();
  await expect(page.getByLabel("읽지 않은 알림 1개")).toBeVisible();
  await expect(page.getByLabel("댓글 1개")).toBeVisible();
  await expect(page.locator(".announcement-row")).toHaveCount(2);
  await page
    .getByRole("button", { name: "전달 내용 추가", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "1관", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "전체", exact: true }).click();
  await dialog.getByLabel("제목", { exact: true }).fill("주간 업무 공유");
  await dialog
    .getByLabel("내용", { exact: true })
    .fill("이번 주 전달할 내용입니다.\n전체 선생님 확인 부탁드립니다.");
  await dialog.getByRole("button", { name: "등록", exact: true }).click();
  await expect(page).toHaveURL(/\/community\/announcements\/[^/]+$/);
  await expect(page.getByRole("main")).toContainText("주간 업무 공유");
  await page
    .getByRole("button", { name: "전달 내용 목록", exact: true })
    .click();
  await expect(page.locator(".announcement-row")).toHaveCount(3);
  await expect(page.getByLabel("읽지 않은 알림 1개")).toBeVisible();
  await page.getByRole("button", { name: "알림", exact: true }).click();
  await page.getByRole("button", { name: "모두 읽음" }).click();
  await expect(page.locator(".notification-count")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator(".announcement-row")).toHaveCount(3);
  await expect(page.locator(".notification-count")).toHaveCount(0);
  await page.getByRole("button", { name: "2관", exact: true }).click();
  await expect(page.getByLabel("읽지 않은 알림 1개")).toBeVisible();
  await expect(page.locator(".announcement-row")).toHaveCount(3);
  await page.getByRole("button", { name: "활동 로그", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("전달 내용 등록");
  await page.getByRole("button", { name: "전달 내용", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "알림", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("다른 선생님 글이 새로 등록되면 열린 앱의 알림을 갱신", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".notification-count")).toHaveCount(0);
  await page.evaluate(() => {
    localStorage.setItem(
      "holoseogi-announcements",
      JSON.stringify([
        {
          id: "new-notice",
          title: "새 전달",
          content: "새로운 내용",
          building: null,
          author_id: "another",
          author_name: "이선생",
          created_at: new Date().toISOString(),
        },
      ]),
    );
    window.dispatchEvent(new Event("storage"));
  });
  await expect(page.getByLabel("읽지 않은 알림 1개")).toBeVisible();
  await page.getByRole("button", { name: "알림", exact: true }).click();
  await expect(page.locator(".notification-row")).toContainText(
    "이선생 선생님",
  );
});
