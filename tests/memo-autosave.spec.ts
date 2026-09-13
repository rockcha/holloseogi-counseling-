import { test, expect } from '@playwright/test';

test('메모 자동 저장, 바깥 클릭 닫기, 상단 이모지와 벨 호버', async ({ page }) => {
  await page.goto('/');
  const launcher = page.getByRole('button', { name: '내 메모 열기' });
  await launcher.click();
  const memo = page.getByRole('region', { name: '내 메모', exact: true });
  const input = page.getByRole('textbox', { name: '메모 내용' });
  await expect(input).toBeEditable();
  await expect(memo.getByRole('button', { name: '저장', exact: true })).toHaveCount(0);
  await expect(memo).not.toContainText('나만 볼 수 있는 작은 기록');
  await input.fill('자동 저장 확인');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('holoseogi-demo-memo'))).toBe('자동 저장 확인');
  await memo.getByRole('button', { name: '이모지 추가', exact: true }).click();
  const emoji = memo.getByRole('button', { name: '😊 추가', exact: true });
  expect((await emoji.boundingBox())!.y).toBeLessThan((await input.boundingBox())!.y);
  await emoji.click();
  await input.fill('닫기 직전 변경');
  await page.getByRole('button', { name: '알림', exact: true }).click();
  await expect(memo).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('holoseogi-demo-memo'))).toBe('닫기 직전 변경');
  await page.reload();
  await launcher.click();
  await expect(input).toHaveValue('닫기 직전 변경');
  const bell = page.getByRole('button', { name: '알림', exact: true });
  await bell.hover();
  await expect(bell).toHaveCSS('background-color', 'rgb(234, 240, 247)');
});
