import { test, expect } from '@playwright/test'

test('로그인 후 서버 조회·등록, 저장 실패 시 입력 유지', async ({ page }) => {
  const records: Record<string, unknown>[] = []
  let failSave = false
  await page.route('https://counsel-test.supabase.co/**', async route => {
    const request = route.request()
    if (request.url().includes('/rest/v1/profiles')) return route.fulfill({json:{id:'11111111-1111-4111-8111-111111111111',name:'선생님',is_teacher:true}})
    if (request.url().includes('/auth/v1/token')) return route.fulfill({json:{access_token:'test-token',refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user:{id:'11111111-1111-4111-8111-111111111111',email:'teacher@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}}})
    if (request.url().includes('/rest/v1/students')) {
      if(request.method()==='GET') return route.fulfill({json:records})
      if(request.method()==='POST') {
        if(failSave) return route.fulfill({status:403,json:{message:'Permission denied',code:'42501'}})
        const record=request.postDataJSON(); records.push(record)
        return route.fulfill({status:201,json:record})
      }
    }
    return route.fulfill({json:[]})
  })
  await page.goto('/')
  await page.getByRole('button',{name:'로그인',exact:true}).click()
  await page.getByLabel('이메일', {exact:true}).fill('teacher@example.com')
  await page.getByLabel('비밀번호', {exact:true}).fill('test-password')
  await page.getByRole('button',{name:'로그인',exact:true}).click()
  await page.getByRole('button',{name:'학생 관리',exact:true}).click()
  await page.getByRole('button',{name:'학생 추가',exact:true}).click()
  await page.getByLabel('이름',{exact:true}).fill('서버학생')
  await page.getByLabel('좌석번호').fill('M01')
  await page.getByRole('button',{name:'저장',exact:true}).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('tbody')).toContainText('서버학생')
  expect(records).toHaveLength(1)
  expect(await page.evaluate(()=>localStorage.getItem('holoseogi-students'))).toBeNull()
  failSave=true
  await page.getByRole('button',{name:'학생 추가',exact:true}).click()
  await page.getByLabel('이름',{exact:true}).fill('저장실패학생')
  await page.getByLabel('좌석번호').fill('M02')
  await page.getByRole('button',{name:'저장',exact:true}).click()
  await expect(page.getByRole('button',{name:'저장',exact:true})).toBeEnabled()
  await expect(page.getByLabel('이름',{exact:true})).toHaveValue('저장실패학생')
  expect(records).toHaveLength(1)
})
