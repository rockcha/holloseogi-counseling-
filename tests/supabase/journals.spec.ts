import { test, expect } from '@playwright/test'

test('학생별 일지 API 조회 실패 재시도 및 저장 실패 후 재저장', async ({ page }) => {
  const id = '11111111-1111-4111-8111-111111111111'
  let readFail = true
  let writeFail = true
  let saved: Record<string, unknown> | null = null
  await page.route('https://counsel-test.supabase.co/**', async route => {
    const request = route.request(), url = request.url()
    if (url.includes('/auth/v1/token')) return route.fulfill({ json: { access_token: 'test-token', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user: { id, email: 'teacher@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } } })
    if (url.includes('/rest/v1/profiles')) return route.fulfill({ json: { id, name: '김선생', is_teacher: true } })
    if (url.includes('/rest/v1/students')) return route.fulfill({ json: [{ id, name: '김학생', building: 2, seat_number: 'W01', gender: null, student_status: '재학생', phone: null, counseling_cycle_weeks: 1 }] })
    if (url.includes('/rest/v1/student_latest_counsels')) return readFail ? route.fulfill({ status: 403, json: { message: 'Denied' } }) : route.fulfill({ json: [] })
    if (url.includes('/rest/v1/counseling_journals')) {
      if (request.method() === 'GET') return route.fulfill({ json: [] })
      if (writeFail) return route.fulfill({ status: 403, json: { message: 'Denied' } })
      saved = request.postDataJSON()
      return route.fulfill({ json: { ...saved, id: crypto.randomUUID(), counselor_name: '김선생', created_at: new Date().toISOString() } })
    }
    return route.fulfill({ json: [] })
  })
  await page.goto(`/counseling/students/${id}`)
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await page.getByLabel('이메일', { exact: true }).fill('teacher@example.com')
  await page.getByLabel('비밀번호', { exact: true }).fill('password123')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('상담 정보를 불러오지 못했습니다')
  readFail = false
  await page.getByRole('button', { name: '다시 불러오기' }).click()
  await page.getByRole('button', { name: '상담일지 작성' }).click()
  const dialog = page.getByRole('form', { name: '상담일지 작성' })
  await expect(dialog.getByLabel('상담자', { exact: true })).toHaveValue('김선생')
  await dialog.getByLabel('내용', { exact: true }).fill('학습 계획을 확인했습니다.')
  await dialog.getByRole('button', { name: '상담일지 저장' }).first().click()
  await expect(dialog.getByRole('alert')).toContainText('저장하지 못했습니다')
  await expect(dialog.getByLabel('내용', { exact: true })).toHaveValue('학습 계획을 확인했습니다.')
  writeFail = false
  await dialog.getByRole('button', { name: '상담일지 저장' }).first().click()
  await expect(dialog).toHaveCount(0)
  expect(saved).toMatchObject({ student_id: id, content: '학습 계획을 확인했습니다.', special_notes: '' })
  expect(saved).not.toHaveProperty('counselor_name')
  await expect(page.locator('tbody')).toContainText('김선생')
  await page.screenshot({ path: 'test-results/counseling-journal-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
