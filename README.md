<!--
 * @Author: matiastang
 * @Date: 2024-07-15 14:13:28
 * @LastEditors: matiastang
 * @LastEditTime: 2024-07-16 14:56:11
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
  deactivateDebugger: true,
})
```

**提示** 更多参数请自行查找

## 更新说明

### 0.1.0

* 实现基本的反调试功能