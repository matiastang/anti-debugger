# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

`anti-debugger` 是一个发布到 npm 的 Web 反调试工具库（TypeScript）。仓库同时包含一个 Vue 3 测试工程（playground），用于在浏览器中实际验证反调试效果。

-   包管理器使用 **pnpm**
-   没有测试框架；代码规范由 `eslint.config.mjs`（ESLint 9 flat config）+ `.prettierrc` 约束（4 空格缩进、无分号、单引号；package.json 例外为 2 空格）
-   提交信息风格：`feat: - xxx` / `fix: - xxx`（见 git 历史）
-   pre-commit 钩子（husky + lint-staged）对暂存文件自动跑 `prettier --write` + `eslint --fix`
-   GitHub Actions（`.github/workflows/ci.yml`）：push 到 main 或 PR 到 main 时跑 format:check / lint / typecheck / test / plugin:build + 独立 E2E job（xvfb 有头浏览器）

## 常用命令

```sh
# 启动测试工程（vite，端口 3002，strictPort）
pnpm run dev

# 完整构建 npm 包（生成类型 + 库构建 + 拷贝 d.ts 到 dist/）
pnpm run plugin:build

# 校验（CI 同款）
pnpm lint            # ESLint（flat config）
pnpm typecheck       # vue-tsc 全量类型检查（含 .vue 与 spec 文件）
pnpm typecheck:e2e   # e2e/ 与 playwright/vitest 配置的类型检查
pnpm format:check    # Prettier 格式检查
pnpm format          # Prettier 全量格式化

# 测试
pnpm test            # Vitest 单元 + 集成测试（src/**/__tests__/*.spec.ts）
pnpm test:watch      # Vitest watch 模式
pnpm test:coverage   # 覆盖率报告（v8 provider）
pnpm test:e2e        # Playwright E2E（自动拉起 dev server，需要有头浏览器）

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

1. **devtools 开关监听**：依赖 `devtools-detect` 包的 `devtoolschange` 事件。注意：必须先读取一次 `devtools.isOpen`，事件监听才会生效。close 事件先同步停轮询、再异步性能探测兜底（Undock），确认未打开才真正关闭并重启周期探测。
2. **debugger 断点计时**（`breakpoint.ts`）：执行 `eval('debugger;')` 并测量耗时（`performance.now()` 主计时 + `Date.now()` 交叉验证防篡改）。耗时超过 `dbDiff`（默认 100ms）说明断点生效（devtools 打开且暂停），循环继续卡住；耗时极短或两时钟差值异常（篡改）说明"deactivate breakpoints"—— **立即**执行 `window.location.replace('about:blank')`（可通过 `deactivateBreakpoints` 回调自定义），无延迟窗口。
3. **性能检测**（`checkers/performanceChecker.ts`，async）：比较 `console.table` 与 `console.log` 打印大对象数组的耗时。连续 2 轮（间隔 200ms）都满足"table > 10ms 且 > log 基线 10 倍"才判开（Chrome 151 实测标定：DevTools 打开时 table ~17-24ms，关闭时 ~0.5-2ms）；console 被 hook（非原生）时阈值提高到 50ms/20 倍。devtools 关闭期间以周期探测（间隔 1000/2000/4000 循环）持续运行，覆盖加载后才以分离窗口打开的场景。

### 定时调度（src/antiDebugger/timers/）

`generatorLoop.ts` / `asyncGeneratorLoop.ts` 用生成器产生递增的 setTimeout 间隔序列（如 1000→2000→3000），回调返回 `false` 即停止循环，返回 cancel 函数用于取消。这是检测轮询的底层机制，避免暴露可被断点的 `setInterval`。

### 运行时状态

`index.ts` 的模块级 `options`（`AntiDebuggingOptions`）保存全局状态（`devtoolsStatus`、`breakpointStatus` 等）。`antiDebugging()` 重复调用会先清理上一轮轮询/探测并重置运行时状态再合并配置；default export 上挂载 `destroy()`（停止轮询与探测、移除事件监听——销毁后事件监听不会自动恢复，需刷新页面）。

## 开发注意事项

-   **本地源码 vs 已发布包**：`src/main.ts` 中默认 `import antiDebugger from './antiDebugger'`（本地源码）；要测试 npm 上已发布版本时切换为 `import antiDebugger from 'anti-debugger'`，或按 `DEV_README.md` 用符号链接调试。
-   **测试时关闭反调试**：设置 localStorage `ANTI-DEBUGGER` 为 true（通过 `debuggerLocalStorageKey` 配置的 key）可让 debugger 失效，方便开发调试。
-   **eval 警告是预期的**：构建时会出现 `Use of eval ... is strongly discouraged` 警告，这是 `breakpoint.ts` 刻意使用 `eval('debugger;')` 的副作用，不要"修复"它。
-   **类型产物链路**：`ts:build` 用 `src/antiDebugger/tsconfig.json`（`declarationDir: buildTypes`）生成 d.ts，`cp:type` 再拷入 `dist/`。`buildTypes/`、`buildJs/` 目录是产物，勿手改。
-   `gulpfile.ts/` 是目录（不是文件），内含 gulp 任务：版本号 bump（`versionPatch` 等）、git 提交（`git_feat -m '...'`）、npm 发布。仅 `push:npm:package` 无人值守流程使用，日常发布走上面的手动命令。
-   **ESLint flat config 的两个坑**（`eslint.config.mjs`）：① 不能用 `tseslint.config()` 包裹配置数组（v7 与 eslint-plugin-vue v10 的配置形态不兼容，会导致 .vue 文件配置匹配失效）；② .vue 文件必须显式设置 `parser: vueParser`，否则 tseslint 的全局 base 配置会用 ts 解析器解析整个 .vue（含 template）导致 `Parsing error: Type expected`。
-   pnpm 10 默认拦截依赖构建脚本，`package.json` 的 `pnpm.onlyBuiltDependencies` 已放行 esbuild（vite 依赖其二进制）。

## 测试架构

四层测试（详见方案沉淀在各 spec 文件头注释）：

-   **单元**（`src/**/__tests__/*.spec.ts`，Vitest + happy-dom + fake timers）：localStorageUtil、customConsole、breakpoint、两个 generatorLoop、performanceChecker。
-   **集成/状态机**（`src/antiDebugger/__tests__/antiDebugging.spec.ts`）：合成 `devtoolschange` CustomEvent 驱动全路径。关键 mock 模式：
    -   `devtools-detect` 必须**整体模块 mock**（真实包 import 即启动不可停止的 500ms 轮询，且事件与导出对象是两条独立通道）
    -   `index.ts` 是模块级单例 + import 即注册 window 监听 → 每用例 `vi.resetModules()` + 动态 import + spy 捕获/清理监听器
    -   `stubBrowserStyleTimers()` 把 fake timers 的 object id 包装为浏览器式 number id（源码 `clearIntervalTime` 有 `typeof !== 'number'` 守卫，否则清理被短路）
    -   happy-dom 的 `eventPhase` dispatch 期间恒为 0，close 事件需对实例 `defineProperty(eventPhase, 2)` 遮蔽
-   **E2E**（`e2e/anti-debugger.spec.ts`，Playwright 双 project）：`chromium-clean` 基线 + CDP 确定性用例；`chromium-devtools`（`--auto-open-devtools-for-tabs`）真实冻结验证。坑：真实 DevTools 前端占有 pause 所有权，CDP resume 不可靠，所以"断点失活惩罚"用例在 clean project 用 viewport 收缩触发宽度阈值 + CDP 独占调试器。
-   **CI**：`check` job 跑单测；`e2e` job 用 `xvfb-run` 跑有头浏览器。

## 已知边界（v0.3.0 后仍存在的架构上限）

-   `performanceCheckerIsOpen` 对 CDP 层 console 监听（如 Playwright/自动化，不改写 console 函数本身）会判定为打开——这是合理语义（自动化本身就是附加调试器），且时序上与真实 DevTools 不可区分（实测两者 table 都 ~20ms）；真实浏览器无 DevTools 时 table ~0.5-2ms，远低于 10ms 下限，不会误判。
-   Local Overrides / 代理改写 / 远程调试 / 静态分析等客户端方案天花板问题不在此库能力范围内。
-   v0.3.0 已修复：`timeout` 死配置、同步 `generatorLoop` immediate 不一致、forever 回绕严格大于、800ms 惩罚竞态、Undock 延迟打开盲区、时间钩子篡改、重复初始化状态残留；并新增 `destroy()` API。
