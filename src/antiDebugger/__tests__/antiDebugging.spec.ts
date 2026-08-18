/*
 * antiDebugging 集成/状态机测试（v0.3.0 行为）
 *
 * Mock 基建（对应探查结论）：
 * - devtools-detect：import 即启动不可停止的 500ms 轮询 -> 必须整体模块 mock，
 *   事件通道用合成 CustomEvent('devtoolschange') 驱动
 * - index.ts 为模块级单例 options + import 即注册 window 监听
 *   -> 每个用例 vi.resetModules() + 动态 import，并捕获/清理监听器
 * - 断点计时分支：v0.3.0 使用 performance.now 主计时 + Date.now 交叉验证，
 *   模拟"断点生效（慢）"需让两个时钟同步递增，只慢一个时钟则触发"篡改"惩罚分支
 * - 惩罚为立即执行（无 800ms 竞态窗口）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const devtoolsState = vi.hoisted(() => ({
    isOpen: false,
    orientation: undefined as string | undefined,
}))
vi.mock('devtools-detect', () => ({ default: devtoolsState }))

const breakpointMock = vi.hoisted(() => vi.fn())
vi.mock('../breakpoint', () => ({ default: breakpointMock }))

const perfMock = vi.hoisted(() => ({ performanceCheckerIsOpen: vi.fn(async () => false) }))
vi.mock('../checkers/performanceChecker', () => perfMock)

const customConsoleMock = vi.hoisted(() => vi.fn())
vi.mock('../customConsole', () => ({
    default: customConsoleMock,
    ConsoleType: { LOG: 'log', INFO: 'info', WARN: 'warn', ERROR: 'error' },
}))

const replaceMock = vi.fn()

// 当前用例动态 import 注册的 devtoolschange 监听器（用于 afterEach 清理）
let listener: EventListener | undefined
// 恢复原始 timers 的函数
let restoreTimers: (() => void) | undefined

async function loadAntiDebugger() {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const mod = await import('../index')
    const call = addSpy.mock.calls.find(([type]) => type === 'devtoolschange')
    listener = call?.[1] as EventListener
    addSpy.mockRestore()
    return mod.default
}

/** 派发合成 devtoolschange 事件（模拟 devtools-detect 的事件通道） */
function emitDevtoolsChange(isOpen: boolean) {
    const event = new CustomEvent('devtoolschange', { detail: { isOpen, orientation: undefined } })
    if (!isOpen) {
        // happy-dom 的 eventPhase 在 dispatch 期间恒为 0（真实浏览器为 2/AT_TARGET），
        // 源码 `event.detail.isOpen || event.eventPhase === 0` 会把 close 事件误判为 open，
        // 这里对实例遮蔽 eventPhase 以贴近真实浏览器语义
        Object.defineProperty(event, 'eventPhase', { value: 2 })
    }
    window.dispatchEvent(event)
}

/**
 * 双时钟同步递增：breakpoint 耗时差恒为 step（> dbDiff 100，走"断点生效"分支且不触发篡改判定）
 */
function mockSlowBreakpoint(step = 1000) {
    let perfTime = 0
    let wallTime = 0
    vi.spyOn(performance, 'now').mockImplementation(() => (perfTime += step))
    vi.spyOn(Date, 'now').mockImplementation(() => (wallTime += step))
}

/** 只慢 performance 时钟（wall 真实）-> 触发时间篡改判定 */
function mockTamperedClock(step = 1000) {
    let perfTime = 0
    vi.spyOn(performance, 'now').mockImplementation(() => (perfTime += step))
}

/** 刷新异步探测回调的微任务 */
const flush = () => vi.advanceTimersByTimeAsync(0)

/**
 * 把 vitest fake timers 包装为浏览器式 number id。
 * 源码 clearIntervalTime 有 `typeof intervalId !== 'number'` 守卫，
 * 而 fake timers 返回 object id 会导致清理被短路（浏览器里 window.setTimeout 返回 number）。
 */
function stubBrowserStyleTimers() {
    const realSet = globalThis.setTimeout
    const realClear = globalThis.clearTimeout
    const map = new Map<number, unknown>()
    let seq = 1
    globalThis.setTimeout = ((fn: () => void, delay?: number, ...args: unknown[]) => {
        const id = seq++
        const handle = realSet(fn, delay, ...args)
        map.set(id, handle)
        return id
    }) as typeof setTimeout
    globalThis.clearTimeout = ((id: number) => {
        const handle = map.get(id)
        if (handle !== undefined) {
            map.delete(id)
            realClear(handle as Parameters<typeof realClear>[0])
        }
    }) as typeof clearTimeout
    return () => {
        globalThis.setTimeout = realSet
        globalThis.clearTimeout = realClear
    }
}

