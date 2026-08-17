/*
 * asyncGeneratorLoop 单元测试（fake timers）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    asyncGeneratorLoop,
    testAsyncGeneratorLoopRules,
    testAsyncGeneratorForeverLoopRules,
} from '../asyncGeneratorLoop'

describe('asyncGeneratorLoop', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('按序列推进：1000 后首次异步回调', async () => {
        const callback = vi.fn(async () => true)
        await asyncGeneratorLoop(testAsyncGeneratorLoopRules(), callback)

        await vi.advanceTimersByTimeAsync(999)
        expect(callback).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(1)
        expect(callback).toHaveBeenCalledTimes(1)

        await vi.advanceTimersByTimeAsync(2000)
        expect(callback).toHaveBeenCalledTimes(2)
    })

    it('异步回调返回 false 时停止', async () => {
        const callback = vi.fn(async () => false)
        await asyncGeneratorLoop(testAsyncGeneratorLoopRules(), callback)

        await vi.advanceTimersByTimeAsync(1000)
        expect(callback).toHaveBeenCalledTimes(1)

        await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000)
        expect(callback).toHaveBeenCalledTimes(1)
    })

    it('异步回调 reject 时停止且不抛出', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {})
        const callback = vi.fn(async () => {
            throw new Error('boom')
        })
        await expect(
            asyncGeneratorLoop(testAsyncGeneratorLoopRules(), callback)
        ).resolves.toBeTypeOf('function')

        await vi.advanceTimersByTimeAsync(1000)
        expect(callback).toHaveBeenCalledTimes(1)

        await vi.advanceTimersByTimeAsync(1000 + 2000)
        expect(callback).toHaveBeenCalledTimes(1)
        error.mockRestore()
    })

    it('immediate: true 时立即执行异步回调', async () => {
        const callback = vi.fn(async () => false)
        await asyncGeneratorLoop(testAsyncGeneratorLoopRules(), callback, { immediate: true })

        expect(callback).toHaveBeenCalledTimes(1)
    })

    it('immediate: false 时首个回调在 1000ms 后', async () => {
        const callback = vi.fn(async () => false)
        await asyncGeneratorLoop(testAsyncGeneratorLoopRules(), callback, { immediate: false })

        expect(callback).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1000)
        expect(callback).toHaveBeenCalledTimes(1)
    })

    it('cancel 清除未触发的定时器', async () => {
        const callback = vi.fn(async () => true)
        const cancel = await asyncGeneratorLoop(testAsyncGeneratorLoopRules(), callback)

        cancel()
        await vi.advanceTimersByTimeAsync(3000)
        expect(callback).not.toHaveBeenCalled()
    })

    it('无限循环序列存在且可推进', async () => {
        const callback = vi.fn(async () => false)
        await asyncGeneratorLoop(testAsyncGeneratorForeverLoopRules(), callback)

        await vi.advanceTimersByTimeAsync(1000)
        expect(callback).toHaveBeenCalledTimes(1)
    })
})
