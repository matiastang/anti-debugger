/*
 * @Author: matiastang
 * @Date: 2024-04-29 15:19:02
 * @LastEditors: matiastang
 * @LastEditTime: 2024-07-15 15:18:35
 * @FilePath: /anti-debugger/src/antiDebugger/customConsole.ts
 * @Description: 自定义日志
 */

/**
 * 日志类型
 */
export enum ConsoleType {
    LOG = 'log',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}
/**
 * log
 * @param message
 */
export const consoleLog = (message?: /* eslint-disable */ any /* eslint-enable */) => {
    customConsole(message, ConsoleType.LOG)
}

/**
 * info
 * @param message
 */
export const consoleInfo = (message?: /* eslint-disable */ any /* eslint-enable */) => {
    customConsole(message, ConsoleType.INFO)
}

/**
 * warn
 * @param message
 */
export const consoleWarn = (message?: /* eslint-disable */ any /* eslint-enable */) => {
    customConsole(message, ConsoleType.WARN)
}

/**
 * error
 * @param message
 */
export const consoleError = (message?: /* eslint-disable */ any /* eslint-enable */) => {
    customConsole(message, ConsoleType.ERROR)
}

/**
 * 自定义console
 * @param message
 * @param type
 */
const customConsole = (
    message?: /* eslint-disable */ any /* eslint-enable */,
    type: ConsoleType = ConsoleType.LOG
) => {
    if (type === ConsoleType.LOG) {
        console.log(message)
    } else if (type === ConsoleType.INFO) {
        console.info(message)
    } else if (type === ConsoleType.WARN) {
        console.warn(message)
    } else {
        console.error(message)
    }
}

/**
 * 高亮键值对提示
 * @param key
 * @param value
 * @returns
 */
export const highlightConsole = (key: string, value: string) => {
    console.log(
        `%c ${key} %c ${value} %c `,
        'background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
        'background:rgb(65, 184, 131) ;padding: 1px; border-radius: 0 3px 3px 0;  color: #fff; font-weight: bold;',
        'background:transparent'
    )
}

export default customConsole
