/*
 * @Author: matiastang
 * @Date: 2024-07-30 16:59:05
 * @LastEditors: matiastang
 * @LastEditTime: 2024-07-30 18:05:18
 * @FilePath: /anti-debugger/src/antiDebugger/checkers/performanceChecker.ts
 * @Description: 性能检测是否打开调试
 */
let largeObjectArray: Record<string, string>[] | null = null

function getLargeObjectArray() {
    if (largeObjectArray === null) {
        largeObjectArray = createLargeObjectArray()
    }
    return largeObjectArray
}

function createLargeObject(): Record<string, string> {
    const largeObject: Record<string, string> = {}
    for (let i = 0; i < 500; i++) {
        largeObject[`${i}`] = `${i}`
    }
    return largeObject
}

function createLargeObjectArray(): Record<string, string>[] {
    const largeObject = createLargeObject()
    const largeObjectArray: Record<string, string>[] = []

    for (let i = 0; i < 50; i++) {
        largeObjectArray.push(largeObject)
    }

    return largeObjectArray
}

function calcTablePrintTime(): number {
    const largeObjectArray = getLargeObjectArray()
    const start = Date.now()
    console.time()
    console.table(largeObjectArray)
    console.timeEnd()
    const diff = Date.now() - start
    console.log(diff)
    return diff
}

function calcLogPrintTime(): number {
    const largeObjectArray = getLargeObjectArray()
    const start = Date.now()
    console.time('table')
    console.log(largeObjectArray)
    // console.timeEnd()
    console.timeLog('table')

    // console.time('process');
    // const value = expensiveProcess1(); // Returns 42
    // console.timeLog('process', value);
    // // Prints "process: 365.227ms 42".
    // doExpensiveProcess2(value);
    // console.timeEnd('process');

    const diff = Date.now() - start
    console.log(diff)
    return diff
}

let maxPrintTime = 0

export const performanceCheckerIsOpen = () => {
    const tablePrintTime = calcTablePrintTime()
    const logPrintTime = Math.max(calcLogPrintTime(), calcLogPrintTime())

    // console.clear()
    maxPrintTime = Math.max(maxPrintTime, logPrintTime)

    if (tablePrintTime === 0) return false
    // if (maxPrintTime <= 0) {
    //     return false
    // }
    console.log(tablePrintTime, maxPrintTime)
    return tablePrintTime > maxPrintTime * 10
}
