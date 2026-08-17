/*
 * Playwright E2E 配置
 * 双 project：
 * - chromium-clean：无 DevTools 的干净环境（基线）
 * - chromium-devtools：启动参数自动打开真实 DevTools（验证反调试核心行为）
 * 注意：DevTools 打开时页面 JS 可能被 debugger 冻结，用例中用 waitUntil: 'commit'
 */
import { defineConfig, devices } from '@playwright/test'

const BASE_URL = 'http://localhost:3002/'

export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    // E2E 存在真实浏览器时序，允许重试
    retries: 2,
    reporter: [['list']],
    use: {
        baseURL: BASE_URL,
        // 必须有头：--auto-open-devtools-for-tabs 需要真实窗口（CI 中用 xvfb）
        headless: false,
    },
    webServer: {
        command: 'pnpm dev',
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 60_000,
    },
    projects: [
        {
            name: 'chromium-clean',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'chromium-devtools',
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: ['--auto-open-devtools-for-tabs'],
                },
            },
        },
    ],
})
