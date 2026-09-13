import { test, expect } from '@playwright/test'

test('모바일 메뉴 및 실명 프로필 표시', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: '메뉴 열기' }).click()
  await page.getByRole('button', { name: '환경 설정', exact: true }).click()
  await expect(page.getByRole('heading', { name: '내 프로필' })).toBeVisible()
  await expect(page.getByLabel('이름 (실명)', { exact: true })).toHaveValue('홀로서기')
  await expect(page.getByLabel('이름 (실명)', { exact: true })).toHaveAttribute('readonly', '')
  await page.reload()
  await expect(page.getByRole('region', { name: '상담 필요한 학생', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
