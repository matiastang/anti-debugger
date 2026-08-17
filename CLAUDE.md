# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

`anti-debugger` 是一个发布到 npm 的 Web 反调试工具库（TypeScript）。仓库同时包含一个 Vue 3 测试工程（playground），用于在浏览器中实际验证反调试效果。

-   包管理器使用 **pnpm**
-   没有测试框架；代码规范由 `eslint.config.mjs`（ESLint 9 flat config）+ `.prettierrc` 约束（4 空格缩进、无分号、单引号；package.json 例外为 2 空格）
-   提交信息风格：`feat: - xxx` / `fix: - xxx`（见 git 历史）
-   pre-commit 钩子（husky + lint-staged）对暂存文件自动跑 `prettier --write` + `eslint --fix`
-   GitHub Actions（`.github/workflows/ci.yml`）：push 到 main 或 PR 到 main 时跑 format:check / lint / typecheck / plugin:build

## 常用命令

```sh
# 启动测试工程（vite，端口 3002，strictPort）
pnpm run dev

# 完整构建 npm 包（生成类型 + 库构建 + 拷贝 d.ts 到 dist/）
pnpm run plugin:build

# 校验（CI 同款）
pnpm lint          # ESLint（flat config）
pnpm typecheck     # vue-tsc 全量类型检查（含 .vue）
pnpm format:check  # Prettier 格式检查
pnpm format        # Prettier 全量格式化

# 仅生成 .d.ts 类型文件（输出到 src/antiDebugger/buildTypes/）
pnpm run ts:build

# 仅 vite 库模式构建（输出到 dist/，es/cjs/umd/iife 四种格式，terser 压缩）
pnpm run build
```

发布到 npm（作者启用了 2FA，不能用自动发布命令）：

```sh
pnpm run plugin:build
npm publish --registry https://registry.npmjs.org --otp=******
```

## 架构

仓库是"一个库 + 一个测试壳"的双层结构，两套 vite 配置分别对应：

-   `vite.config.ts` — playground（Vue 3 + vue-router），构建产物在 `build/`
-   `vite.build.config.ts` — 库模式（入口 `src/antiDebugger/index.ts`），产物在 `dist/`，`package.json` 的 `files` 只包含 `dist`

### 反调试核心（src/antiDebugger/）

`index.ts` 是唯一入口，导出 `antiDebugging(config)`，检测逻辑由三种机制组成：

1. **devtools 开关监听**：依赖 `devtools-detect` 包的 `devtoolschange` 事件。注意：必须先读取一次 `devtools.isOpen`，事件监听才会生效。
2. **debugger 断点计时**（`breakpoint.ts`）：执行 `eval('debugger;')` 并测量耗时。耗时超过 `dbDiff`（默认 50ms）说明断点生效（devtools 打开且暂停）；耗时极短说明用户"deactivate breakpoints"了 —— 这是恶意逆向行为，默认处置为 `window.location.replace('about:blank')`（可通过 `deactivateBreakpoints` 回调自定义）。
3. **性能检测**（`checkers/performanceChecker.ts`）：比较 `console.table` 与 `console.log` 打印大对象数组的耗时（相差 10 倍以上判定为打开），用于检测 devtools 关闭状态（Undock 场景），弥补 `devtools-detect` 的盲区。

### 定时调度（src/antiDebugger/timers/）

`generatorLoop.ts` / `asyncGeneratorLoop.ts` 用生成器产生递增的 setTimeout 间隔序列（如 1000→2000→3000），回调返回 `false` 即停止循环，返回 cancel 函数用于取消。这是检测轮询的底层机制，避免暴露可被断点的 `setInterval`。

### 运行时状态

`index.ts` 的模块级 `options`（`AntiDebuggingOptions`）保存全局状态（`devtoolsStatus`、`breakpointStatus` 等），`antiDebugging()` 被调用时合并配置。

## 开发注意事项

-   **本地源码 vs 已发布包**：`src/main.ts` 中默认 `import antiDebugger from './antiDebugger'`（本地源码）；要测试 npm 上已发布版本时切换为 `import antiDebugger from 'anti-debugger'`，或按 `DEV_README.md` 用符号链接调试。
-   **测试时关闭反调试**：设置 localStorage `ANTI-DEBUGGER` 为 true（通过 `debuggerLocalStorageKey` 配置的 key）可让 debugger 失效，方便开发调试。
-   **eval 警告是预期的**：构建时会出现 `Use of eval ... is strongly discouraged` 警告，这是 `breakpoint.ts` 刻意使用 `eval('debugger;')` 的副作用，不要"修复"它。
-   **类型产物链路**：`ts:build` 用 `src/antiDebugger/tsconfig.json`（`declarationDir: buildTypes`）生成 d.ts，`cp:type` 再拷入 `dist/`。`buildTypes/`、`buildJs/` 目录是产物，勿手改。
-   `gulpfile.ts/` 是目录（不是文件），内含 gulp 任务：版本号 bump（`versionPatch` 等）、git 提交（`git_feat -m '...'`）、npm 发布。仅 `push:npm:package` 无人值守流程使用，日常发布走上面的手动命令。
-   **ESLint flat config 的两个坑**（`eslint.config.mjs`）：① 不能用 `tseslint.config()` 包裹配置数组（v7 与 eslint-plugin-vue v10 的配置形态不兼容，会导致 .vue 文件配置匹配失效）；② .vue 文件必须显式设置 `parser: vueParser`，否则 tseslint 的全局 base 配置会用 ts 解析器解析整个 .vue（含 template）导致 `Parsing error: Type expected`。
-   pnpm 10 默认拦截依赖构建脚本，`package.json` 的 `pnpm.onlyBuiltDependencies` 已放行 esbuild（vite 依赖其二进制）。
