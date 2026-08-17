/*
 * ESLint flat config (ESLint 9+)
 * 规则对齐旧版 .eslintrc.js：js recommended + vue3-essential + ts recommended + prettier
 * 注意：不能使用 tseslint.config() 包裹（v7 与 eslint-plugin-vue v10 的配置形态不兼容），
 * 统一使用纯数组 + 显式展开。
 */
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'

export default [
    // 忽略产物与非源码目录
    {
        ignores: [
            'dist/',
            'build/',
            'src/antiDebugger/buildJs/',
            'src/antiDebugger/buildTypes/',
            'public/',
            'test-results/',
            'playwright-report/',
            'coverage/',
        ],
    },
    // js 基础规则
    js.configs.recommended,
    // vue3 基础规则（使用 vue-eslint-parser）
    ...pluginVue.configs['flat/essential'],
    // ts 推荐规则
    ...tseslint.configs.recommended,
    // prettier 集成（读取 .prettierrc），需放在最后以覆盖格式类规则
    prettierRecommended,
    {
        // 浏览器 + node 全局变量（对应旧配置的 env）
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },
    {
        // .vue 必须显式指定 vue 解析器（tseslint 的全局 base 配置会覆盖 vue 预设的 parser），
        // <script lang="ts"> 内部再交给 ts 解析器
        files: ['**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tsParser,
            },
        },
    },
    {
        // 路由页面组件允许单词命名（如 index.vue）
        files: ['src/views/**/*.vue'],
        rules: {
            'vue/multi-word-component-names': 'off',
        },
    },
    {
        // 与旧配置保持一致的自定义规则
        rules: {
            'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
            'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
            // 去除ts类型检测,消除ts函数设置默认值提示错误
            '@typescript-eslint/no-inferrable-types': 'off',
            // 回调签名中的未使用参数以下划线前缀豁免
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
        },
    },
]
