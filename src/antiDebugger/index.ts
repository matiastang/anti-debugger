/*
 * @Author: matiastang
 * @Date: 2024-04-29 09:43:40
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-13 15:00:34
 * @FilePath: /anti-debugger/src/antiDebugger/index.ts
 * @Description: Anti-debugging
 */
import devtools from 'devtools-detect'
import type { DevToolsEvent } from 'devtools-detect'
import breakpoint from './breakpoint'
import customConsole, { ConsoleType } from './customConsole'
import { performanceCheckerIsOpen } from './checkers/performanceChecker'
import { generatorLoop, generatorForeverLoopRules } from './timers/generatorLoop'

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

/**
 * 反调试入口函数类型（default export 上挂载 destroy）
 */
export interface AntiDebuggingFn {
    /**
     * 开启反调试（重复调用会重置上一轮运行状态后重新初始化）
     */
    (config?: AntiDebuggingConfig): void
    /**
     * 销毁反调试：停止轮询与探测、移除事件监听、重置状态
     * 注意：销毁后再次调用 antiDebugger() 会重新初始化，但事件监听不会自动恢复
     */
    destroy: () => void
}

// 默认timeout
const NORMAL_TIMEOUT = 1000
// 默认diff（与README/接口注释对齐）
const NORMAL_DIFF = 100
// 时间篡改判定阈值：performance.now 与 Date.now 两个时钟的耗时差超过该值，
// 说明其中一个被 hook（如攻击者替换 Date.now），直接按断点失效处理
const TAMPER_DIFF = 100

/**
 * 生成默认配置（每次返回新对象，避免共享引用突变）
 */
const defaultOptions = (): AntiDebuggingOptions => ({
    timeout: NORMAL_TIMEOUT,
    immediate: true,
    dbDiff: NORMAL_DIFF,
    devLog: false,
    deactivateDebugger: false,
})

/**
 * 配置
 */
export let options: AntiDebuggingOptions = defaultOptions()

// interval id
let intervalId: number | null = null
// Undock 周期探测取消函数
let cancelProbeLoop: (() => void) | null = null
// 是否已销毁（销毁后忽略异步回调与事件）
let destroyed = false

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
 * 执行惩罚（断点失效 / 时间被篡改时立即执行，不给关闭调试工具的竞态窗口）
 */
const executePunish = () => {
    const { deactivateBreakpoints } = options
    if (deactivateBreakpoints) {
        deactivateBreakpoints()
        return
    }
    window.location.replace('about:blank')
}

/**
 * 开启interval
 * @param timeout 间隔时间
 * @returns
 */
const setIntervalTime = (timeout?: number | undefined) => {
    clearIntervalTime()

    const loop = () => {
        intervalId = window.setTimeout(() => {
            const nextRun = devtoolsOpen()
            if (nextRun && options.devtoolsStatus && !destroyed) {
                loop()
            } else {
                clearIntervalTime()
            }
        }, timeout)
    }

    if (options.immediate) {
        const nextRun = devtoolsOpen()
        if (!nextRun) {
            return
        }
    }
    options.devtoolsStatus && loop()
}

/**
 * 关闭interval
 * @returns
 */
const clearIntervalTime = () => {
    if (typeof intervalId !== 'number') {
        return
    }
    devConsole(`clearTimeout${intervalId}`)
    intervalId && window.clearTimeout(intervalId)
    intervalId = null
}

/**
 * 调试工具打开时处理：执行debugger并计时
 * - 耗时超过dbDiff：断点生效（debugger暂停过），继续循环卡住调试器
 * - 耗时极短或两时钟差值异常：断点失效（deactivate breakpoints）或计时被篡改，立即惩罚
 * @returns 是否继续循环
 */
const devtoolsOpen = (): boolean => {
    const { dbDiff, deactivateDebugger, breakpointStatus, breakpointsChange } = options
    if (deactivateDebugger) {
        return true
    }
    const startPerformance = performance.now()
    const startWall = Date.now()
    try {
        breakpoint()
    } catch (error) {
        console.error(error)
        return true
    }
    const performanceDiff = performance.now() - startPerformance
    const wallDiff = Date.now() - startWall
    // 时钟交叉验证：真实暂停会让两个时钟同步变慢，只有一个时钟异常说明被篡改
    const tampered = Math.abs(performanceDiff - wallDiff) > TAMPER_DIFF
    let maxDiff = NORMAL_DIFF
    if (typeof dbDiff === 'number' && dbDiff > 0) {
        maxDiff = dbDiff
    }
    if (!tampered && performanceDiff > maxDiff) {
        if (breakpointStatus) {
            devConsole('breakpointStatus：true->false')
            options.breakpointStatus = false
            breakpointsChange && breakpointsChange(false)
        }
        return true
    }
    if (!breakpointStatus) {
        devConsole('breakpointStatus：false->true')
        options.breakpointStatus = true
        breakpointsChange && breakpointsChange(true)
    }
    if (tampered) {
        devConsole('time clock tampered')
    }
    // 断点失效 / 时间被篡改 -> 立即惩罚
    executePunish()
    return false
}

