<!--
 * @Author: matiastang
 * @Date: 2022-03-31 15:28:39
 * @LastEditors: matiastang
 * @LastEditTime: 2024-07-30 17:49:07
 * @FilePath: /anti-debugger/src/views/index.vue
 * @Description: 首页
-->
<template>
    <div class="page">
        <div class="title">Is DevTools open?</div>
        <div class="status">{{ devtoolstatus }}</div>
        <div class="text">Try it out by opening DevTools</div>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { addListener, launch } from 'devtools-detector'

const devtoolstatus = ref('NO')

// const ClearCurrentConsoleLine = () =>{
//     const currentLineCursor = console;
//     console.clear()
//     Console.SetCursorPosition(0, Console.CursorTop);
//     Console.Write(new string(' ', Console.WindowWidth));
//     Console.SetCursorPosition(0, currentLineCursor);
// }

onMounted(() => {
    // isOpen().then((res) => {
    //     devtoolstatus.value = res ? 'YES' : 'NO'
    // })
})

onMounted(() => {
    // // 1. add listener
    // addListener((isOpen, detail) => {
    //     console.log('isOpen', isOpen, detail)
    //     // 2. update status
    //     devtoolstatus.value = isOpen ? 'YES' : 'NO'
    // })
    // // 2. launch detect
    // launch()
    // if (window.console && window.console.firebug) {
    //     console.log('firebug is open')
    //     devtoolstatus.value = 'YES'
    // } else {
    //     console.log('firebug is close')
    //     devtoolstatus.value = 'NO'
    // }
})
</script>
<style lang="less" scoped>
.page {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    .title {
        font-size: 24px;
        font-weight: bold;
    }
    .status {
        font-size: 48px;
        font-weight: bold;
        margin-top: 20px;
    }
    .text {
        font-size: 16px;
        margin-top: 20px;
    }
}
</style>
