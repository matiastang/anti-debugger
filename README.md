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

-   `pnpm`

```sh
$ pnpm add -D anti-debugger
```

-   `yarn`

```sh
$ yarn add -D anti-debugger
```

-   `npm`

```sh
$ npm install -D anti-debugger
```

## 使用

-   在`main.ts`中引入并开启

```ts
import antiDebugger from 'anti-debugger'

antiDebugger()
```

-   测试阶段可以屏蔽，推荐使用环境变量控制。

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

## 关闭反调试

需要停止反调试时（如 SPA 特定场景），调用`destroy`：

```ts
import antiDebugger from 'anti-debugger'

antiDebugger()

// 停止反调试：停止轮询与探测、移除事件监听、重置状态
antiDebugger.destroy()
```

**注意** `destroy`后事件监听不会自动恢复，需要重新初始化时请刷新页面。重复调用`antiDebugger()`会先清理上一轮运行状态再重新初始化。

## 版本

### v0.3.0

-   修复`timeout`配置未生效的问题（轮询间隔默认`1000ms`）。
-   修复同步版`generatorLoop`的`immediate`行为与异步版不一致的问题。
-   修复无限循环序列回绕判定（达到`max`即回绕）。
-   `dbDiff`默认值与文档对齐（`100`）。
-   惩罚（跳转`about:blank`）改为立即执行，关闭"800ms内关闭DevTools取消惩罚"的竞态窗口。
-   断点计时改用`performance.now()`并与`Date.now()`交叉验证，防御时间钩子篡改。
-   `Undock`（分离窗口）检测改为周期性探测（间隔`2000/4000`循环），覆盖页面加载一段时间后才打开的场景。
-   性能探测连续两轮确认+绝对耗时下限（`10ms`）+`console`被hook时提高阈值，大幅降低误判。
-   新增`destroy()`方法与重复初始化状态重置。

### v0.2.0

-   添加性能分析，判断`Undock`状态。
-   优化检测模式，引入动态时间间隔检查。

### v0.1.0

-   实现基本的反调试功能
