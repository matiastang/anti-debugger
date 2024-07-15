/*
 * @Author: matiastang
 * @Date: 2024-04-29 09:43:40
 * @LastEditors: matiastang
 * @LastEditTime: 2024-07-15 15:26:11
 * @FilePath: /anti-debugger/src/antiDebugger/index.ts
 * @Description: Anti-debugging
 */
import devtools from 'devtools-detect'
import breakpoint from './breakpoint'
import customConsole, { ConsoleType } from './customConsole'

/**
 * 配置
 */
export interface AntiDebuggingConfig {
    /**
     * 轮询时间, 默认1000
     */
    timeout?: number
    /**
     * 是否立即执行一次, 默认true
     */
    immediate?: boolean
    /**
     * 是否开启deactivate breakpoints的判定条件, 默认100
     * 仅正数生效
     */
    dbDiff?: number
    /**
     * 是否输出开发日志
     */
    devLog?: boolean
    /**
     * 是否关闭debugger
     */
    deactivateDebugger?: boolean
    /**
     * localStorage中保存的是否关闭debugger key
     * 如果传递了该值，则在localStorage中读取该值
     * 如果该值为true，则关闭debugger
     * 如果该值为false，则检查deactivateDebugger，决定是否关闭debugger
     */
    debuggerLocalStorageKey?: string
    /**
     * 调试工具状态变化
     * @param open 是否打开
     * @returns
     */
    devtoolsChange?: (open: boolean) => void
    /**
     * deactivate breakpoints 状态变化
     * @param open 是否打开
     * @returns
     */
    breakpointsChange?: (open: boolean) => void
    /**
     * 开启 deactivate breakpoints 的处理函数
     * 默认：window.location.replace('about:blank')
     * @returns
     */
    deactivateBreakpoints?: () => void
}

export interface AntiDebuggingOptions extends AntiDebuggingConfig {
    /**
     * 调试工具状态
     * true: 开启调试工具
     * false: 关闭调试工具
     * undefined: 未知
     */
    devtoolsStatus?: boolean
    /**
     * 断点状态
     * true: 关闭断点
     * false: 开启断点
     * undefined: 未知
     */
    breakpointStatus?: boolean
}

// 默认timeout
const NORMAL_TIMEOUT = 1000
// 默认diff
const NORMAL_DIFF = 50

/**
 * 配置
 */
export let options: AntiDebuggingOptions = {
    timeout: NORMAL_TIMEOUT,
    immediate: true,
    dbDiff: NORMAL_DIFF,
    devLog: false,
    deactivateDebugger: false,
}

// interval id
let intervalId: number | null = null

/**
 * log
 * @param message
 */
const devConsole = (
    message?: /* eslint-disable */ any /* eslint-enable */,
    type: ConsoleType = ConsoleType.LOG
) => {
    const { devLog } = options
    devLog && customConsole(message, type)
}

/**
 * 开启interval
 * @param timeout 间隔时间
 * @returns
 */
const setIntervalTime = (timeout?: number | undefined) => {
    clearIntervalTime()
    options.immediate && devtoolsOpen()
    intervalId = window.setInterval(devtoolsOpen, timeout)
    devConsole(`setInterval：${intervalId}`)
}

/**
 * 关闭interval
 * @returns
 */
const clearIntervalTime = () => {
    if (typeof intervalId !== 'number') {
        return
    }
    devConsole(`clearInterval：${intervalId}`)
    intervalId && window.clearInterval(intervalId)
    intervalId = null
}

/**
 * 调试工具打开时处理
 * @returns
 */
const devtoolsOpen = () => {
    const {
        dbDiff,
        deactivateDebugger,
        breakpointStatus,
        breakpointsChange,
        deactivateBreakpoints,
    } = options
    if (deactivateDebugger) {
        return
    }
    const startTime = Date.now()
    breakpoint()
    const endTime = Date.now()
    let maxDiff = NORMAL_DIFF
    if (typeof dbDiff === 'number' && dbDiff > 0) {
        maxDiff = dbDiff
    }
    if (endTime - startTime > maxDiff) {
        if (breakpointStatus) {
            devConsole('breakpointStatus：true->false')
            options.breakpointStatus = false
            breakpointsChange && breakpointsChange(false)
        }
        return
    }
    if (!breakpointStatus) {
        devConsole('breakpointStatus：false->true')
        options.breakpointStatus = true
        breakpointsChange && breakpointsChange(true)
    }
    if (deactivateBreakpoints) {
        deactivateBreakpoints()
        return
    }
    window.location.replace('about:blank')
}

/**
 * 监听开发者工具是否打开状态的变化
 * `devtoolschange`事件并不是标准的监听事件。必须要先读取一下isOpen，监听事件devtoolschange才会生效
 * @param {*} event
 * @returns
 */
window.addEventListener('devtoolschange', (event) => {
    const isOpen = event.detail.isOpen
    options.devtoolsStatus = isOpen
    devConsole(`devtools status：${isOpen}`)
    const { devtoolsChange } = options
    if (isOpen) {
        setIntervalTime()
        devtoolsChange && devtoolsChange(true)
        return
    }
    clearIntervalTime()
    devtoolsChange && devtoolsChange(false)
})

/**
 * 检查localStorage中保存的是否关闭debugger状态
 * @param key
 */
const checkLocalStorage = (key: string) => {
    const value = getLocalStorageDebugger(key)
    devConsole(`localStorage deactivate debugger status：${value}`)
    if (value) {
        options.deactivateDebugger = true
    }
}

/**
 * 获取LocalStorage中的调试设置
 * @param key
 * @returns
 */
const getLocalStorageDebugger = (key: string) => {
    const localValue = localStorage.getItem(key)
    if (typeof localValue !== 'string') {
        return false
    }
    try {
        const value = JSON.parse(localValue).value
        return Boolean(value)
    } catch (error) {
        devConsole(error, ConsoleType.ERROR)
        return false
    }
}

/**
 * anti-debugging
 * @param config 配置参数
 */
const antiDebugging = (config?: AntiDebuggingConfig) => {
    options = { ...options, ...config }
    const isOpen = devtools.isOpen
    options.devtoolsStatus = isOpen
    const localKey = options.debuggerLocalStorageKey
    if (localKey) {
        checkLocalStorage(localKey)
    }
    devConsole('====== config ======')
    devConsole(options)
    devConsole(`init devtools status：${isOpen}`)
    const { devtoolsChange } = options
    if (isOpen) {
        setIntervalTime()
        devtoolsChange && devtoolsChange(true)
        return
    }
    devtoolsChange && devtoolsChange(false)
}

export default antiDebugging
