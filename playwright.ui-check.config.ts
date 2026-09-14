import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', testIgnore: '**/supabase/**', use: { baseURL: 'http://127.0.0.1:5176', channel: 'msedge', headless: true }, webServer: { command: 'npm.cmd run dev -- --port 5176 --strictPort', url: 'http://127.0.0.1:5176', env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' } } });
