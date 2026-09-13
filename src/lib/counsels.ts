import type { Counsel } from '@/data'
import { supabase } from './supabase'

export async function fetchCounsels(): Promise<Counsel[]> {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.')
  const { data, error } = await supabase.from('counsels').select('id,name,grade,type,date,time,status,memo').order('date', { ascending: false }).order('time')
  if (error) throw error
  return (data ?? []).map(row=>({...row, time: row.time.slice(0,5)})) as Counsel[]
}
export async function persistCounsel(record: Counsel, editing: boolean): Promise<Counsel> {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.')
  const query = editing ? supabase.from('counsels').update(record).eq('id', record.id) : supabase.from('counsels').insert(record)
  const { data, error } = await query.select('id,name,grade,type,date,time,status,memo').single()
  if (error) throw error
  return { ...data, time: data.time.slice(0,5) } as Counsel
}
