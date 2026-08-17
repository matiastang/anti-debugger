/*
 * 反调试核心行为 E2E
 *
 * 项目分层：
 * - chromium-clean   基线 + CDP 驱动的确定性用例（viewport 收缩触发 devtools-detect 宽度阈值）
 * - chromium-devtools 启动参数自动打开真实 DevTools，验证真实冻结行为
 *
 * 注意：
 * - DevTools 打开且断点生效时页面 JS 被冻结，goto 一律 waitUntil: 'commit'
 * - 真实 DevTools 前端会占有 pause 所有权，CDP resume 不可靠，
 *   因此"断点失活惩罚"用例放在 clean project 用 CDP 独占调试器实现
 */
import { test, expect, type Page } from '@playwright/test'

/** 页内心跳：JS 可运行则在 delay 后 resolve */
const heartbeat = (delay: number) =>
    `new Promise((resolve) => setTimeout(() => resolve('alive'), ${delay}))`

/** 心跳与超时的竞速：JS 可运行 -> 'alive'，被冻结 -> 'frozen' */
async function probeAlive(page: Page, delay = 1500, wait = 6000): Promise<string> {
    return Promise.race([
        page.evaluate<string>(heartbeat(delay)),
        page.waitForTimeout(wait).then(() => 'frozen'),
    ])
}

test.describe('基线（chromium-clean）', () => {
    test.beforeEach(({ browserName: _browserName }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium-clean', '仅 clean project')
    })

    test('页面正常加载，JS 正常运行，不发生跳转', async ({ page }) => {
        await page.goto('/', { waitUntil: 'commit' })

        // 心跳 500ms：需早于 Undock 探测的惩罚窗口（探测 1000ms + 惩罚 800ms）
        expect(await probeAlive(page, 500)).toBe('alive')
        expect(page.url()).toContain('localhost:3002')
    })
})

test.describe('真实 DevTools（chromium-devtools）', () => {
    test.beforeEach(({ browserName: _browserName }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium-devtools', '仅 devtools project')
    })

    test('DevTools 打开时页面 JS 被 debugger 循环冻结', async ({ page }) => {
        await page.goto('/', { waitUntil: 'commit' })

        expect(await probeAlive(page, 1500)).toBe('frozen')
    })

    test('localStorage ANTI-DEBUGGER=true 关闭反调试，DevTools 打开也不冻结', async ({ page }) => {
        // 在页面任何脚本执行前写入关闭开关（格式需匹配 getLocalStorageDebugger 的 JSON.parse）
        await page.addInitScript(() => {
            localStorage.setItem('ANTI-DEBUGGER', JSON.stringify({ value: true }))
        })

        await page.goto('/', { waitUntil: 'commit' })

        expect(await probeAlive(page, 1500)).toBe('alive')
    })
})

test.describe('断点失活惩罚（chromium-clean + CDP）', () => {
    test.beforeEach(({ browserName: _browserName }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium-clean', '仅 clean project')
    })

    test('检测开启 -> debugger 暂停 -> Deactivate breakpoints -> 惩罚跳转 about:blank', async ({
        page,
    }) => {
        // 收缩 viewport 使 outerWidth - innerWidth > 170，触发 devtools-detect 的宽度阈值判定，
        // 无需真实 DevTools UI 即可进入"已打开"状态（deterministic）
        await page.setViewportSize({ width: 900, height: 600 })

        const cdp = await page.context().newCDPSession(page)
        // CDPSession 是 EventEmitter：先挂监听再导航，等待 debugger 语句触发暂停
        const paused = new Promise<void>((resolve) => {
            cdp.on('Debugger.paused', () => resolve())
        })
        await cdp.send('Debugger.enable')

        await page.goto('/', { waitUntil: 'commit' })

        // 反调试循环启动后，debugger 语句触发 CDP 暂停（CDP 为唯一调试器客户端）
        await Promise.race([paused, page.waitForTimeout(10_000)])

        // 等价于 DevTools 中点击 "Deactivate breakpoints"，并恢复当前暂停
        await cdp.send('Debugger.setBreakpointsActive', { active: false })
        await cdp.send('Debugger.resume')

        // 恢复后的下一轮检测判定"断点失效"（快速通过）-> 800ms 后惩罚跳转
        await page.waitForURL('about:blank', { timeout: 15_000 })
        expect(page.url()).toBe('about:blank')
    })
})
