import { defineConfig } from '@playwright/test'
import config from './playwright.config'
export default defineConfig({ ...config, use: { ...config.use, baseURL: 'http://127.0.0.1:5183' }, webServer: { command: 'npm.cmd run dev -- --port 5183 --strictPort', url: 'http://127.0.0.1:5183', reuseExistingServer: false, env: { VITE_SUPABASE_URL: ' ', VITE_SUPABASE_PUBLISHABLE_KEY: ' ' } } })
