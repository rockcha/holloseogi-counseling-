import { test, expect } from "@playwright/test";
import { counselingStatus } from "../src/lib/counseling-status";

test("상담 필요 계산: 주기 초과, 경계일, 첫 상담, 상담 없음", () => {
  expect(
    counselingStatus({ counseling_cycle_weeks: 1 }, "2026-09-05", "2026-09-12")
      .needed,
  ).toBe(false);
  expect(
    counselingStatus({ counseling_cycle_weeks: 1 }, "2026-09-04", "2026-09-12")
      .needed,
  ).toBe(true);
  expect(
    counselingStatus({ counseling_cycle_weeks: 4 }, "2026-08-15", "2026-09-12")
      .needed,
  ).toBe(false);
  expect(
    counselingStatus({ counseling_cycle_weeks: 4 }, "2026-08-14", "2026-09-12")
      .needed,
  ).toBe(true);
  expect(
    counselingStatus({ counseling_cycle_weeks: 1 }, undefined, "2026-09-12")
      .label,
  ).toBe("상담 필요");
  expect(
    counselingStatus({ counseling_cycle_weeks: 0 }, undefined, "2026-09-12")
      .needed,
  ).toBe(false);
});

test("관별 현황, 학생 URL, 일지 작성, 상태 갱신, 새로고침과 뒤로가기", async ({
  page,
}) => {
  await page.clock.install({ time: new Date(2026, 8, 12, 12) });
  await page.addInitScript(() => {
    if (localStorage.getItem("journal-test-seeded")) return;
    localStorage.setItem("journal-test-seeded", "1");
    const base = {
      gender: null,
      phone: null,
      student_status: null,
      counseling_cycle_weeks: 1,
    };
    localStorage.setItem(
      "holoseogi-students",
      JSON.stringify([
        {
          ...base,
          id: "11111111-1111-4111-8111-111111111111",
          name: "주기초과학생",
          building: 2,
          seat_number: "W01",
        },
        {
          ...base,
          id: "22222222-2222-4222-8222-222222222222",
          name: "경계학생",
          building: 2,
          seat_number: "W02",
        },
        {
          ...base,
          id: "33333333-3333-4333-8333-333333333333",
          name: "첫상담학생",
          building: 1,
          seat_number: "M13",
        },
        {
          ...base,
          id: "44444444-4444-4444-8444-444444444444",
          name: "상담없는학생",
          building: 2,
          seat_number: "W03",
          counseling_cycle_weeks: 0,
        },
      ]),
    );
    localStorage.setItem(
      "holoseogi-counseling-journals",
      JSON.stringify([
        {
          id: "old",
          student_id: "11111111-1111-4111-8111-111111111111",
          date: "2026-09-04",
          counselor_name: "김선생",
          content: "지난 학습 확인",
          special_notes: "",
          created_at: "2026-09-04T03:00:00Z",
        },
        {
          id: "boundary",
          student_id: "22222222-2222-4222-8222-222222222222",
          date: "2026-09-05",
          counselor_name: "김선생",
          content: "경계일 상담",
          special_notes: "",
          created_at: "2026-09-05T03:00:00Z",
        },
      ]),
    );
  });
  await page.goto("/counseling");
  await expect(
    page.getByRole("heading", { name: /학생별 상담 현황/ }),
  ).toBeVisible();
  await expect(page.locator("thead th")).toHaveText([
    "좌석번호",
    "이름",
    "횟수",
    "상담 필요 여부",
  ]);
  await expect(
    page.getByRole("row").filter({ hasText: "주기초과학생" }),
  ).toHaveCSS("background-color", "rgb(255, 244, 230)");
  await expect(page.getByRole("row").filter({ hasText: "경계학생" })).toHaveCSS(
    "background-color",
    "rgb(234, 240, 247)",
  );
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "주기초과학생" })
      .getByText("상담 필요", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "경계학생" })
      .getByText("상담 필요 없음", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "상담없는학생" })
      .getByText("상담 필요 없음", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "1관", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(
    page.locator("tbody").getByText("상담 필요", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody tr td").nth(2)).toHaveText("0회");
  await page.getByRole("button", { name: "2관", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.getByRole("link", { name: "주기초과학생" }).click();
  await expect(page).toHaveURL(
    /\/counseling\/students\/11111111-1111-4111-8111-111111111111$/,
  );
  await expect(page.locator("thead th")).toHaveText(["날짜", "보기", "삭제"]);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "주기초과학생 상담일지" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "상담일지 작성" }).click();
  await expect(page).toHaveURL(
    /\/counseling\/students\/11111111-1111-4111-8111-111111111111\/new$/,
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "상담일지 작성", exact: true }),
  ).toBeVisible();
  const dialog = page.getByRole("form", { name: "상담일지 작성" });
  await expect(dialog.getByLabel("상담자", { exact: true })).toHaveValue(
    "홀로서기",
  );
  await expect(dialog.getByLabel("상담자", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(dialog.getByLabel("날짜", { exact: true })).toHaveAttribute(
    "max",
    "2026-09-12",
  );
  await dialog
    .getByLabel("내용", { exact: true })
    .fill("수학 학습 계획\n다음 주 진행 확인");
  await dialog.getByLabel("특이사항", { exact: true }).fill("교재 준비");
  await dialog.getByRole("button", { name: "상담일지 저장" }).first().click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(
    /\/counseling\/students\/11111111-1111-4111-8111-111111111111$/,
  );
  await page
    .locator("tbody tr")
    .first()
    .getByRole("button", { name: "보기" })
    .click();
  const journalDialog = page.getByRole("dialog");
  await expect(
    journalDialog.getByRole("heading", { name: "상담내역" }),
  ).toBeVisible();
  await expect(journalDialog.getByLabel("내용", { exact: true })).toHaveValue(
    "수학 학습 계획\n다음 주 진행 확인",
  );
  await expect(
    journalDialog.getByLabel("특이사항", { exact: true }),
  ).toHaveValue("교재 준비");
  await journalDialog.getByRole("button", { name: "수정" }).click();
  await journalDialog
    .getByLabel("내용", { exact: true })
    .fill("수학 학습 계획 수정");
  await journalDialog.getByRole("button", { name: "수정 저장" }).click();
  await expect(journalDialog.getByLabel("내용", { exact: true })).toHaveValue(
    "수학 학습 계획 수정",
  );
  await page.goto("/counseling");
  await expect(page).toHaveURL(/\/counseling$/);
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "주기초과학생" })
      .getByText("상담 필요 없음", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "주기초과학생" })
      .locator("td")
      .nth(2),
  ).toHaveText("2회");
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "주기초과학생 상담일지" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.goto("/counseling/students/55555555-5555-4555-8555-555555555555");
  await expect(page.getByRole("status")).toContainText(
    "학생을 찾을 수 없습니다",
  );
});
