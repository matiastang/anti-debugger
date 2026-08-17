/*
 * breakpoint 单元测试
 * 说明：debugger 语句的真实暂停行为只在 DevTools 打开时发生，
 * 无法在测试环境中断言，此处仅验证调用安全性。真实行为由 e2e 覆盖。
 */
import { describe, it, expect } from 'vitest'
import breakpoint from '../breakpoint'

describe('breakpoint', () => {
    it('调用不抛错', () => {
        expect(() => breakpoint()).not.toThrow()
    })
})
