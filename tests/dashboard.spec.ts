import { test, expect } from "@playwright/test";

test("상담 필요 목록의 좌석순, 주기별 지연순, 내부 스크롤과 가로 배치", async ({
  page,
}) => {
  await page.clock.install({ time: new Date(2026, 8, 12, 12) });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    const students = Array.from({ length: 15 }, (_, i) => ({
      id: `student-${i}`,
      name: `학생${i}`,
      building: (i % 2) + 1,
      seat_number: `M${i + 1}`,
      counseling_cycle_weeks: i === 0 ? 4 : 1,
      gender: null,
      phone: null,
      student_status: null,
    }));
    localStorage.setItem("holoseogi-students", JSON.stringify(students));
    localStorage.setItem(
      "holoseogi-counseling-journals",
      JSON.stringify([
        { id: "j1", student_id: "student-0", date: "2026-08-01" },
        { id: "j2", student_id: "student-1", date: "2026-08-10" },
      ]),
    );
  });
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "상담 필요한 학생",
    exact: true,
  });
  const list = page.getByRole("region", {
    name: "상담 필요한 학생 목록",
    exact: true,
  });
  await expect(list.getByRole("link")).toHaveCount(15);
  await expect(list.getByRole("link").first()).toContainText("M1");
  await section.getByRole("button", { name: "오래된 순" }).click();
  await expect(list.getByRole("link").nth(0)).toContainText("M2");
  await expect(list.getByRole("link").nth(1)).toContainText("M1");
  await expect(list.getByRole("link").nth(2)).toContainText("M3");
  await expect(list).not.toContainText("1관");
  expect(
    await list.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  const boxes = await Promise.all(
    ["상담 필요한 학생", "오늘 상담한 학생", "상담 예정"].map((name) =>
      page.getByRole("region", { name, exact: true }).boundingBox(),
    ),
  );
  expect(boxes[0]!.y).toBe(boxes[1]!.y);
  expect(boxes[1]!.y).toBe(boxes[2]!.y);
  for (const box of boxes) expect(box!.height).toBe(560);
  expect(boxes[0]!.width).toBeLessThan(boxes[1]!.width);
  await section.getByRole("button", { name: "좌석순", exact: true }).click();
  await expect(list.getByRole("link").first()).toContainText("M1");
  await page.setViewportSize({ width: 390, height: 844 });
  const buildingFilter = page.getByRole("group", { name: "공통 관 선택" });
  await expect(buildingFilter).toBeVisible();
  const filterBox = await buildingFilter.boundingBox();
  expect(filterBox!.x + filterBox!.width).toBeGreaterThan(350);
  expect(filterBox!.y).toBeGreaterThan(740);
  await buildingFilter
    .getByRole("button", { name: "1관", exact: true })
    .click();
  await expect(
    buildingFilter.getByRole("button", { name: "1관", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("대시보드 예정 추가, 학생 기록 이동, 오늘 상담 자동 집계 및 중복 제거", async ({
  page,
}) => {
  await page.clock.install({ time: new Date(2026, 8, 12, 12) });
  await page.addInitScript(() => {
    if (localStorage.getItem("dashboard-seeded")) return;
    localStorage.setItem("dashboard-seeded", "1");
    const base = {
      gender: null,
      student_status: null,
      phone: null,
      counseling_cycle_weeks: 1,
    };
    localStorage.setItem(
      "holoseogi-students",
      JSON.stringify([
        {
          ...base,
          id: "11111111-1111-4111-8111-111111111111",
          name: "상담학생",
          building: 2,
          seat_number: "W01",
        },
        {
          ...base,
          id: "22222222-2222-4222-8222-222222222222",
          name: "제외학생",
          building: 1,
          seat_number: "M13",
          counseling_cycle_weeks: 0,
        },
      ]),
    );
  });
  await page.goto("/");
  const needed = page.getByRole("region", {
    name: "상담 필요한 학생",
    exact: true,
  });
  const done = page.getByRole("region", {
    name: "오늘 상담한 학생",
    exact: true,
  });
  const planned = page.getByRole("region", { name: "상담 예정", exact: true });
  await expect(needed.getByRole("link")).toHaveCount(1);
  await expect(done.getByRole("link")).toHaveCount(0);
  await page.getByRole("button", { name: "상담할 학생 추가" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.locator('input[type="date"], input[type="time"], textarea'),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "M13 제외학생" }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "W01 상담학생" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "상담할 학생 추가" }),
  ).toBeDisabled();
  await expect(planned.getByRole("link")).toHaveCount(1);
  await page.reload();
  await expect(planned.getByRole("link")).toHaveCount(1);
  await expect(planned).not.toContainText("00:00");
  await planned.getByRole("link").click();
  await expect(page).toHaveURL(
    /\/counseling\/students\/11111111-1111-4111-8111-111111111111$/,
  );
  for (const content of ["첫 번째 상담", "추가 상담"]) {
    await page.getByRole("button", { name: "상담일지 작성" }).click();
    await page.getByLabel("내용", { exact: true }).fill(content);
    if (content === "첫 번째 상담") {
      await page
        .getByRole("checkbox", { name: "부모님 문자 전송 완료" })
        .check();
    }
    await page.getByRole("button", { name: "상담일지 저장" }).first().click();
    await expect(page.getByRole("form", { name: "상담일지 작성" })).toHaveCount(
      0,
    );
  }
  await page.getByRole("button", { name: "대시보드", exact: true }).click();
  await expect(done.getByRole("link")).toHaveCount(1);
  await expect(needed.getByRole("link")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "상담할 학생 추가" }),
  ).toBeDisabled();
  await expect(planned.getByRole("link")).toHaveCount(0);
  await page.getByRole("button", { name: "1관", exact: true }).click();
  await expect(done.getByRole("link")).toHaveCount(0);
  await page.getByRole("button", { name: "2관", exact: true }).click();
  await expect(done.getByRole("link")).toHaveCount(1);
  await page.getByRole("button", { name: "학생 관리", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "상담학생 학생 수정" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "제외학생 학생 수정" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "상담 관리", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "상담학생", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "제외학생", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "전체", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "제외학생", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "2관", exact: true }).click();
  await page.getByRole("button", { name: "대시보드", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "2관", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(done.getByRole("link")).toHaveCount(1);
  await expect(done).toContainText("1/1");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
