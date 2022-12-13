

// 懒加载
const Index = () => import("/@/page/index/index.vue")
const Publish = () => import('/@/page/publish/index.vue')
const Article = () => import('/@/page/article/index.vue')
const Update = () => import('/@/page/update/index.vue')
const Live = () => import('/@/page/live/index.vue')
const NotFound = () => import('/@/page/NotFound.vue')

const routes = [
    {
        path: '/',
        name: "Index",
        meta: {
            keepAlive: false,
            title: "主页",
        },
        component: Index
    },
    {
        path: '/publish',
        name: "Publish",
        meta: {
            keepAlive: false,
            title: "发布文章",
        },
        component: Publish
    },
    {
        path: '/article',
        name: "Article",
        meta: {
            keepAlive: false,
            title: "文章",
        },
        component: Article
    },
    {
        path: '/update',
        name: "Update",
        meta: {
            keepAlive: false,
            title: "修改文章",
        },
        component: Update
    },
    {
        path: '/live',
        name: "Live",
        meta: {
            keepAlive: false,
            title: "直播",
        },
        component: Live
    },
    {
        path: '/:path(.*)',
        name: 'NotFound',
        meta: {
            keepAlive: false,
            title: "404",
        },
        component: NotFound,
    },
]

export default routes
