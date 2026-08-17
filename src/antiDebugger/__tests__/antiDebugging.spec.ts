/*
 * antiDebugging 集成/状态机测试
 *
 * Mock 基建（对应探查结论）：
 * - devtools-detect：import 即启动不可停止的 500ms 轮询 -> 必须整体模块 mock，
 *   事件通道用合成 CustomEvent('devtoolschange') 驱动
 * - index.ts 为模块级单例 options + import 即注册 window 监听
 *   -> 每个用例 vi.resetModules() + 动态 import，并捕获/清理监听器
 * - 断点计时分支用 Date.now spy 控制耗时差
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const devtoolsState = vi.hoisted(() => ({
    isOpen: false,
    orientation: undefined as string | undefined,
}))
vi.mock('devtools-detect', () => ({ default: devtoolsState }))

const breakpointMock = vi.hoisted(() => vi.fn())
vi.mock('../breakpoint', () => ({ default: breakpointMock }))

const perfMock = vi.hoisted(() => ({ performanceCheckerIsOpen: vi.fn(() => false) }))
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

/** Date.now 每次调用递增 step -> breakpoint 耗时差恒为 step（> 默认 dbDiff 50，走"断点生效"分支） */
function mockSlowBreakpoint(step = 1000) {
    let t = 0
    return vi.spyOn(Date, 'now').mockImplementation(() => (t += step))
}

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
        perfMock.performanceCheckerIsOpen.mockReturnValue(false)
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
        it('初始 devtools 关闭：触发 devtoolsChange(false)，Undock 探测 3 次后停止', async () => {
            const antiDebugging = await loadAntiDebugger()
            const devtoolsChange = vi.fn()
            antiDebugging({ devtoolsChange })

            expect(devtoolsChange).toHaveBeenCalledTimes(1)
            expect(devtoolsChange).toHaveBeenCalledWith(false)
            expect(breakpointMock).not.toHaveBeenCalled()

            // Undock 探测序列 1000/2000/3000
            vi.advanceTimersByTime(6000)
            expect(perfMock.performanceCheckerIsOpen).toHaveBeenCalledTimes(3)
            vi.advanceTimersByTime(60000)
            expect(perfMock.performanceCheckerIsOpen).toHaveBeenCalledTimes(3)
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

        it('开启后关闭事件：清理轮询定时器并回调 devtoolsChange(false)', async () => {
            const dateSpy = mockSlowBreakpoint()
            const antiDebugging = await loadAntiDebugger()
            const devtoolsChange = vi.fn()
            devtoolsState.isOpen = true
            antiDebugging({ devtoolsChange })

            // 慢速分支（断点生效）-> 0ms 间隔循环持续运行
            vi.advanceTimersByTime(100)
            const called = breakpointMock.mock.calls.length
            expect(called).toBeGreaterThan(10)

            emitDevtoolsChange(false)
            expect(devtoolsChange).toHaveBeenLastCalledWith(false)
            vi.advanceTimersByTime(60000)
            // 关闭后不再有新的断点检测
            expect(breakpointMock.mock.calls.length).toBe(called)
            dateSpy.mockRestore()
        })

        it('关闭事件但性能检测判定打开（Undock）：保持开启状态', async () => {
            const antiDebugging = await loadAntiDebugger()
            const devtoolsChange = vi.fn()
            antiDebugging({ devtoolsChange })

            emitDevtoolsChange(true)
            perfMock.performanceCheckerIsOpen.mockReturnValue(true)
            emitDevtoolsChange(false)

            expect(devtoolsChange).toHaveBeenLastCalledWith(true)
            expect(breakpointMock).toHaveBeenCalled()
        })
    })

    describe('断点计时与惩罚', () => {
        it('断点耗时超过 dbDiff：breakpointStatus 翻转并回调 breakpointsChange(false)，循环继续', async () => {
            const antiDebugging = await loadAntiDebugger()
            const breakpointsChange = vi.fn()
            devtoolsState.isOpen = true
            antiDebugging({ breakpointsChange })

            // 第一次快速通过 -> status: undefined -> true
            expect(breakpointsChange).toHaveBeenCalledWith(true)

            // 冲掉第一次快速通过合法排下的 800ms 惩罚，不计入后续断言
            vi.advanceTimersByTime(800)
            expect(replaceMock).toHaveBeenCalledTimes(1)
            replaceMock.mockClear()

            // 后续慢速（断点生效）-> status: true -> false
            const dateSpy = mockSlowBreakpoint()
            emitDevtoolsChange(true)
            expect(breakpointsChange).toHaveBeenLastCalledWith(false)
            expect(breakpointsChange).toHaveBeenCalledTimes(2)
            // 慢速分支不触发新的跳转
            vi.advanceTimersByTime(2000)
            expect(replaceMock).not.toHaveBeenCalled()
            dateSpy.mockRestore()
        })

        it('断点快速通过（deactivate breakpoints）：800ms 后跳转 about:blank', async () => {
            const antiDebugging = await loadAntiDebugger()
            devtoolsState.isOpen = true
            antiDebugging()

            vi.advanceTimersByTime(799)
            expect(replaceMock).not.toHaveBeenCalled()
            vi.advanceTimersByTime(1)
            expect(replaceMock).toHaveBeenCalledWith('about:blank')
        })

        it('自定义 deactivateBreakpoints 回调替代默认跳转', async () => {
            const antiDebugging = await loadAntiDebugger()
            const deactivateBreakpoints = vi.fn()
            devtoolsState.isOpen = true
            antiDebugging({ deactivateBreakpoints })

            vi.advanceTimersByTime(800)
            expect(deactivateBreakpoints).toHaveBeenCalledTimes(1)
            expect(replaceMock).not.toHaveBeenCalled()
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
        it('immediate: false 时首次断点检测由 0ms 轮询触发（timeout 配置当前未传入轮询定时器）', async () => {
            const antiDebugging = await loadAntiDebugger()
            devtoolsState.isOpen = true
            antiDebugging({ timeout: 2000, immediate: false })

            // 实际行为：源码中 setIntervalTime() 未传 timeout，循环间隔为 undefined(=0ms)
            expect(breakpointMock).not.toHaveBeenCalled()
            vi.advanceTimersByTime(1)
            expect(breakpointMock.mock.calls.length).toBeGreaterThanOrEqual(1)
        })

        it('immediate: true（默认）时初始化即执行首次断点检测', async () => {
            const antiDebugging = await loadAntiDebugger()
            devtoolsState.isOpen = true
            antiDebugging()

            expect(breakpointMock).toHaveBeenCalledTimes(1)
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
            let t = 0
            vi.spyOn(Date, 'now').mockImplementation(() => (t += diff))
            devtoolsState.isOpen = true
            antiDebugging({ dbDiff })

            vi.advanceTimersByTime(800)
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
})
