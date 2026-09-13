import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
export const supabaseConfigured = Boolean(url || key)
export let supabaseConfigError = ''
if (supabaseConfigured && (!url || !key)) supabaseConfigError = 'Supabase URL과 Publishable key를 모두 설정해 주세요.'
if (url) { try { const parsed = new URL(url); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error() } catch { supabaseConfigError = 'Supabase URL 형식을 확인해 주세요.' } }
if (key?.startsWith('sb_secret_')) supabaseConfigError = 'Secret key는 사용할 수 없습니다. Publishable key를 입력해 주세요.'
if (key?.startsWith('eyJ')) {
  try { const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); if (payload.role !== 'anon') supabaseConfigError = '브라우저에는 anon 또는 Publishable key만 사용하세요.' } catch { supabaseConfigError = '올바른 Publishable key 또는 anon key를 입력해 주세요.' }
}
export const supabase = url && key && !supabaseConfigError ? createClient(url, key) : null
