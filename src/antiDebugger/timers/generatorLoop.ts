/*
 * @Author: matiastang
 * @Date: 2023-06-09 10:04:42
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-13 11:29:44
 * @FilePath: /anti-debugger/src/antiDebugger/timers/generatorLoop.ts
 * @Description: 定时器通过生成器循环
 */
export interface GeneratorLoopConfig {
    /**
     * 是否立即执行一次处理函数,默认false
     */
    immediate?: boolean
    /**
     * 是否开启调试日志,默认false
     */
    devLog?: boolean
}

/**
 * 定时器通过生成器循环
 * @param rules
 * @param callback
 * @param config
 * @returns
 */
export const generatorLoop = (
    rules: Generator<number, void>,
    callback: () => boolean,
    config: GeneratorLoopConfig = {
        immediate: false,
        devLog: false,
    }
) => {
    const { immediate, devLog } = config

    let timeoutid: any | null = null

    const ruleLoop = () => {
        const rule = rules.next()
        if (rule.done) {
            devLog && console.info(`[${new Date().getTime()}]: generator done`)
            timeoutid = null
            return
        }
        devLog && console.info(`[${new Date().getTime()}]: start timeout`)
        timeoutid = setTimeout(() => {
            devLog && console.info(`[${new Date().getTime()}]: >>> call back`)
            const nextRun = callback()
            devLog && console.info(`[${new Date().getTime()}]: <<< call back`)
            if (nextRun) {
                ruleLoop()
            } else {
                devLog && console.info(`[${new Date().getTime()}]: call back return stop`)
            }
        }, rule.value || 0)
    }

    const cancel = () => {
        if (timeoutid === null) {
            return
        }
        devLog && console.info(`[${new Date().getTime()}]: clear timeout`)
        clearTimeout(timeoutid)
    }

    if (immediate) {
        devLog && console.info(`[${new Date().getTime()}]: >>> immediate call back`)
        const nextRun = callback()
        devLog && console.info(`[${new Date().getTime()}]: <<< immediate call back`)
        if (nextRun) {
            ruleLoop()
        } else {
            devLog && console.info(`[${new Date().getTime()}]: immediate call back return stop`)
        }
    }

    ruleLoop()

    return cancel
}

/**
 * 测试函数固定生成: 1000, 2000, 4000, 8000, 16000
 */
function* generatorLoopRules() {
    let value = 1000
    while (value <= 16000) {
        yield value
        value = value * 2
    }
}

export const testGeneratorLoopRules = generatorLoopRules

/**
 * 一直产生1000, 2000, 4000, 8000, 16000的循环序列
 * 注意，这个函数不会停止，除非你手动调用cancel函数
 */
function* generatorForeverLoopRules(min: number = 500, max: number = 16000, multiple: number = 2) {
    let current = min
    while (true) {
        const value = current * multiple
        yield value
        current = value > max ? min : value
    }
}

export const testGeneratorForeverLoopRules = generatorForeverLoopRules

export default generatorLoop
