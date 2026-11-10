import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  timeout: 720_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'reporte' }]],
  outputDir: 'resultados-playwright',
  use: {
    baseURL: process.env.PROFELINK_URL ?? 'http://127.0.0.1:5175',
    actionTimeout: 20_000,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
    ...devices['Desktop Chrome'],
  },
})
