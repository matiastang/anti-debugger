/*
 * @Author: matiastang
 * @Date: 2024-04-28 18:04:49
 * @LastEditors: matiastang
 * @LastEditTime: 2024-07-15 15:18:27
 * @FilePath: /anti-debugger/src/antiDebugger/breakpoint.ts
 * @Description: 断点文件
 */
const breakpoint = () => {
    eval('debugger;')
}

export default breakpoint
