/*
 * @Author: your name
 * @Date: 2021-10-18 17:15:20
 * @LastEditTime: 2021-12-06 10:53:56
 * @LastEditors: matiastang
 * @Description: In User Settings Edit
 * @FilePath: /datumwealth-openalpha-front/.eslintrc.js
 */
module.exports = {
    root: true,
    env: {
        es6: true, // 启用 ES6 语法支持以及新的 ES6 全局变量或类型
        node: true, // Node.js 全局变量和 Node.js 作用域
        browser: true, // 浏览器全局变量
    },
    plugins: ['prettier'],
    extends: [
        // 一个配置文件可以从基础配置中继承已启用的规则
        'plugin:vue/vue3-essential',
        'eslint:recommended',
        '@vue/typescript/recommended',
        '@vue/prettier',
        '@vue/prettier/@typescript-eslint',
        'plugin:prettier/recommended',
    ],
    parserOptions: {
        // 语法解析器的一些配置
        ecmaVersion: 2020,
    },
    rules: {
        // 规则
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        // 去除ts类型检测,消除ts函数设置默认值提示错误
        '@typescript-eslint/no-inferrable-types': 'off',
        'no-unused-variable': 'off',
        // prettier样式规则，需要和配置文件的统一
        'prettier/prettier': [
            'error',
            {
                trailingComma: 'es5',
                tabWidth: 4,
                useTabs: false,
                semi: false,
                singleQuote: true,
                endOfLine: 'auto',
                printWidth: 100,
                bracketSpacing: true, // 在对象，数组括号与文字之间加空格 "{ foo: bar }"
            },
        ],
        'array-bracket-newline': 'warn',
    },
    overrides: [
        // {
        // 	files: ['*.{j,t}s?(x)', '*.json?(x)', '**/.vscode/*.json?(x)'],
        // 	env: {
        // 		es6: true,
        // 		node: true,
        // 		browser: true,
        // 	},
        // },
        {
            files: ['**/__tests__/*.{j,t}s?(x)', '**/tests/unit/**/*.spec.{j,t}s?(x)'],
            env: {
                jest: true,
            },
        },
    ],
}
