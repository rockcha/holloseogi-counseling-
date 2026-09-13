import { test, expect } from "@playwright/test";
import { counselingStatus } from "../src/lib/counseling-status";

test("상담 미희망은 상담기록이 없거나 주기가 지나도 상담 필요에서 제외", () => {
  const student = { counseling_requested: false, counseling_cycle_weeks: 2 };
  expect(counselingStatus(student, undefined, "2026-09-14").needed).toBe(false);
  expect(counselingStatus(student, "2026-08-01", "2026-09-14").needed).toBe(
    false,
  );
  expect(
    counselingStatus(
      { ...student, counseling_requested: true },
      "2026-08-01",
      "2026-09-14",
    ).needed,
  ).toBe(true);
  expect(
    counselingStatus({ counseling_cycle_weeks: 0 }, undefined, "2026-09-14")
      .needed,
  ).toBe(false);
});

test("상담 희망 여부 수정 후 새로고침해도 보존", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "학생 관리", exact: true }).click();
  await page.getByRole("button", { name: "학생 추가", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("이름", { exact: true }).fill("희망여부검사");
  await dialog.getByLabel("좌석번호").fill("M99");
  await dialog
    .getByRole("combobox", { name: "상담 희망 여부", exact: true })
    .click();
  await page.getByRole("option", { name: "미희망", exact: true }).click();
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "학생 관리", exact: true }).click();
  await expect(page.locator("tbody")).not.toContainText("미희망");
  await page.getByRole("button", { name: "희망여부검사 학생 수정" }).click();
  await expect(
    dialog.getByRole("combobox", { name: "상담 희망 여부", exact: true }),
  ).toContainText("미희망");
  await expect(
    dialog.getByRole("combobox", { name: "상담주기", exact: true }),
  ).toContainText("1주");
  await dialog
    .getByRole("combobox", { name: "상담 희망 여부", exact: true })
    .click();
  await page.getByRole("option", { name: "희망", exact: true }).click();
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("tbody")).not.toContainText("미희망");
});
