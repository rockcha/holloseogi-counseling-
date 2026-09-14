import { test, expect } from '@playwright/test';

test('사이드바 그룹을 개별로 접고 펼치며 새로고침 후 상태를 유지한다', async ({ page }) => {
  await page.goto('/todos');
  for (const title of ['WORKSPACE', 'COMMUNITY', 'PERSONAL', 'CONTROL CENTER']) {
    const toggle = page.getByRole('button', { name: `${title} 접기`, exact: true });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(page.getByRole('navigation', { name: title, exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole('heading', { name: '할 일', exact: true, level: 1 })).toBeVisible();
  await page.reload();
  for (const title of ['WORKSPACE', 'COMMUNITY', 'PERSONAL', 'CONTROL CENTER']) {
    await expect(page.getByRole('button', { name: `${title} 펼치기`, exact: true })).toHaveAttribute('aria-expanded', 'false');
  }
  const personal = page.getByRole('button', { name: 'PERSONAL 펼치기', exact: true });
  await personal.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: '메모장', exact: true }).click();
  await expect(page).toHaveURL(/\/memo$/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'PERSONAL 접기', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'WORKSPACE 펼치기', exact: true })).toHaveAttribute('aria-expanded', 'false');
});

test('로컬 저장소를 사용할 수 없어도 그룹을 접고 펼친다', async ({ page }) => {
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function(key) {
      if (key.startsWith('holoseogi-sidebar-expanded-')) throw new Error('Unavailable');
      return get.call(this, key);
    };
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith('holoseogi-sidebar-expanded-')) throw new Error('Unavailable');
      set.call(this, key, value);
    };
  });
  await page.goto('/todos');
  await page.getByRole('button', { name: 'PERSONAL 접기', exact: true }).click();
  await page.getByRole('button', { name: 'PERSONAL 펼치기', exact: true }).click();
  await expect(page.getByRole('button', { name: '할 일', exact: true })).toBeVisible();
});
