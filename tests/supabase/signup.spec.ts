import { test, expect } from '@playwright/test'

const id='11111111-1111-4111-8111-111111111111'
const user={id,email:'new@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{name:'김선생',is_teacher:true},created_at:new Date().toISOString()}
const session={access_token:'test-token',refresh_token:'refresh',expires_in:3600,token_type:'bearer',user}

test('회원가입 기본 화면, 비밀번호 확인, 실명 전송 및 이메일 안내',async({page})=>{
  let payload: Record<string,unknown> | null=null
  await page.route('https://counsel-test.supabase.co/auth/v1/signup',async route=>{
    payload=route.request().postDataJSON()
    await route.fulfill({json:user})
  })
  await page.goto('/')
  await page.getByRole('button',{name:'회원가입',exact:true}).click()
  await expect(page.getByRole('heading',{name:'회원가입',exact:true})).toBeVisible()
  await page.getByLabel('이름 (실명)',{exact:true}).fill('김선생')
  await page.getByLabel('이메일',{exact:true}).fill('new@example.com')
  await page.getByLabel('비밀번호',{exact:true}).fill('password123')
  await page.getByLabel('비밀번호 확인',{exact:true}).fill('different123')
  await page.getByRole('button',{name:'회원가입',exact:true}).click()
  await expect(page.getByRole('alert')).toContainText('비밀번호가 일치하지 않습니다')
  expect(payload).toBeNull()
  await page.getByLabel('비밀번호 확인',{exact:true}).fill('password123')
  await page.getByRole('button',{name:'회원가입',exact:true}).click()
  await expect(page.getByRole('status')).toContainText('이메일')
  await expect(page.getByRole('heading',{name:'인증 이메일을 보냈어요'})).toBeVisible()
  await expect(page.getByRole('status')).toContainText('new@example.com')
  expect(payload).toMatchObject({email:'new@example.com',data:{name:'김선생'}})
  expect((payload as unknown as {data:object}).data).not.toHaveProperty('is_teacher')
})

test('미승인 차단, 관리자 승인 후 접근 및 승인 철회',async({page})=>{
  let approved=false
  let counselRequests=0
  await page.route('https://counsel-test.supabase.co/**',async route=>{
    const url=route.request().url()
    if(url.includes('/auth/v1/token'))return route.fulfill({json:session})
    if(url.includes('/rest/v1/profiles'))return route.fulfill({json:{id,name:'김선생',is_teacher:approved}})
    if(url.includes('/rest/v1/counsels')){counselRequests++;return route.fulfill({json:[]})}
    return route.fulfill({json:[]})
  })
  await page.goto('/')
  await page.getByRole('button',{name:'로그인',exact:true}).click()
  await page.getByLabel('이메일',{exact:true}).fill('new@example.com')
  await page.getByLabel('비밀번호',{exact:true}).fill('password123')
  await page.getByRole('button',{name:'로그인',exact:true}).click()
  await expect(page.getByRole('heading',{name:'관리자 승인을 기다리고 있어요'})).toBeVisible()
  expect(counselRequests).toBe(0)
  await expect(page.getByRole('button',{name:'새 상담 등록'})).toHaveCount(0)
  approved=true
  await page.getByRole('button',{name:'승인 상태 다시 확인'}).click()
  await expect(page.getByRole('heading',{name:'상담 필요한 학생'})).toBeVisible()
  approved=false
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('heading',{name:'관리자 승인을 기다리고 있어요'})).toBeVisible()
})

test('프로필 조회 오류가 나면 상담 기능을 열지 않음',async({page})=>{
  await page.route('https://counsel-test.supabase.co/**',route=>route.fulfill(route.request().url().includes('/auth/v1/token')?{json:session}:{status:500,json:{message:'Database error'}}))
  await page.goto('/')
  await page.getByRole('button',{name:'로그인',exact:true}).click()
  await page.getByLabel('이메일',{exact:true}).fill('new@example.com')
  await page.getByLabel('비밀번호',{exact:true}).fill('password123')
  await page.getByRole('button',{name:'로그인',exact:true}).click()
  await expect(page.getByRole('heading',{name:'회원 정보 확인이 필요해요'})).toBeVisible()
  await expect(page.getByRole('button',{name:'새 상담 등록'})).toHaveCount(0)
})
