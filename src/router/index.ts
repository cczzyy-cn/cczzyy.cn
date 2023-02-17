
import { nextTick } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router'
import routes from "/@/router/routes";

const router = createRouter({
    history: createWebHashHistory(),
    routes,
})

// 前置钩子
router.beforeResolve((to, from, next) => {

    // 跳出主页记录滚动条高度
    if (from.name == 'Index' && to.name != 'Index') {
        let dom = document.querySelector("#Content .n-scrollbar-container")
        let scrollTop = dom?.scrollTop ?? 0
        localStorage.setItem('Index-scrollTop', String(scrollTop))
    }
    next()
})

// 后置钩子
router.afterEach((to, from, failure) => {
    // 设置 title
    document.title = to.meta.title + ' | cczzyy.cn';

    // 返回主页滚动到原高度
    if (to.name == 'Index') {
        nextTick(() => {
            let dom = document.querySelector("#Content .n-scrollbar-container")
            let scrollTop = localStorage.getItem('Index-scrollTop') ?? `0`
            dom?.scrollTo({ top: Number(scrollTop) })
            localStorage.setItem('Index-scrollTop', '0')
        })
    }
})

export default router