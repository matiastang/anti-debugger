/*
 * @Author: your name
 * @Date: 2021-10-15 17:10:16
 * @LastEditTime: 2024-07-15 17:07:07
 * @LastEditors: matiastang
 * @Description: In User Settings Edit
 * @FilePath: /anti-debugger/src/main.ts
 */
import { createApp } from 'vue'
import App from '@/App.vue'
import router from '@/router'
import _package from '../package.json'
// 本地反调试导入
// import antiDebugger from './antiDebugger'
import antiDebugger from 'anti-debugger'

const app = createApp(App)

// 路由
app.use(router)

// 挂载
app.mount('#app')

// 反调试
// antiDebugger()

// 定义调试KEY
antiDebugger({
    debuggerLocalStorageKey: 'ANTI-DEBUGGER',
})

// 所有参数
// antiDebugger({
//     /**
//      * 轮询时间, 默认1000
//      */
//     timeout: 1000,
//     /**
//      * 是否立即执行一次, 默认true
//      */
//     immediate: true,
//     /**
//      * 是否开启deactivate breakpoints的判定条件, 默认100
//      * 仅正数生效
//      */
//     dbDiff: 100,
//     /**
//      * 是否输出开发日志
//      */
//     devLog: false,
//     /**
//      * 是否关闭debugger
//      */
//     deactivateDebugger: false,
//     /**
//      * localStorage中保存的是否关闭debugger key
//      * 如果传递了该值，则在localStorage中读取该值
//      * 如果该值为true，则关闭debugger
//      * 如果该值为false，则检查deactivateDebugger，决定是否关闭debugger
//      */
//     debuggerLocalStorageKey: 'ANTI-DEBUGGER',
//     /**
//      * 调试工具状态变化
//      * @param open 是否打开
//      * @returns
//      */
//     devtoolsChange: (open: boolean) => {
//         console.log(`devtools ${open ? '开启' : '关闭'}`)
//     },
//     /**
//      * deactivate breakpoints 状态变化
//      * @param open 是否打开
//      * @returns
//      */
//     breakpointsChange: (open: boolean) => {
//         console.log(`deactivate breakpoints ${open ? '开启' : '关闭'}`)
//     },
//     /**
//      * 开启 deactivate breakpoints 的处理函数
//      * 默认：window.location.replace('about:blank')
//      * @returns
//      */
//     deactivateBreakpoints: () => {
//         console.log('检查到开启：deactivate breakpoints')
//         window.location.replace('about:blank')
//     },
// })

// 打印版本信息
const print = (key: string, value: string) =>
    console.log(
        `%c ${key} %c ${value} %c `,
        'background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
        'background:rgb(65, 184, 131) ;padding: 1px; border-radius: 0 3px 3px 0;  color: #fff; font-weight: bold;',
        'background:transparent'
    )
print('Vue Version', app.version)
print(_package.name, _package.version)
