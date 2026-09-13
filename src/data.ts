export type Counsel = { id: string; name: string; grade: string; type: string; date: string; time: string; status: '예정' | '완료' | '대기'; memo: string }
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
export const initialCounsels: Counsel[] = [
  { id: '1', name: '김민준', grade: '중학교 2학년', type: '학습 상담', date: localDate(), time: '14:00', status: '예정', memo: '2학기 학습 방향과 수학 학습 습관을 함께 이야기해요.' },
  { id: '2', name: '이서연', grade: '고등학교 1학년', type: '학부모 상담', date: localDate(), time: '15:00', status: '예정', memo: '중간고사 준비 상황과 학습 계획 안내' },
  { id: '3', name: '박지호', grade: '중학교 3학년', type: '신규 상담', date: localDate(), time: '16:30', status: '대기', memo: '신규 입학 상담 및 레벨 테스트 안내' },
  { id: '4', name: '최하은', grade: '초등학교 6학년', type: '학습 상담', date: localDate(), time: '11:00', status: '완료', memo: '중등 수학 선행 학습 계획 수립' },
  { id: '5', name: '정도윤', grade: '고등학교 2학년', type: '학부모 상담', date: localDate(), time: '10:00', status: '완료', memo: '학습 진행 상황 공유' },
]
export function loadCounsels(): Counsel[] {
  try { const data: unknown = JSON.parse(localStorage.getItem('holoseogi-counsels') ?? 'null'); if (Array.isArray(data) && data.every(v => v && ['id','name','grade','type','date','time','memo'].every(k=> typeof v[k] === 'string') && ['예정','완료','대기'].includes(v.status))) return data } catch { /* Use demo records if storage is unavailable. */ }
  return initialCounsels
}
