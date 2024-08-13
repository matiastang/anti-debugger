<!--
 * @Author: matiastang
 * @Date: 2024-07-15 14:13:28
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-13 15:06:53
 * @FilePath: /anti-debugger/README.md
 * @Description: README
-->
# anti-debugger

`Web`反调试工具

## 安装

* `pnpm`
```sh
$ pnpm add -D anti-debugger
```
* `yarn`
```sh
$ yarn add -D anti-debugger
```
* `npm`
```sh
$ npm install -D anti-debugger
```

## 使用

* 在`main.ts`中引入并开启
```ts
import antiDebugger from 'anti-debugger'

antiDebugger()
```

* 测试阶段可以屏蔽，推荐使用环境变量控制。
```ts
import antiDebugger from 'anti-debugger'

antiDebugger({
    /**
     * 轮询时间, 默认1000
     */
    // timeout: 1000,
    /**
     * 是否立即执行一次, 默认true
     */
    // immediate: true,
    /**
     * 是否开启deactivate breakpoints的判定条件, 默认100
     * 仅正数生效
     */
    // dbDiff: 100,
    /**
     * 是否输出开发日志
     */
    devLog: true,
    /**
     * 是否关闭debugger
     */
    deactivateDebugger: false,
    /**
     * localStorage中保存的是否关闭debugger key
     * 如果传递了该值，则在localStorage中读取该值
     * 如果该值为true，则关闭debugger
     * 如果该值为false，则检查deactivateDebugger，决定是否关闭debugger
     */
    // debuggerLocalStorageKey: 'ANTI-DEBUGGER',
})
```

**提示** `devLog`和`deactivateDebugger`最好通过环境变量设置， 更多参数请自行查找。

**警告** 由于使用了`eval`，可能会收到如下提示：
```sh
Use of eval in "****" is strongly discouraged as it poses security risks and may cause issues with minification.
```

## 版本

### v0.2.0

* 添加性能分析，判断`Undock`状态。
* 优化检测模式，引入动态时间间隔检查。

### v0.1.0

* 实现基本的反调试功能