/**
 * 启动 Undock 周期探测（间隔序列 1000, 2000, 4000 循环），
 * 覆盖"页面加载一段时间后才以分离窗口方式打开调试工具"的盲区
 */
const startProbeLoop = () => {
    cancelProbeLoop?.()
    cancelProbeLoop = generatorLoop(
        generatorForeverLoopRules(500, 4000),
        () => {
            void handlePerformanceOpen()
            // 探测为异步，调度恒继续；检测到打开后由 handlePerformanceOpen 负责取消
            return true
        },
        {
            immediate: false,
            devLog: false,
        }
    )
}

/**
 * 周期探测回调：性能检测判定打开则视作 devtools 开启
 */
const handlePerformanceOpen = async () => {
    const { devLog } = options
    const isPerformanceOpen = await performanceCheckerIsOpen(!devLog)
    devConsole(`devtools performance status：${isPerformanceOpen}`)
    if (!isPerformanceOpen || options.devtoolsStatus || destroyed) {
        return
    }
    cancelProbeLoop?.()
    cancelProbeLoop = null
    options.devtoolsStatus = true
    setIntervalTime(options.timeout)
    const { devtoolsChange } = options
    devtoolsChange && devtoolsChange(true)
}

/**
 * devtoolschange 关闭事件的兜底处理：
 * 性能探测（Undock 场景）确认未打开才真正关闭，否则保持拦截
 */
const handlePerformanceClose = async () => {
    const { devLog } = options
    const isPerformanceOpen = await performanceCheckerIsOpen(!devLog)
    devConsole(`devtools performance status：${isPerformanceOpen}`)
    if (destroyed) {
        return
    }
    if (isPerformanceOpen) {
        options.devtoolsStatus = true
        setIntervalTime(options.timeout)
        const { devtoolsChange } = options
        devtoolsChange && devtoolsChange(true)
        return
    }
    options.devtoolsStatus = false
    const { devtoolsChange } = options
    devtoolsChange && devtoolsChange(false)
    // 重启周期探测
    startProbeLoop()
}

/**
 * 监听开发者工具是否打开状态的变化
 * `devtoolschange`事件并不是标准的监听事件。必须要先读取一下isOpen，监听事件devtoolschange才会生效
 * @param {*} event
 * @returns
 */
const devtoolsChangeListener = (event: DevToolsEvent) => {
    if (destroyed) {
        return
    }
    const isOpen = event.detail.isOpen || event.eventPhase === 0
    // console.log(event.detail.isOpen, event.eventPhase)
    options.devtoolsStatus = isOpen
    devConsole(`devtools status：${isOpen}`)
    const { devtoolsChange } = options
    if (isOpen) {
        cancelProbeLoop?.()
        cancelProbeLoop = null
        setIntervalTime(options.timeout)
        devtoolsChange && devtoolsChange(true)
        return
    }
    // 关闭事件：先同步停掉轮询（避免过渡期断点快速通过触发误惩罚），再异步探测兜底
    clearIntervalTime()
    void handlePerformanceClose()
}

window.addEventListener('devtoolschange', devtoolsChangeListener)

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
const antiDebugging = ((config?: AntiDebuggingConfig) => {
    // 重复初始化：先清理上一轮运行状态，避免残留
    clearIntervalTime()
    cancelProbeLoop?.()
    cancelProbeLoop = null
    destroyed = false
    options = { ...defaultOptions(), ...config }

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
        setIntervalTime(options.timeout)
        devtoolsChange && devtoolsChange(true)
        return
    }
    devtoolsChange && devtoolsChange(false)
    // Undock 周期探测
    startProbeLoop()
}) as AntiDebuggingFn

/**
 * 销毁反调试：停止轮询与探测、移除事件监听、重置状态
 */
const destroyAntiDebugger = () => {
    clearIntervalTime()
    cancelProbeLoop?.()
    cancelProbeLoop = null
    window.removeEventListener('devtoolschange', devtoolsChangeListener)
    options = defaultOptions()
    destroyed = true
}

antiDebugging.destroy = destroyAntiDebugger

export default antiDebugging