describe('antiDebugging', () => {
    beforeEach(() => {
        vi.resetModules()
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
        restoreTimers = stubBrowserStyleTimers()
        vi.stubGlobal('location', { replace: replaceMock })
        devtoolsState.isOpen = false
        breakpointMock.mockReset()
        perfMock.performanceCheckerIsOpen.mockReset()
        perfMock.performanceCheckerIsOpen.mockResolvedValue(false)
        customConsoleMock.mockReset()
        replaceMock.mockReset()
    })

    afterEach(() => {
        if (listener) {
            window.removeEventListener('devtoolschange', listener)
            listener = undefined
        }
        restoreTimers?.()
        restoreTimers = undefined
        vi.clearAllTimers()
        vi.useRealTimers()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        localStorage.clear()
    })

    describe('初始化与状态机', () => {
        it('初始 devtools 关闭：devtoolsChange(false)，Undock 周期探测持续运行', async () => {
            const antiDebugging = await loadAntiDebugger()
            const devtoolsChange = vi.fn()
            antiDebugging({ devtoolsChange })

            expect(devtoolsChange).toHaveBeenCalledTimes(1)
            expect(devtoolsChange).toHaveBeenCalledWith(false)
            expect(breakpointMock).not.toHaveBeenCalled()

            // 周期探测间隔序列 1000, 2000, 4000 循环：累计 1000 / 3000 / 7000 / 8000 / 12000 / 14000
            await vi.advanceTimersByTimeAsync(7000)
            expect(perfMock.performanceCheckerIsOpen).toHaveBeenCalledTimes(3)
            await vi.advanceTimersByTimeAsync(7000)
            expect(perfMock.performanceCheckerIsOpen).toHaveBeenCalledTimes(6)
        })

        it('devtoolschange 开启事件：devtoolsChange(true) 并立即执行断点检测', async () => {
            const antiDebugging = await loadAntiDebugger()
            const devtoolsChange = vi.fn()
            const breakpointsChange = vi.fn()
            antiDebugging({ devtoolsChange, breakpointsChange })

            emitDevtoolsChange(true)
            expect(devtoolsChange).toHaveBeenLastCalledWith(true)
            expect(breakpointMock).toHaveBeenCalled()
            // 首次快速通过（断点未生效）-> breakpointStatus 置 true
            expect(breakpointsChange).toHaveBeenCalledWith(true)
        })

        it('开启后关闭事件：同步停止轮询，探测确认后回调 devtoolsChange(false) 并重启探测', async () => {
            mockSlowBreakpoint()
            const antiDebugging = await loadAntiDebugger()
            const devtoolsChange = vi.fn()
            devtoolsState.isOpen = true
            antiDebugging({ devtoolsChange })

            // 慢速循环持续运行
            vi.advanceTimersByTime(10_000)
            const called = breakpointMock.mock.calls.length
            expect(called).toBeGreaterThan(10)

            emitDevtoolsChange(false)
            // 同步清理 + 异步探测（mock false）后回调 false
            await flush()
            expect(devtoolsChange).toHaveBeenLastCalledWith(false)
            vi.advanceTimersByTime(60000)
            // 关闭后不再有新的断点检测
            expect(breakpointMock.mock.calls.length).toBe(called)
            // 探测已重启
            expect(perfMock.performanceCheckerIsOpen).toHaveBeenCalled()
        })

        it('关闭事件但性能探测判定打开（Undock）：保持开启状态', async () => {
            mockSlowBreakpoint()
            const antiDebugging = await loadAntiDebugger()
            const devtoolsChange = vi.fn()
            antiDebugging({ devtoolsChange })

            emitDevtoolsChange(true)
            perfMock.performanceCheckerIsOpen.mockResolvedValue(true)
            emitDevtoolsChange(false)

            await flush()
            expect(devtoolsChange).toHaveBeenLastCalledWith(true)
            expect(breakpointMock).toHaveBeenCalled()
        })

        it('周期探测判定打开：视作开启并取消探测', async () => {
            const antiDebugging = await loadAntiDebugger()
            const devtoolsChange = vi.fn()
            antiDebugging({ devtoolsChange })

            perfMock.performanceCheckerIsOpen.mockResolvedValue(true)
            await vi.advanceTimersByTimeAsync(2000)
            await flush()
            expect(devtoolsChange).toHaveBeenLastCalledWith(true)
            expect(breakpointMock).toHaveBeenCalled()

            // 探测取消：不再有新的探测调用
            const probeCalls = perfMock.performanceCheckerIsOpen.mock.calls.length
            await vi.advanceTimersByTimeAsync(20000)
            expect(perfMock.performanceCheckerIsOpen.mock.calls.length).toBe(probeCalls)
        })
    })

    describe('断点计时与惩罚', () => {
        it('断点耗时超过 dbDiff：breakpointStatus 翻转并回调 breakpointsChange(false)，循环继续', async () => {
            const antiDebugging = await loadAntiDebugger()
            const breakpointsChange = vi.fn()
            devtoolsState.isOpen = true
            antiDebugging({ breakpointsChange })

            // 第一次快速通过 -> status: undefined -> true（并立即惩罚）
            expect(breakpointsChange).toHaveBeenCalledWith(true)
            expect(replaceMock).toHaveBeenCalledTimes(1)
            replaceMock.mockClear()

            // 后续慢速（断点生效）-> status: true -> false
            mockSlowBreakpoint()
            emitDevtoolsChange(true)
            expect(breakpointsChange).toHaveBeenLastCalledWith(false)
            expect(breakpointsChange).toHaveBeenCalledTimes(2)
            // 慢速分支不触发新的惩罚
            vi.advanceTimersByTime(2000)
            expect(replaceMock).not.toHaveBeenCalled()
        })

        it('断点快速通过（deactivate breakpoints）：立即惩罚跳转，无竞态窗口', async () => {
            const antiDebugging = await loadAntiDebugger()
            devtoolsState.isOpen = true
            antiDebugging()

            // 无需推进时间，初始化的首次检测即惩罚
            expect(replaceMock).toHaveBeenCalledTimes(1)
            expect(replaceMock).toHaveBeenCalledWith('about:blank')
        })

        it('自定义 deactivateBreakpoints 回调立即执行且替代默认跳转', async () => {
            const antiDebugging = await loadAntiDebugger()
            const deactivateBreakpoints = vi.fn()
            devtoolsState.isOpen = true
            antiDebugging({ deactivateBreakpoints })

            expect(deactivateBreakpoints).toHaveBeenCalledTimes(1)
            expect(replaceMock).not.toHaveBeenCalled()
        })

        it('时间篡改（performance 与 wall 时钟差值异常）：立即按断点失效惩罚', async () => {
            const antiDebugging = await loadAntiDebugger()
            mockTamperedClock()
            devtoolsState.isOpen = true
            antiDebugging()

            expect(replaceMock).toHaveBeenCalledTimes(1)
            expect(replaceMock).toHaveBeenCalledWith('about:blank')
        })

        it('deactivateDebugger: true 时不执行断点检测', async () => {
            const antiDebugging = await loadAntiDebugger()
            devtoolsState.isOpen = true
            antiDebugging({ deactivateDebugger: true })

            vi.advanceTimersByTime(5000)
            expect(breakpointMock).not.toHaveBeenCalled()
            expect(replaceMock).not.toHaveBeenCalled()
        })
    })

    describe('localStorage 关闭通道', () => {
        it('存储值为 true 时关闭 debugger', async () => {
            const antiDebugging = await loadAntiDebugger()
            localStorage.setItem('ANTI-DEBUGGER', JSON.stringify({ value: true }))
            devtoolsState.isOpen = true
            antiDebugging({ debuggerLocalStorageKey: 'ANTI-DEBUGGER' })

            vi.advanceTimersByTime(5000)
            expect(breakpointMock).not.toHaveBeenCalled()
        })

        it('存储值为 false 时按 deactivateDebugger 配置处理', async () => {
            const antiDebugging = await loadAntiDebugger()
            localStorage.setItem('ANTI-DEBUGGER', JSON.stringify({ value: false }))
            devtoolsState.isOpen = true
            antiDebugging({ debuggerLocalStorageKey: 'ANTI-DEBUGGER' })

            expect(breakpointMock).toHaveBeenCalled()
        })

        it('存储值非法 JSON 时视为 false 并输出错误日志', async () => {
            const antiDebugging = await loadAntiDebugger()
            localStorage.setItem('ANTI-DEBUGGER', 'not-json{')
            devtoolsState.isOpen = true
            antiDebugging({ debuggerLocalStorageKey: 'ANTI-DEBUGGER', devLog: true })

            expect(breakpointMock).toHaveBeenCalled()
            expect(customConsoleMock).toHaveBeenCalled()
        })
    })

    describe('场景参数化', () => {
        it.each([
            { timeout: 1000, desc: '默认 1000ms' },
            { timeout: 2000, desc: '自定义 2000ms' },
        ])('timeout 配置生效：轮询间隔 $desc', async ({ timeout }) => {
            mockSlowBreakpoint()
            const antiDebugging = await loadAntiDebugger()
            devtoolsState.isOpen = true
            antiDebugging({ timeout })

            // 慢速分支持续循环：immediate 一次 + 每 timeout 一次
            expect(breakpointMock).toHaveBeenCalledTimes(1)
            vi.advanceTimersByTime(timeout - 1)
            expect(breakpointMock).toHaveBeenCalledTimes(1)
            vi.advanceTimersByTime(1)
            expect(breakpointMock).toHaveBeenCalledTimes(2)
        })

        it.each([
            {
                dbDiff: 100,
                diff: 60,
                punished: true,
                desc: '60ms 快速通过(< 100) = deactivate -> 惩罚',
            },
            { dbDiff: 10, diff: 60, punished: false, desc: '60ms 慢速(> 10) = 断点生效 -> 不惩罚' },
        ])('dbDiff $dbDiff + 耗时 $diff -> $desc', async ({ dbDiff, diff, punished }) => {
            const antiDebugging = await loadAntiDebugger()
            let perfTime = 0
            let wallTime = 0
            vi.spyOn(performance, 'now').mockImplementation(() => (perfTime += diff))
            vi.spyOn(Date, 'now').mockImplementation(() => (wallTime += diff))
            devtoolsState.isOpen = true
            antiDebugging({ dbDiff })

            expect(replaceMock.mock.calls.length).toBe(punished ? 1 : 0)
        })

        it('devLog: true 时输出开发日志', async () => {
            const antiDebugging = await loadAntiDebugger()
            devtoolsState.isOpen = true
            antiDebugging({ devLog: true })

            expect(customConsoleMock).toHaveBeenCalled()
        })

        it('devLog 默认关闭时不输出日志', async () => {
            const antiDebugging = await loadAntiDebugger()
            devtoolsState.isOpen = true
            antiDebugging()

            expect(customConsoleMock).not.toHaveBeenCalled()
        })
    })

    describe('destroy 与重复初始化', () => {
        it('destroy：停止探测循环且事件不再响应', async () => {
            const antiDebugging = await loadAntiDebugger()
            const devtoolsChange = vi.fn()
            antiDebugging({ devtoolsChange })

            antiDebugging.destroy()
            await vi.advanceTimersByTimeAsync(20000)
            expect(perfMock.performanceCheckerIsOpen).not.toHaveBeenCalled()

            emitDevtoolsChange(true)
            expect(breakpointMock).not.toHaveBeenCalled()
            expect(devtoolsChange).toHaveBeenCalledTimes(1) // 仅初始化时的 false
        })

        it('destroy：停止运行中的断点轮询', async () => {
            mockSlowBreakpoint()
            const antiDebugging = await loadAntiDebugger()
            devtoolsState.isOpen = true
            antiDebugging()
            vi.advanceTimersByTime(10_000)
            expect(breakpointMock.mock.calls.length).toBeGreaterThan(10)

            antiDebugging.destroy()
            const called = breakpointMock.mock.calls.length
            vi.advanceTimersByTime(60000)
            expect(breakpointMock.mock.calls.length).toBe(called)
        })

        it('重复初始化：清理上一轮轮询并重置状态', async () => {
            mockSlowBreakpoint()
            const antiDebugging = await loadAntiDebugger()
            const devtoolsChange = vi.fn()
            devtoolsState.isOpen = true
            antiDebugging({ devtoolsChange })
            vi.advanceTimersByTime(10_000)
            expect(breakpointMock.mock.calls.length).toBeGreaterThan(10)

            // 重新初始化（devtools 已关闭）
            devtoolsState.isOpen = false
            antiDebugging({ devtoolsChange })
            const called = breakpointMock.mock.calls.length
            vi.advanceTimersByTime(60000)
            // 旧轮询已清理
            expect(breakpointMock.mock.calls.length).toBe(called)
            // 新一轮探测已启动
            expect(perfMock.performanceCheckerIsOpen).toHaveBeenCalled()

            // destroyed 标记已重置：事件恢复响应
            emitDevtoolsChange(true)
            expect(devtoolsChange).toHaveBeenLastCalledWith(true)
            expect(breakpointMock.mock.calls.length).toBeGreaterThan(called)
        })
    })
})
