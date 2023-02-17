<script setup lang="ts">
import { provide, reactive } from "vue";
import { useRoute } from 'vue-router'
import { useMessage, NBackTop, NScrollbar, DrawerPlacement, NDrawer, NDrawerContent } from 'naive-ui'
import { api, CreatePost } from "/@/axios/index";
import { AxiosRequestConfig } from "axios";
import { AppType } from "/@/type/AppType"

const route = useRoute()

// 请求参数处理
const handleConfig = (Config: AxiosRequestConfig) => {
    Config.data.pw = localStorage.getItem('pw')
    return Config
}

// 返回参数处理
const handleRes = (Res: any) => {
    if (process.env.NODE_ENV === "development") {
        console.log(Res)
    }
    if (Res.code == 200) {
        // 后端操作成功提示
        if (Res.msg) {
            msg.success(Res.msg)
        }
    }
    // 后端操作失败提示
    if (Res.code == 400 && Res.msg) {
        msg.error(Res.msg)
    }
    return Res
}

// 请求状态码(status code)错误处理
const handleError = (error: { message: string }) => {
    msg.error('AxiosError: ' + error.message)
}

const post = CreatePost(api.Url, handleConfig, handleRes, handleError)
const postAi = CreatePost(api.OpenAI, handleConfig, handleRes, handleError)

const msg = useMessage()

const app = reactive<AppType>({
    state: {
        scroll: false, // index 页面下拉底部文章加载监听值
        bottomShow: true, // 底部
        // 全局 img 抽屉缩放图
        img: {
            active: false, // 是否显示抽屉
            placement: 'left', // 抽屉从左边出来
            imgSrc: '', // 图片路径
            imgWidth: 90, // 图片宽度 %
            // 显示抽屉
            activate: (place: DrawerPlacement = 'left') => {
                app.state.img.active = true
                app.state.img.placement = place
            },
            // 获取某个元素所有后代 img 添加点击抽屉缩放图事件
            handleImg: (query: string = '#app') => {
                let doms: NodeListOf<HTMLImageElement> = document.querySelectorAll(`${query} img`)
                doms.forEach((dom) => {
                    // 判断是否已处理，index 主页会多次调用 handleImg() doms 会增加 
                    if (dom.style.cursor != 'pointer') {
                        dom.onclick = () => {
                            app.state.img.imgSrc = dom.src
                            app.state.img.imgWidth = 90
                            app.state.img.activate()
                        }
                        // img 鼠标样式
                        dom.style.cursor = 'pointer'
                    }
                })
            },
            // 抽屉 img 缩放
            changeImgWidth: (value: number) => {
                let newValue = app.state.img.imgWidth + value
                if (newValue >= 40 && newValue <= 100) {
                    app.state.img.imgWidth = newValue
                }
            },
            // 抽屉 img 鼠标滑轮缩放事件
            wheel: (event) => {
                let value = 5
                if (event.deltaY < 0) {
                    // 滑轮上滑 放大
                    app.state.img.changeImgWidth(value)
                } else {
                    app.state.img.changeImgWidth(-value)
                }
            }
        }
    },
    post: post,
    postAi: postAi,
    api: api,
    msg: msg,
    updateState: (key, value) => {
        app.state[key] = value
    },
    updateApp: (key, value) => {
        app[key] = value
    }
})

// 提供给后代组件（相当于 vuex），后代获取： const app = inject('app')
provide('app', app)

/**
 * 防抖闭包函数
 * @param func 
 * @param time 
 */
const debounce = (func: Function, time = 1000) => {
    let timeout: NodeJS.Timeout | null
    // 把函数接收的参数给到需要执行的函数
    return (...param: any) => {
        if (timeout) {
            return;
        } else {
            func(...param)
            // console.log(`防抖闭包函数 ${Date.now() / 1000}`);
            timeout = setTimeout(() => {
                timeout = null
            }, time)
        }
    }
}

/**
 * 节流闭包函数
 * @param func 
 * @param time 
 */
