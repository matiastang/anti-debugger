/*
 * customConsole 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import customConsole, {
    ConsoleType,
    consoleLog,
    consoleInfo,
    consoleWarn,
    consoleError,
    highlightConsole,
} from '../customConsole'

describe('customConsole', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('默认走 console.log', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {})
        customConsole('default')
        expect(log).toHaveBeenCalledWith('default')
    })

    it('四种 ConsoleType 分发到对应 console 方法', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {})
        const info = vi.spyOn(console, 'info').mockImplementation(() => {})
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const error = vi.spyOn(console, 'error').mockImplementation(() => {})

        customConsole('m', ConsoleType.LOG)
        customConsole('m', ConsoleType.INFO)
        customConsole('m', ConsoleType.WARN)
        customConsole('m', ConsoleType.ERROR)

        expect(log).toHaveBeenCalledWith('m')
        expect(info).toHaveBeenCalledWith('m')
        expect(warn).toHaveBeenCalledWith('m')
        expect(error).toHaveBeenCalledWith('m')
    })

    it('consoleLog/consoleInfo/consoleWarn/consoleError 快捷方法', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {})
        const info = vi.spyOn(console, 'info').mockImplementation(() => {})
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const error = vi.spyOn(console, 'error').mockImplementation(() => {})

        consoleLog('a')
        consoleInfo('b')
        consoleWarn('c')
        consoleError('d')

        expect(log).toHaveBeenCalledWith('a')
        expect(info).toHaveBeenCalledWith('b')
        expect(warn).toHaveBeenCalledWith('c')
        expect(error).toHaveBeenCalledWith('d')
    })

    it('highlightConsole 以 %c 样式参数调用 console.log', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {})
        highlightConsole('key', 'value')
        expect(log).toHaveBeenCalledTimes(1)
        const args = log.mock.calls[0]
        // 格式字符串为 ` %c key %c value %c `，其后跟 3 个样式参数
        expect(String(args[0])).toContain('%c')
        expect(String(args[0])).toContain('key')
        expect(String(args[0])).toContain('value')
        expect(args).toHaveLength(4)
    })
})
