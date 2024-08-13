/*
 * @Author: matiastang
 * @Date: 2024-07-30 16:59:05
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-13 11:18:51
 * @FilePath: /anti-debugger/src/antiDebugger/checkers/performanceChecker.ts
 * @Description: 性能检测是否打开调试
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

    // 如果你需要更频繁地测量时间差，可以这样使用
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
 * 性能分析判断是否打开了调试工具。
 * @returns
 */
export const performanceCheckerIsOpen = (hideLog: boolean = true): boolean => {
    const tablePrintTime = calcTablePrintTime()
    const logPrintTime = calcLogPrintTime()
    maxLogPrintTime = Math.max(maxLogPrintTime, logPrintTime)
    console.log(tablePrintTime, maxLogPrintTime)
    hideLog && console.clear()
    if (tablePrintTime <= 0) return false
    if (maxLogPrintTime <= 0) {
        return false
    }
    return tablePrintTime > maxLogPrintTime * 10
}
