/*
 * localStorageUtil 单元测试
 * 使用 happy-dom 提供的真实 localStorage
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    localStorageWrite,
    localStorageRead,
    localStorageRemove,
    localStorageRemoveAll,
} from '../localStorageUtil'

const KEY = 'test-key'

describe('localStorageUtil', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.restoreAllMocks()
    })

    afterEach(() => {
        localStorage.clear()
    })

    describe('localStorageWrite / localStorageRead', () => {
        it('写入并读取字符串', () => {
            localStorageWrite(KEY, 'hello')
            expect(localStorageRead<string>(KEY)).toBe('hello')
        })

        it('写入并读取对象', () => {
            localStorageWrite(KEY, { a: 1, b: 'x' })
            expect(localStorageRead<{ a: number; b: string }>(KEY)).toEqual({ a: 1, b: 'x' })
        })

        it('存储格式为 {value: ...} 的 JSON 字符串', () => {
            localStorageWrite(KEY, 'hello')
            expect(localStorage.getItem(KEY)).toBe('{"value":"hello"}')
        })

        it('写入 boolean true 读回字符串 "true"（按当前实现的真实行为）', () => {
            localStorageWrite(KEY, true)
            expect(localStorageRead(KEY)).toBe('true')
        })

        it('写入 number 读回字符串', () => {
            localStorageWrite(KEY, 42)
            expect(localStorageRead(KEY)).toBe('42')
        })

        it('写入 NaN 不落盘并告警', () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
            localStorageWrite(KEY, NaN)
            expect(localStorage.getItem(KEY)).toBeNull()
            expect(warn).toHaveBeenCalledWith('value is NaN')
        })

        it('写入 null / undefined 等同于删除', () => {
            localStorageWrite(KEY, 'hello')
            localStorageWrite(KEY, null)
            expect(localStorage.getItem(KEY)).toBeNull()

            localStorageWrite(KEY, 'hello')
            localStorageWrite(KEY, undefined)
            expect(localStorage.getItem(KEY)).toBeNull()
        })
    })

    describe('localStorageRead', () => {
        it('读取不存在的 key 返回 undefined', () => {
            expect(localStorageRead('not-exist')).toBeUndefined()
        })

        it('存储值为非法 JSON 时返回 undefined 并告警', () => {
            localStorage.setItem(KEY, 'not-json{')
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
            expect(localStorageRead(KEY)).toBeUndefined()
            expect(warn).toHaveBeenCalled()
        })
    })

    describe('localStorageRemove / localStorageRemoveAll', () => {
        it('remove 删除指定 key', () => {
            localStorageWrite(KEY, 'hello')
            localStorageRemove(KEY)
            expect(localStorage.getItem(KEY)).toBeNull()
        })

        it('removeAll 清空全部', () => {
            localStorageWrite('a', '1')
            localStorageWrite('b', '2')
            localStorageRemoveAll()
            expect(localStorage.length).toBe(0)
        })
    })
})
