import { test, expect } from '@playwright/test';

test('우측 상단 아이콘에 검정 툴팁을 표시하고 클릭 기능을 유지한다', async ({ page }) => {
  await page.goto('/todos');
  for (const [name, label] of [['현재 위치 날씨', '날씨'], ['내 할 일 열기', '할 일'], ['내 메모 열기', '메모'], ['알림', '알림']]) {
    await page.getByRole('button', { name, exact: true }).hover();
    await expect(page.getByRole('tooltip')).toHaveText(label);
    await expect(page.locator('[data-slot="tooltip-content"]')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    await page.mouse.move(0, 0);
    await expect(page.getByRole('tooltip')).toHaveCount(0);
  }
  await page.getByRole('button', { name: '내 할 일 열기' }).click();
  await expect(page.getByRole('dialog', { name: '할 일', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '내 메모 열기' }).click();
  await expect(page.getByRole('textbox', { name: '메모 내용' })).toBeVisible();
});

test('날씨에 도시명과 아이콘 옆 상태를 표시하고 불필요한 안내를 제거한다', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 37.26, longitude: 127.03 });
  let cityFails = false;
  await page.route('https://api.bigdatacloud.net/**', route => cityFails
    ? route.fulfill({ status: 500, json: {} })
    : route.fulfill({ json: { city: '수원시', principalSubdivision: '경기도' } }));
  await page.route('https://api.open-meteo.com/**', route => {
    expect(route.request().url()).not.toContain('apparent_temperature');
    return route.fulfill({ json: { current: { time: '2026-09-14T12:00', temperature_2m: 24, relative_humidity_2m: 65, precipitation: 0, weather_code: 2, wind_speed_10m: 2 } } });
  });
  await page.route('https://air-quality-api.open-meteo.com/**', route => route.fulfill({ json: { current: { time: '2026-09-14T12:00', us_aqi: 40 } } }));
  await page.goto('/todos');
  await page.getByRole('button', { name: '현재 위치 날씨' }).click();
  const modal = page.getByRole('dialog', { name: '오늘의 날씨' });
  await expect(modal).toContainText('경기도 · 수원시');
  await expect(modal).toContainText('24°');
  const condition = modal.getByText('구름 조금', { exact: true });
  await expect(condition.locator('..').locator('svg')).toBeVisible();
  await expect(modal).not.toContainText('체감');
  await expect(modal).not.toContainText('기준');
  await expect(modal).toContainText('좋음');
  cityFails = true;
  await modal.getByRole('button', { name: '새로고침' }).click();
  await expect(modal).toContainText('도시명을 확인하지 못했습니다');
  await expect(modal).toContainText('24°');
  await expect(modal).not.toContainText('도시 확인 중');
});
