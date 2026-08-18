/*
 * @Author: matiastang
 * @Date: 2024-07-30 16:59:05
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-13 11:18:51
 * @FilePath: /anti-debugger/src/antiDebugger/checkers/performanceChecker.ts
 * @Description: 性能检测是否打开调试（多轮确认 + instrumentation 免疫，降低误判）
 */
// 对象数组
let largeObjectArray: Record<string, string>[] | null = null

/**
 * 获取创建的对象数组
 * @returns
 */
const getLargeObjectArray = (): Record<string, string>[] => {
    if (largeObjectArray === null) {
        largeObjectArray = createLargeObjectArray()
    }
    return largeObjectArray
}

/**
 * 创建一个大对象
 * @returns
 */
const createLargeObject = (): Record<string, string> => {
    const largeObject: Record<string, string> = {}
    for (let i = 0; i < 500; i++) {
        largeObject[`${i}`] = `${i}`
    }
    return largeObject
}

/**
 * 创建一个大对象数组
 * @returns
 */
const createLargeObjectArray = (): Record<string, string>[] => {
    const largeObject = createLargeObject()
    const largeObjectArray: Record<string, string>[] = []

    for (let i = 0; i < 50; i++) {
        largeObjectArray.push(largeObject)
    }

    return largeObjectArray
}

/**
 * table 打印时间
 * @returns
 */
const calcTablePrintTime = (): number => {
    const largeObjectArray = getLargeObjectArray()

    const startTime: number = performance.now()
    console.time()
    console.table(largeObjectArray)
    console.timeEnd()
    const endTime: number = performance.now()
    const duration: number = endTime - startTime

    console.log(duration)
    return duration
}

/**
 * log 打印时间
 * @returns
 */
const calcLogPrintTime = (): number => {
    const largeObjectArray = getLargeObjectArray()

    const startTime: number = performance.now()
    console.time()
    console.log(largeObjectArray)
    console.timeEnd()
    const endTime: number = performance.now()
    const duration: number = endTime - startTime

    console.log(duration)
    return duration
}

// 最大的 log print 时间
let maxLogPrintTime = 0

/**
 * 判定阈值（导出便于测试）
 * 标定依据（Chrome 151 实测，50x500 对象数组）：
 * - DevTools 打开：table ~17-24ms，log ~0.15ms
 * - 无 DevTools：table ~0.5-2ms，log ~0.1ms
 * 绝对下限取 10ms 可区分两者；比值阈值兜底
 */
// table 打印耗时的绝对下限（ms）：无 DevTools 时 table 打印接近零，打开时远高于 10ms
export const PERFORMANCE_FLOOR = 10
// table 与 log 最大耗时的比值阈值
export const PERFORMANCE_RATIO = 10
// console 被页面内脚本 hook（如监控 SDK）时，console.table/log 不再是原生函数，
// 计时基线不可信 -> 提高判定阈值降低误判
export const HOOKED_FLOOR = 50
export const HOOKED_RATIO = 20
// 连续确认轮数与轮间隔
const PROBE_ROUNDS = 2
const PROBE_INTERVAL = 200

/**
 * console 方法是否为原生实现（被 hook 时 toString 不含 [native code]）
 */
const isNativeConsole = () =>
    `${console.table}`.includes('native code') && `${console.log}`.includes('native code')

/**
 * 单轮探测：table 打印超过绝对下限且超过 log 基线的指定倍数才判定打开
 */
const singleProbe = (): boolean => {
    const tablePrintTime = calcTablePrintTime()
    const logPrintTime = calcLogPrintTime()
    maxLogPrintTime = Math.max(maxLogPrintTime, logPrintTime)
    console.log(tablePrintTime, maxLogPrintTime)

    const native = isNativeConsole()
    const floor = native ? PERFORMANCE_FLOOR : HOOKED_FLOOR
    const ratio = native ? PERFORMANCE_RATIO : HOOKED_RATIO
    if (tablePrintTime <= floor) {
        return false
    }
    if (maxLogPrintTime <= 0) {
        return false
    }
    return tablePrintTime > maxLogPrintTime * ratio
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * 性能分析判断是否打开了调试工具。
 * 连续 PROBE_ROUNDS 轮探测（间隔 PROBE_INTERVAL）都满足才判定打开，
 * 任一轮不满足立即返回 false（保守取向，压低误判率）。
 * @returns
 */
export const performanceCheckerIsOpen = async (hideLog: boolean = true): Promise<boolean> => {
    for (let round = 0; round < PROBE_ROUNDS; round++) {
        const opened = singleProbe()
        hideLog && console.clear()
        if (!opened) {
            return false
        }
        if (round < PROBE_ROUNDS - 1) {
            await sleep(PROBE_INTERVAL)
        }
    }
    return true
}
