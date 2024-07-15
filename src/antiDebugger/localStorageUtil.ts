/*
 * @Author: matiastang
 * @Date: 2021-11-12 11:42:05
 * @LastEditors: matiastang
 * @LastEditTime: 2024-07-15 15:19:51
 * @FilePath: /anti-debugger/src/antiDebugger/localStorageUtil.ts
 * @Description: LocalStorage简单封装
 */
/**
 * 存储LocalStorage数据
 * @param key 存储key
 * @param value 存储值（存undefined或null等同于删除）
 */
const localStorageWrite = (
    key: string,
    value?: object | string | boolean | number | symbol | null
) => {
    if (value === undefined || value === null) {
        localStorageRemove(key)
        return
    }
    let saveValue = ''
    if (typeof value === 'object') {
        saveValue = JSON.stringify({
            value,
        })
    }
    if (typeof value === 'string') {
        saveValue = JSON.stringify({
            value,
        })
    }
    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'symbol') {
        saveValue = JSON.stringify({
            value: value.toString(),
        })
    }
    if (typeof value === 'number') {
        if (isNaN(value)) {
            console.warn('value is NaN')
            return
        }
        saveValue = JSON.stringify({
            value: value.toString(),
        })
    }
    localStorage.setItem(key, saveValue)
}

/**
 * 读取LocalStorage数据
 * @param key 存储key
 * @returns 返回类型
 */
const localStorageRead = <T = /* eslint-disable */ any /* eslint-enable */>(key: string) => {
    const localValue = localStorage.getItem(key)
    if (typeof localValue !== 'string') {
        return undefined
    }
    try {
        const value = JSON.parse(localValue).value
        if (value === undefined || value === null) {
            return undefined
        }
        if (typeof value === 'string') {
            return value
        }
        if (typeof value === 'number') {
            if (isNaN(value)) {
                return value
            }
            return value
        }
        if (typeof value === 'boolean') {
            return value
        }
        if (typeof value === 'symbol') {
            return value
        }
        return value as T
    } catch (error) {
        console.warn(error)
        return undefined
    }
}

/**
 * 清除LocalStorage数据
 * @param key 存储key
 * @returns 返回类型
 */
const localStorageRemove = (key: string) => {
    localStorage.removeItem(key)
}

/**
 * 清除所有LocalStorage数据
 * @param key 存储key
 * @returns 返回类型
 */
const localStorageRemoveAll = () => {
    localStorage.clear()
}

export { localStorageWrite, localStorageRead, localStorageRemove, localStorageRemoveAll }
