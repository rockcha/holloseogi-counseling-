import { test, expect } from '@playwright/test';

test('상담 필요 학생은 학년과 좌석을 함께 필터링한다', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('holoseogi-students', JSON.stringify([
      { id: 'grade-1', name: '일학년학생', seat_number: 'M1', grade: '고1' },
      { id: 'grade-2', name: '이학년남학생', seat_number: 'M2', grade: '고2' },
      { id: 'grade-3', name: '이학년여학생', seat_number: 'W1', grade: '고2' },
      { id: 'grade-4', name: '미설정학생', seat_number: 'W2', grade: null },
      { id: 'grade-5', name: '재수학생', seat_number: 'M3', grade: 'n수' },
    ].map(student => ({ ...student, building: 1, counseling_cycle_weeks: 1 }))));
    localStorage.setItem('holoseogi-counseling-journals', '[]');
  });
  await page.goto('/');
  const list = page.getByRole('region', { name: '상담 필요한 학생 목록', exact: true });
  const grade = page.getByRole('combobox', { name: '상담 필요한 학생 학년 필터' });
  const seats = page.getByRole('group', { name: '상담 필요한 학생 좌석 필터' });
  await expect(list.getByRole('button', { name: /상담 상세 보기$/ })).toHaveCount(5);
  await grade.click();
  await page.getByRole('option', { name: '고2', exact: true }).click();
  await expect(list.getByRole('button', { name: /상담 상세 보기$/ })).toHaveCount(2);
  await seats.getByRole('button', { name: 'W', exact: true }).click();
  await expect(list.getByRole('button', { name: /상담 상세 보기$/ })).toHaveCount(1);
  await expect(list).toContainText('이학년여학생');
  await grade.click();
  await page.getByRole('option', { name: '고1', exact: true }).click();
  await expect(list).toContainText('선택한 조건에 해당하는 학생이 없습니다.');
  await grade.click();
  await page.getByRole('option', { name: '학년 미설정', exact: true }).click();
  await expect(list.getByRole('button', { name: /상담 상세 보기$/ })).toHaveCount(1);
  await expect(list).toContainText('미설정학생');
  await seats.getByRole('button', { name: '전체', exact: true }).click();
  await grade.click();
  await page.getByRole('option', { name: 'N수', exact: true }).click();
  await expect(list).toContainText('재수학생');
  await expect(list.getByRole('button', { name: /상담 상세 보기$/ })).toHaveCount(1);
  await grade.click();
  await page.getByRole('option', { name: '전체 학년', exact: true }).click();
  await expect(list.getByRole('button', { name: /상담 상세 보기$/ })).toHaveCount(5);
});

test('상담실의 세 칸은 같은 너비이고 모바일에서는 세로로 배치된다', async ({ page }) => {
  await page.goto('/');
  const columns = page.locator('.dashboard-columns > *');
  await expect(columns).toHaveCount(3);
  for (const width of [1280, 1440, 1920, 800, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const boxes = await columns.evaluateAll(nodes => nodes.map(node => {
      const { x, y, width, bottom } = node.getBoundingClientRect();
      return { x, y, width, bottom };
    }));
    for (const box of boxes) expect(Math.abs(box.width - boxes[0].width)).toBeLessThan(1);
    if (width < 900) {
      expect(boxes[1].y).toBeGreaterThanOrEqual(boxes[0].bottom);
      expect(boxes[2].y).toBeGreaterThanOrEqual(boxes[1].bottom);
    } else {
      expect(boxes[1].y).toBe(boxes[0].y);
      expect(boxes[2].y).toBe(boxes[0].y);
      expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
      expect(boxes[2].x).toBeGreaterThan(boxes[1].x);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test('이전 할 일 주소에서 상담실을 표시하고 개인 할 일 요청을 보내지 않는다', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('personal_todos')) requests.push(request.url());
  });
  await page.goto('/todos');
  await expect(page.getByRole('heading', { name: '내 상담실', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '할 일', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '내 할 일 열기', exact: true })).toHaveCount(0);
  expect(requests).toEqual([]);
});
