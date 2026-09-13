import { test, expect } from '@playwright/test'

test('전달 내용 서버 저장 실패 시 입력 유지, 작성자는 서버에서 결정', async ({ page }) => {
  const id = '11111111-1111-4111-8111-111111111111'
  let fail = true
  let posted: Record<string, unknown> | null = null
  const rows: Record<string, unknown>[] = []
  await page.route('https://counsel-test.supabase.co/**', async route => {
    const request = route.request(), url = request.url()
    if (url.includes('/auth/v1/token')) return route.fulfill({ json: { access_token: 'test-token', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user: { id, email: 'teacher@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } } })
    if (url.includes('/rest/v1/profiles')) return route.fulfill({ json: { id, name: '김선생', is_teacher: true } })
    if (url.includes('/rest/v1/announcements')) {
      if (request.method() === 'GET') return route.fulfill({ json: rows })
      if (fail) return route.fulfill({ status: 403, json: { message: 'Denied' } })
      posted = request.postDataJSON()
      const row = { ...posted, id: 'saved-notice', author_id: id, author_name: '김선생', created_at: new Date().toISOString() }
      rows.push(row)
      return route.fulfill({ json: row })
    }
    return route.fulfill({ json: [] })
  })
  await page.goto('/community/announcements')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await page.getByLabel('이메일', { exact: true }).fill('teacher@example.com')
  await page.getByLabel('비밀번호', { exact: true }).fill('password123')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await page.getByRole('button', { name: '전달 내용 추가', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: '2관', exact: true }).click()
  await dialog.getByLabel('제목', { exact: true }).fill('서버 전달')
  await dialog.getByLabel('내용', { exact: true }).fill('저장할 내용')
  await dialog.getByRole('button', { name: '등록', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('등록하지 못했습니다')
  await expect(dialog.getByLabel('내용', { exact: true })).toHaveValue('저장할 내용')
  fail = false
  await dialog.getByRole('button', { name: '등록', exact: true }).click()
  await expect(dialog.getByRole('heading')).toHaveText('서버 전달')
  expect(posted).toEqual({ title: '서버 전달', content: '저장할 내용', building: 2 })
  expect(await page.evaluate(() => localStorage.getItem('holoseogi-announcements'))).toBeNull()
})
