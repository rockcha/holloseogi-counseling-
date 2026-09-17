import { test, expect } from "@playwright/test";

test("학생 추가, 좌석 중복 확인, 수정, 새로고침 유지 및 삭제", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "학생 관리", exact: true }).click();
  await expect(page.getByRole("button", { name: "새 상담 등록" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "학생 추가", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("combobox", { name: "상담주기", exact: true }),
  ).toContainText("1주");
  await dialog.getByLabel("이름", { exact: true }).fill("테스트학생");
  await dialog.getByRole("combobox", { name: "관", exact: true }).click();
  await page.getByRole("option", { name: "2관" }).click();
  await dialog.getByLabel("좌석번호").fill("w01");
  await dialog.getByRole("combobox", { name: "구분", exact: true }).click();
  await page.getByRole("option", { name: "재학생", exact: true }).click();
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("W01");
  await expect(page.locator("thead th")).toHaveText([
    "좌석번호",
    "이름",
    "구분",
    "학교",
    "선택과목",
    "특이사항",
    "전화번호",
  ]);
  await expect(page.locator("tbody tr")).toContainText("재학생");
  await expect(page.locator("tbody tr td").last()).toHaveText("-");
  await page.getByRole("button", { name: "학생 추가", exact: true }).click();
  await dialog.getByLabel("이름", { exact: true }).fill("중복학생");
  await dialog.getByRole("combobox", { name: "관", exact: true }).click();
  await page.getByRole("option", { name: "2관" }).click();
  await dialog.getByLabel("좌석번호").fill("W01");
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("이미 사용 중인 좌석");
  await dialog.getByRole("button", { name: "취소", exact: true }).click();
  await page.locator("tbody tr").click();
  await expect(
    dialog.getByRole("combobox", { name: "구분", exact: true }),
  ).toContainText("재학생");
  await dialog.getByRole("combobox", { name: "구분", exact: true }).click();
  await page.getByRole("option", { name: "재수생", exact: true }).click();
  await dialog.getByRole("combobox", { name: "남녀" }).click();
  await page.getByRole("option", { name: "여", exact: true }).click();
  await dialog.getByRole("combobox", { name: "상담주기", exact: true }).click();
  await expect(page.getByRole("option")).toHaveText([
    "상담 없음",
    "1주",
    "2주",
    "3주",
    "4주",
  ]);
  await page.getByRole("option", { name: "상담 없음", exact: true }).click();
  await dialog.getByLabel("전화번호").fill("010-1234-5678");
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "학생 관리", exact: true }).click();
  await page.getByLabel("학생 검색").fill("w01");
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await page.getByLabel("학생 검색").fill("테스트학생");
  await expect(page.locator("tbody tr")).toContainText("010-1234-5678");
  await expect(page.locator("tbody tr")).toContainText("재수생");
  await page.getByRole("button", { name: "테스트학생 학생 수정" }).click();
  await expect(
    dialog.getByRole("combobox", { name: "상담주기", exact: true }),
  ).toContainText("상담 없음");
  await dialog.getByRole("combobox", { name: "상담주기", exact: true }).click();
  await page.getByRole("option", { name: "2주", exact: true }).click();
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "테스트학생 학생 수정" }).click();
  await expect(
    dialog.getByRole("combobox", { name: "상담주기", exact: true }),
  ).toContainText("2주");
  await expect(dialog.getByRole("combobox", { name: "남녀" })).toContainText(
    "여",
  );
  await dialog.getByRole("button", { name: "학생 삭제" }).click();
  const alert = page.getByRole("alertdialog");
  await expect(alert.getByRole("heading")).toHaveText("삭제하시겠습니까?");
  await expect(
    alert.getByRole("button", { name: "취소", exact: true }),
  ).toBeFocused();
  await alert.getByRole("button", { name: "취소", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await dialog.getByRole("button", { name: "학생 삭제" }).click();
  await alert.getByRole("button", { name: "삭제", exact: true }).click();
  await expect(alert).toHaveCount(0);
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "학생 관리", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(0);
});

test("1관 배치도는 사진 기준 M01부터 M38까지 표시한다", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("holoseogi-building", "1");
    localStorage.setItem(
      "holoseogi-students",
      JSON.stringify([
        {
          id: "building-one-student",
          name: "1관 학생",
          building: 1,
          seat_number: "M01",
          counseling_cycle_weeks: 1,
        },
      ]),
    );
  });
  await page.goto("/students/seating");

  await expect(
    page.getByRole("region", { name: "1호실 좌석 배치도" }),
  ).toBeVisible();
  await expect(page.getByText("전체 38석", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: /^M01 / })).toContainText(
    "1관 학생",
  );
  await expect(page.getByRole("button", { name: /^M38 / })).toBeVisible();
  await page.getByRole("combobox", { name: "자습실 선택" }).selectOption("2");
  await expect(
    page.getByRole("region", { name: "2호 좌석 배치도" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^W01 / })).toBeVisible();
  await expect(page.getByRole("button", { name: /^W39 / })).toBeVisible();
});
