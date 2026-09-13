import { test, expect } from "@playwright/test";

test("메뉴 순서, 활동 기록과 변경 내용, 일지·학생 삭제 후 로그 보존 및 검색", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("aside nav button")).toHaveText([
    "대시보드",
    "학생 관리",
    "상담 관리",
    "활동 로그",
  ]);
  await expect(
    page.getByRole("button", { name: "상담 일정", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "학생 관리", exact: true }).click();
  await page.getByRole("button", { name: "학생 추가", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("이름", { exact: true }).fill("로그학생");
  await dialog.getByLabel("좌석번호").fill("M01");
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "로그학생 학생 수정" }).click();
  await dialog.getByRole("combobox", { name: "상담주기", exact: true }).click();
  await page.getByRole("option", { name: "2주", exact: true }).click();
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "상담 관리", exact: true }).click();
  await page.getByRole("link", { name: "로그학생", exact: true }).click();
  await page
    .getByRole("button", { name: "상담일지 작성", exact: true })
    .click();
  await page.getByLabel("내용", { exact: true }).fill("비공개 상담 내용");
  await page
    .getByRole("button", { name: "저장하기", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: "2026.09.13" }).click();
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "삭제", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await page.getByRole("button", { name: "학생 관리", exact: true }).click();
  await page.getByRole("button", { name: "로그학생 학생 수정" }).click();
  await dialog.getByRole("button", { name: "학생 삭제", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "삭제", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "활동 로그", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(5);
  for (const action of [
    "학생 추가",
    "학생 수정",
    "상담 완료",
    "상담 삭제",
    "학생 삭제",
  ]) {
    await expect(page.locator("tbody")).toContainText(action);
  }
  await expect(page.locator("tbody")).toContainText("홀로서기");
  await expect(page.locator("tbody")).not.toContainText("비공개 상담 내용");
  await page.getByLabel("유형 필터").selectOption("학생 삭제");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("로그학생");
  await page.getByLabel("선생님 필터").selectOption("없는선생님");
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await page.getByLabel("선생님 필터").selectOption("홀로서기");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "2관", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await page.getByRole("button", { name: "전체", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page.reload();
  await page.getByRole("button", { name: "활동 로그", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(5);
});
