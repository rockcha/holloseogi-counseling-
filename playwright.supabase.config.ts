import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/supabase',
  use: { baseURL: 'http://127.0.0.1:5175', channel: 'msedge', headless: true },
  webServer: {
    command: 'npm.cmd run dev -- --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    env: { VITE_SUPABASE_URL: 'https://counsel-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only' },
  },
})
