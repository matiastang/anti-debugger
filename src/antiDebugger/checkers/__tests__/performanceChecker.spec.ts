/*
 * performanceChecker 单元测试
 * maxLogPrintTime 为模块级累积状态，用例间 resetModules + 动态 import 隔离
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// 静默用例中的真实控制台输出
const silence = () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'table').mockImplementation(() => {})
    vi.spyOn(console, 'time').mockImplementation(() => {})
    vi.spyOn(console, 'timeEnd').mockImplementation(() => {})
}

const load = () => import('../performanceChecker')

describe('performanceCheckerIsOpen', () => {
    beforeEach(() => {
        vi.resetModules()
        vi.restoreAllMocks()
    })

    it('table 打印耗时 <= 0 时返回 false（性能 API 不可用场景）', async () => {
        silence()
        // calcTablePrintTime: start=100, end=100 -> duration 0
        vi.spyOn(performance, 'now')
            .mockReturnValueOnce(100)
            .mockReturnValueOnce(100)
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0)
        const { performanceCheckerIsOpen } = await load()
        expect(performanceCheckerIsOpen()).toBe(false)
    })

    it('log 打印耗时 <= 0 时返回 false', async () => {
        silence()
        // table: 10->15 (5ms)；log: 20->20 (0ms)
        vi.spyOn(performance, 'now')
            .mockReturnValueOnce(10)
            .mockReturnValueOnce(15)
            .mockReturnValueOnce(20)
            .mockReturnValueOnce(20)
        const { performanceCheckerIsOpen } = await load()
        expect(performanceCheckerIsOpen()).toBe(false)
    })

    it('table 耗时超过 log 最大耗时的 10 倍时返回 true', async () => {
        silence()
        // table: 0->11 (11ms)；log: 100->101 (1ms)；11 > 1*10
        vi.spyOn(performance, 'now')
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(11)
            .mockReturnValueOnce(100)
            .mockReturnValueOnce(101)
        const { performanceCheckerIsOpen } = await load()
        expect(performanceCheckerIsOpen()).toBe(true)
    })

    it('table 耗时未超过 10 倍时返回 false', async () => {
        silence()
        // table: 0->5 (5ms)；log: 100->101 (1ms)；5 < 10
        vi.spyOn(performance, 'now')
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(5)
            .mockReturnValueOnce(100)
            .mockReturnValueOnce(101)
        const { performanceCheckerIsOpen } = await load()
        expect(performanceCheckerIsOpen()).toBe(false)
    })

    it('hideLog 为 true 时调用 console.clear', async () => {
        silence()
        const clear = vi.spyOn(console, 'clear').mockImplementation(() => {})
        vi.spyOn(performance, 'now')
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(5)
            .mockReturnValueOnce(100)
            .mockReturnValueOnce(101)
        const { performanceCheckerIsOpen } = await load()
        performanceCheckerIsOpen(true)
        expect(clear).toHaveBeenCalledTimes(1)
    })

    it('hideLog 为 false 时保留控制台输出', async () => {
        silence()
        const clear = vi.spyOn(console, 'clear').mockImplementation(() => {})
        vi.spyOn(performance, 'now')
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(5)
            .mockReturnValueOnce(100)
            .mockReturnValueOnce(101)
        const { performanceCheckerIsOpen } = await load()
        performanceCheckerIsOpen(false)
        expect(clear).not.toHaveBeenCalled()
    })
})
