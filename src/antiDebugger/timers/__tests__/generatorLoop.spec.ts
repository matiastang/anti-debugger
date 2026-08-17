/*
 * generatorLoop 单元测试（fake timers）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    generatorLoop,
    testGeneratorLoopRules,
    testGeneratorForeverLoopRules,
} from '../generatorLoop'

describe('generatorLoop', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('按规则序列推进：1000 后首次回调，返回 true 继续 2000', () => {
        const callback = vi.fn(() => true)
        generatorLoop(testGeneratorLoopRules(), callback)

        vi.advanceTimersByTime(999)
        expect(callback).not.toHaveBeenCalled()

        vi.advanceTimersByTime(1)
        expect(callback).toHaveBeenCalledTimes(1)

        vi.advanceTimersByTime(1999)
        expect(callback).toHaveBeenCalledTimes(1)

        vi.advanceTimersByTime(1)
        expect(callback).toHaveBeenCalledTimes(2)
    })

    it('回调返回 false 时停止循环', () => {
        const callback = vi.fn(() => false)
        generatorLoop(testGeneratorLoopRules(), callback)

        vi.advanceTimersByTime(1000)
        expect(callback).toHaveBeenCalledTimes(1)

        // 规则序列剩余的所有时间都推进，也不应再回调
        vi.advanceTimersByTime(1000 + 2000 + 4000 + 8000)
        expect(callback).toHaveBeenCalledTimes(1)
    })

    it('immediate: true 时同步立即执行一次（实际行为：返回 false 后仍会多调度一次定时器）', () => {
        const callback = vi.fn(() => false)
        generatorLoop(testGeneratorLoopRules(), callback, { immediate: true })

        expect(callback).toHaveBeenCalledTimes(1)
        vi.advanceTimersByTime(1000)
        // 注意：源码中 immediate 分支后的 ruleLoop() 是无条件调用的，
        // 即使 immediate 回调返回 false 也会多执行一次（与 async 版本行为不一致）
        expect(callback).toHaveBeenCalledTimes(2)
        vi.advanceTimersByTime(2000 + 4000)
        // 多出的那次返回 false 后不再继续
        expect(callback).toHaveBeenCalledTimes(2)
    })

    it('immediate: true 返回 true 时继续按序列执行', () => {
        const callback = vi.fn(() => true)
        generatorLoop(testGeneratorLoopRules(), callback, { immediate: true })

        expect(callback).toHaveBeenCalledTimes(1)
        vi.advanceTimersByTime(1000)
        expect(callback).toHaveBeenCalledTimes(2)
    })

    it('cancel 清除未触发的定时器', () => {
        const callback = vi.fn(() => true)
        const cancel = generatorLoop(testGeneratorLoopRules(), callback)

        cancel()
        vi.advanceTimersByTime(1000 + 2000 + 4000)
        expect(callback).not.toHaveBeenCalled()
    })

    it('规则耗尽后自然停止（固定序列 1000..16000 共 5 次）', () => {
        const callback = vi.fn(() => true)
        generatorLoop(testGeneratorLoopRules(), callback)

        vi.advanceTimersByTime(1000 + 2000 + 4000 + 8000 + 16000)
        expect(callback).toHaveBeenCalledTimes(5)

        vi.advanceTimersByTime(60000)
        expect(callback).toHaveBeenCalledTimes(5)
    })

    it('无限循环序列：1000..16000 后第 6 个间隔为 32000（>max 才回绕），随后回到 1000', () => {
        const callback = vi.fn(() => true)
        generatorLoop(testGeneratorForeverLoopRules(), callback)

        // 序列：1000, 2000, 4000, 8000, 16000（累计 31000）
        vi.advanceTimersByTime(31000)
        expect(callback).toHaveBeenCalledTimes(5)

        // 16000 不大于 max，current 保持 16000 -> 下一个间隔 32000
        vi.advanceTimersByTime(32000 - 1)
        expect(callback).toHaveBeenCalledTimes(5)
        vi.advanceTimersByTime(1)
        expect(callback).toHaveBeenCalledTimes(6)

        // 32000 > 16000 -> current 回到 500 -> 下一间隔 1000
        vi.advanceTimersByTime(999)
        expect(callback).toHaveBeenCalledTimes(6)
        vi.advanceTimersByTime(1)
        expect(callback).toHaveBeenCalledTimes(7)
    })
})
