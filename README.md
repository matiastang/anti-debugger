<!--
 * @Author: matiastang
 * @Date: 2024-07-15 14:13:28
 * @LastEditors: matiastang
 * @LastEditTime: 2024-07-15 16:33:13
 * @FilePath: /anti-debugger/README.md
 * @Description: README
-->
# anti-debugger

`Web`反调试工具

## 安装

```sh
$ pnpm add -D anti-debugger
```

## 使用

* 在`main.ts`中引入
```ts
import antiDebugger from 'anti-debugger'

antiDebugger()
```