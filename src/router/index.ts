import { createRouter, createWebHashHistory } from 'vue-router'
import routes from "/@/router/routes";

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

// 全局后置钩子
router.afterEach((to) => {
    // 设置 title
    document.title = to.meta.title + ' | cczzyy.cn';
})

export default router