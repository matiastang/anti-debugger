<!--
 * @Author: matiastang
 * @Date: 2024-07-15 14:13:28
 * @LastEditors: matiastang
 * @LastEditTime: 2024-07-15 16:55:08
 * @FilePath: /anti-debugger/DEV_README.md
 * @Description: DEV_README
-->
# anti-debugger

`Web`反调试工具

## 指令

```json
{
    "dev": "vite",
    "ts:build": "tsc --build src/antiDebugger/tsconfig.json",
    "build": "vite --config vite.build.config.ts build --mode production",
    "cp:types": "cp -r src/antiDebugger/buildTypes dist/",
    "cp:type": "cp src/antiDebugger/buildTypes/index.d.ts dist",
    "plugin:build": "pnpm run ts:build && pnpm run build && pnpm run cp:type",
    "push:npm:package": "gulp versionPatch && gulp npmPackagePush",
    "plugin:build:push:npm:package": "pnpm run plugin:build && pnpm run push:npm:package"
}
```

### 运行测试项目

```sh
$ pnpm run dev
```

### 使用符号链接调试

`node_modules`目录下执行链接
```sh
$ cd node_modules
$ ln -s ~/matias/MT/MTGithub/npm/anti-debugger/dist anti-debugger
```
**注意**`dist`的路径要更新为自己项目的路径，且`dist`要包含`package.json`文件。链接名称要和`package.json`中的一致。
**注意**如果使用`npm`或`yarn`则可以使用`npm link`或`yarn link`来调试。

### 发版/更新

```sh
$ pnpm run plugin:build:push:npm:package
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