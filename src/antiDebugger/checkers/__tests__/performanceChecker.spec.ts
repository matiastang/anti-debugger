/*
 * performanceChecker 单元测试
 * - maxLogPrintTime 为模块级累积状态，用例间 resetModules + 动态 import 隔离
 * - performanceCheckerIsOpen 为 async（两轮确认，间隔 200ms）
 * - 测试环境（happy-dom/node）的 console 方法为 JS 实现，默认走"被 hook"阈值（floor 300 / ratio 20）；
 *   通过覆盖 spy 的 toString 模拟原生 console（floor 100 / ratio 10）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// 静默用例中的真实控制台输出
const silence = () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'table').mockImplementation(() => {})
    vi.spyOn(console, 'time').mockImplementation(() => {})
    vi.spyOn(console, 'timeEnd').mockImplementation(() => {})
}

/** 把 console 方法伪装为原生实现（toString 含 [native code]） */
const makeNative = () => {
    for (const key of ['log', 'table'] as const) {
        const spy = vi.spyOn(console, key).mockImplementation(() => {})
        spy.toString = () => 'function () { [native code] }'
    }
}

/**
 * 构造 performance.now 返回队列：每轮探测消耗 4 个值（table start/end、log start/end）
 * @param rounds 每轮的 [tableDiff, logDiff] 数组
 */
const perfQueue = (rounds: Array<[number, number]>) => {
    const queue: number[] = []
    for (const [tableDiff, logDiff] of rounds) {
        queue.push(0, tableDiff, 100, 100 + logDiff)
    }
    return vi.spyOn(performance, 'now').mockImplementation(() => queue.shift() ?? 0)
}

const load = () => import('../performanceChecker')

/** 运行探测并推进两轮之间的 200ms 间隔 */
async function runProbe(promise: Promise<boolean>) {
    await vi.advanceTimersByTimeAsync(400)
    return promise
}

describe('performanceCheckerIsOpen', () => {
    beforeEach(() => {
        vi.resetModules()
        vi.restoreAllMocks()
        vi.useFakeTimers()
    })

    it('两轮探测均满足（被 hook 阈值 floor 50 / ratio 20）才返回 true', async () => {
        silence()
        perfQueue([
            [60, 1],
            [60, 1],
        ])
        const { performanceCheckerIsOpen } = await load()
        expect(await runProbe(performanceCheckerIsOpen())).toBe(true)
    })

    it('首轮不满足立即返回 false（不再进行第二轮）', async () => {
        silence()
        const nowSpy = perfQueue([
            [30, 1], // table 30 <= 50
        ])
        const { performanceCheckerIsOpen } = await load()
        expect(await runProbe(performanceCheckerIsOpen())).toBe(false)
        // 仅消耗首轮 4 次
        expect(nowSpy.mock.calls.length).toBe(4)
    })

    it('首轮满足、次轮不满足返回 false', async () => {
        silence()
        perfQueue([
            [60, 1],
            [30, 1],
        ])
        const { performanceCheckerIsOpen } = await load()
        expect(await runProbe(performanceCheckerIsOpen())).toBe(false)
    })

    it('table 未超过 log 基线的比值阈值时返回 false', async () => {
        silence()
        perfQueue([
            [60, 4], // 60 <= 4 * 20 = 80
            [60, 4],
        ])
        const { performanceCheckerIsOpen } = await load()
        expect(await runProbe(performanceCheckerIsOpen())).toBe(false)
    })

    it('原生 console 使用更低的阈值（floor 10 / ratio 10）', async () => {
        makeNative()
        const clear = vi.spyOn(console, 'clear').mockImplementation(() => {})
        perfQueue([
            [20, 1],
            [20, 1],
        ])
        const { performanceCheckerIsOpen } = await load()
        expect(await runProbe(performanceCheckerIsOpen())).toBe(true)
        expect(clear).toHaveBeenCalled()
    })

    it('hideLog 为 false 时不清理控制台', async () => {
        silence()
        const clear = vi.spyOn(console, 'clear').mockImplementation(() => {})
        perfQueue([
            [30, 1],
            [30, 1],
        ])
        const { performanceCheckerIsOpen } = await load()
        expect(await runProbe(performanceCheckerIsOpen(false))).toBe(false)
        expect(clear).not.toHaveBeenCalled()
    })
})