const throttle = (func: Function, time = 1000) => {
    let timeout: NodeJS.Timeout | null
    // 把函数接收的参数给到需要执行的函数
    return (...param: any) => {
        if (timeout) {
            clearTimeout(timeout)
            timeout = null
        }
        timeout = setTimeout(() => {
            func(param)
            console.log(`节流闭包函数 ${Date.now() / 1000}`);
        }, time)
    }
}

const debounceScroll = debounce((...paramArray: any) => {
    let event = paramArray[0]
    scroll(event)
}, 100)

const scroll = (event: Event) => {
    let dom = event.target as HTMLElement
    let scrollTop = dom.scrollTop
    let windowHeight = dom.clientHeight
    let scrollHeight = dom.scrollHeight
    // 快到底部
    if (scrollTop + windowHeight > scrollHeight - 600) {
        // index 页面监听到值改变并加载文章
        app.state.scroll = !app.state.scroll
    }
}

// 显示或隐藏底部备案
const changeBottomShow = () => {
    if (window.innerWidth < 625) {
        app.state.bottomShow = false;
    } else {
        app.state.bottomShow = true;
    }
}

changeBottomShow()

window.onresize = () => {
    changeBottomShow()
}

const beian = `桂公网安备 45040502000210号`;
const beian2 = `| 桂ICP备2022002353号-1 |`;
const email = `© Developed by < cczzyy.cn@gmail.com >`;

</script>
    
<template>
    <router-view v-slot="{ Component }">
        <NDrawer v-model:show="app.state.img.active" :width="'100%'" :placement="app.state.img.placement">
            <n-drawer-content closable :native-scrollbar="false">
                <template #header>
                    {{ `鼠标在图片上可以滑轮缩放：${app.state.img.imgWidth} % (Esc 收起)` }}
                </template>
                <div class="drawer_img" @click="app.state.img.active = !app.state.img.active">
                    <div class="img_box">
                        <img v-show="app.state.img.active" :src="app.state.img.imgSrc"
                            @wheel.prevent="app.state.img.wheel"
                            :style="{ width: app.state.img.imgWidth + '%', height: 'auto' }" />
                    </div>
                </div>
            </n-drawer-content>
        </NDrawer>
        <div class="content_div">
            <div class="top_div">
                <NScrollbar @scroll="debounceScroll">
                    <keep-alive>
                        <component v-if="route.meta && route.meta.keepAlive" :is="Component" />
                    </keep-alive>
                    <component v-if="!(route.meta.keepAlive)" :is="Component" />
                    <NBackTop id="NBackTop" :visibility-height="400" :bottom="50" :right="40" style="z-index: 999;">
                    </NBackTop>
                </NScrollbar>
            </div>
            <div class="bottom_div" v-show="app.state.bottomShow">
                <a target="_blank" href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=45040502000210"
                    class="beian_a">
                    <img src="/public/beian.png" width="18" style="margin-right: 5px;" />
                    <div>{{ beian }}</div>
                </a>
                <div class="text" style="margin-left: 5px;margin-right: 5px;">{{ beian2 }}</div>
                <div class="text">{{ email }}</div>
            </div>
        </div>
    </router-view>
</template>
    
<style>
.f {
    display: flex;
}

.f_a_i_c {
    display: flex;
    align-items: center;
}

.drawer_img {
    width: 100%;
    height: 100%;
    display: table;
}

.img_box {
    display: table-cell;
    vertical-align: middle;
    text-align: center;
}

.content_div {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
}

.top_div {
    flex: 1;
    overflow-y: auto;
}

.bottom_div {
    width: 100%;
    padding: 6px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    background-color: white;
    box-shadow: 2px 2px 10px rgba(20, 20, 20, 0.3);
    z-index: 9;
}

.bottom_div img {
    box-shadow: 0px 0px 0px rgba(255, 255, 255, 1);
}

.beian_a {
    text-decoration: none;
    display: flex;
    align-items: center;
    color: #495770;
    font-size: 12px;
}

.beian_a:hover {
    color: cornflowerblue;
}

.text {
    font-size: 12px;
    color: #495770;
}
</style>
    