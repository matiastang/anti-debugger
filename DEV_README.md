<!--
 * @Author: matiastang
 * @Date: 2024-07-15 14:13:28
 * @LastEditors: matiastang
 * @LastEditTime: 2024-07-15 16:32:50
 * @FilePath: /anti-debugger/DEV_README.md
 * @Description: DEV_README
-->
# anti-debugger

`Web`反调试工具

## 发版/更新

```sh
$ plugin:build:push:npm:package
```

## 依赖文件

### dependencies

* `devtools-detect`调试工具状态监听

### devDependencies

* `vue`页面测试
* `vue-router`页面路由
* `vite`打包
* `typescript`使用`ts`
* `path`路径
* `@vitejs/plugin-vue`解析`.vue`文件
* `vite-plugin-compression`使用`GZIP`压缩
* `rollup-plugin-terser`代码压缩，依赖`rollup`
* `eslint`校验
* `@vue/eslint-config-prettier`、`eslint-plugin-prettier`、`@typescript-eslint/eslint-plugin"`、`@typescript-eslint/parser`修复
* `less`、`less-loader`样式
* `ts-node`、`tslib`、`@types/node`
* `gulp`、`@types/gulp`、`shelljs`、`@types/shelljs`、`minimist`、`@types/minimist`、`gulp-bump`、`@types/gulp-bump`。`gulp`相关
```sh
$ pnpm add -D gulp@4
$ pnpm add -D --ignore-scripts gulp@4
```