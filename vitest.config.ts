/*
 * Vitest 配置（单元/集成测试）
 * 与 playground 的 vite.config.ts 分离；e2e 由 playwright.config.ts 管理（testDir: e2e/）
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        // 浏览器环境：localStorage / CustomEvent / performance / console.table
        environment: 'happy-dom',
        // 仅收集 src 下的用例，与 e2e/ 目录严格隔离
        include: ['src/**/__tests__/**/*.spec.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/antiDebugger/**/*.ts'],
            exclude: ['**/__tests__/**', '**/*.d.ts', 'src/antiDebugger/buildTypes/**'],
        },
    },
})
