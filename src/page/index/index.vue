<script setup lang="ts">
import { reactive, inject, h, watch, nextTick, CSSProperties } from 'vue'
import { LocationQueryRaw, useRouter, useRoute } from 'vue-router'
import { NCard, NTag, NInputGroup, NInput, NSpace, NButton, NBackTop, NSwitch, NPopconfirm, NSelect, NCollapseTransition, NSpin, SelectRenderTag, NDrawer, NDrawerContent, NScrollbar } from 'naive-ui'
import { IEditorConfig } from '@wangeditor/editor'
import { Editor } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { AppType } from "/@/type/AppType"
import { marked } from 'marked';
import hljs from 'highlight.js'

const app = inject('app') as AppType
const router = useRouter();
const route = useRoute()

watch(() => app.state.scroll, (n, o) => {
    if (route.name == `Index`) {
        // 快到底部加载文章
        addArticleData()
    }
})

watch(() => route.query.tag_id, (n, o) => {
    let scrollTop = localStorage.getItem('Index-scrollTop') ?? `0`
    // 返回主页时取消请求
    if (scrollTop != `0`) {
        return
    }

    let tag_id = n as string
    data.TagArray.forEach((item) => {
        if (tag_id && item.tag_id == tag_id) {
            SearchData.tag = [tag_id]
            postArticle()
            if (document.getElementById('NBackTop')) {
                document.getElementById('NBackTop')!.click()
            }
        }
    });
})

interface Article {
    id: string,
    title: string,
    GlArticleTag: {
        tag_id: string,
        name: string,
        color: string,
        c_time: string
    }[],
    defaultHtml: string,
    c_time: string,
    editorId: string,
    loading: boolean,
    editorConfig: Partial<IEditorConfig>,
    show: boolean,
}

// OpenAI 会话内容类型
interface Context {
    type: string,
    text?: string,
    html?: string,
    isError?: boolean,
    completion_tokens?: number,
    prompt_tokens?: number,
    total_tokens?: number,
    timestamp?: number,
    dateTime?: string,
    imgId?: string,
    imgUrl?: string,
}
const data = reactive<{
    ArticleArray: Article[],
    TagArray: {
        id?: string,
        tag_id?: string,
        label: string,
        color: string,
        value: string
    }[],
    DeleteList: {
        [key: string]: boolean;
    },
    ShowBotton: boolean,
    Loading: boolean,
    AddLoading: boolean,
    PageData: {
        page: number, // 当前页数
        quantity: number, // 每页数量
        total: number, // 总数量
        last_page: number, // 最大页数
    },
    openAiShow: boolean,
    sessionId: string,
    contextArray: Context[],
    prompt: string,
    loadingAi: boolean,
    modeAi: boolean,
    historyShow: boolean,
    historyContext: Context[],
    delAllShow: boolean,
    apiKey: string,
    noImg: boolean,
    delAllImgShow: boolean,
}>({
    ArticleArray: [],
    TagArray: [],
    DeleteList: {},
    ShowBotton: false,
    Loading: false,
    AddLoading: false,
    PageData: {
        page: 1,
        quantity: 5,
        total: 0,
        last_page: 1,
    },
    openAiShow: false, // 是否显示ai抽屉
    sessionId: '', // 会话id
    // 会话上下文
    contextArray: [
        {
            type: 'ai',
            text: '请在底部输入框给AI提问或提示。',
        },
        {
            type: 'ai',
            text: `[问答模式]: 不保存上下文, AI不知道之前的提示或提问。
[会话模式]: 保存上下文, 需要自行提供 OpenAI API 的 PrivateKey, 会消耗大量提示令牌(prompt_tokens), 到达最大值4000会请求失败且SessionId失效, 需等待24小时重置或刷新页面生成新Id。
[GetImg]: 打开此选项后(问答/会话模式失效), AI会根据提示生成一张图片, 1小时后图片链接失效。`,
        },
    ],
    prompt: "", // 给ai的提问或提示
    loadingAi: false, // ai加载中
    modeAi: true, // true:问答模式，false:会话模式，会话模式会保存上下文，但会消耗大量token
    historyShow: false,
    historyContext: [],
    delAllShow: false,
    apiKey: '',
    noImg: true, // 是否请求AI完成图片
    delAllImgShow: false,
})

const SearchData = reactive({
    search: '',
    tag: [] as string[],
})

const postArticle = async (reset = true) => {
    if (data.Loading) return
    if (data.AddLoading) return
    // data.ArticleArray = []
    if (reset) {
        data.PageData.page = 1
        data.ArticleArray = []
        data.Loading = true
    } else {
        data.AddLoading = true
    }
    let RequestData = {
        sql: {
            where: [
                ['title|defaultHtml', 'like', `${SearchData.search}`]
            ],
            order: [
                //['_id', 'desc'],
                ['c_time', 'desc'],
            ],
            page: {
                page: data.PageData.page,
                quantity: data.PageData.quantity,
            },
            with: null as null | object,
        }
    }
    if (SearchData.tag[0]) {
        RequestData.sql.with = {
            GlArticleTag: {
                where: [
                    ['id', 'in', SearchData.tag]
                ]
            }
        }
    }
    let res = await app.post(app.api.postArticle, RequestData)
    if (res.code == 200) {
        data.PageData.total = res.total
        data.PageData.page = res.page
        data.PageData.last_page = res.last_page
        res.data.forEach((item: Article) => {
            item.editorId = `w-e-${Math.random().toString().slice(-5)}-${item.id}`
            item.loading = false
            item.show = false
            item.editorConfig = {
                // 只读编辑器
                readOnly: true
            }
            data.ArticleArray.push(item)
            let index = data.ArticleArray.length - 1
            data.ArticleArray[index].show = true
        })
    }
    if (reset) {
        data.Loading = false
    } else {
        data.AddLoading = false
    }
    // 等待富文本内 img dom 渲染完再添加点击抽屉大图事件
    setTimeout(() => {
        // #index 所有后代 img 元素
        app.state.img.handleImg("#index")
    }, 500)
}

// 添加剩余文章
const addArticleData = () => {
    if (data.PageData.page < data.PageData.last_page) {
        data.PageData.page++
        postArticle(false)
    }
}

const postTag = async () => {
    let res = await app.post(app.api.postTag, {})
    res.data.forEach((item: { tag_id: string, name: string, id: string, color: string }) => {
        data.TagArray.push({
            tag_id: item.id,
            label: item.name,
            value: item.id,
            color: item.color
        })
        let tag_id = route.query.tag_id as string
        if (tag_id && item.id == tag_id) {
            SearchData.tag = [tag_id]
        }
    });
    postArticle()
}

postTag()

const deleteArticle = async (item: Article, index: number) => {
    data.ArticleArray[index].loading = true
    let res = await app.post(app.api.deleteArticle, { id: item.id })
    data.ArticleArray[index].loading = false
    if (res.code == 200) {
        data.ArticleArray[index].show = false
    }
}

const renderTag: SelectRenderTag = ({ option, handleClose }) => {
    let color = option.color as string
    return h(NTag,
        {
            closable: true,
            color: { color: color, textColor: '#FFFFFFFF', borderColor: '#6D9B9FFF' },
            onClose: (e: MouseEvent) => {
                e.stopPropagation()
                handleClose()
            }
        },
        { default: () => option.label }
    )
}

const renderLabel = (option: { color: string, label: string }) => {
    return h(NTag,
        {
            color: { color: option.color, textColor: '#FFFFFFFF', borderColor: '#6D9B9FFF' },
        },
        { default: () => option.label }
    )
}

const updateArticle = async (item: Article, index: number) => {
    data.ArticleArray[index].loading = true
    let res = await app.post(app.api.authRoot, {});
    data.ArticleArray[index].loading = false
    if (res.code == 200) {
        router.push({
            name: 'Update',
            query: {
                id: item.id
            },
        })
    }
}

const Go = (name: string, query: LocationQueryRaw | undefined) => {
    router.push({
        name: name,
        query: query
    })
}

const GoPublish = async (name: string, query: LocationQueryRaw | undefined) => {
    let res = await app.post(app.api.authRoot, {});
    if (res.code == 200) {
        Go(name, query);
    }
}

// OpenAI
// 设置会话id
const sessionId = localStorage.getItem('openai-id')
if (sessionId) {
    data.sessionId = sessionId;
} else {
    data.sessionId = new Date().getTime() + '';
}
data.apiKey = localStorage.getItem('openai-apiKey') ?? ``;
// 处理AI返回的markdown格式内容
const render = new marked.Renderer();
marked.setOptions({
    renderer: render, // 这是必填项
    // 使用 highlight.js 使代码高亮
    highlight: function (code) {
        return hljs.highlightAuto(code).value;
    },
    gfm: true, //默认为true。 允许 GitHub 标准的 markdown.
    breaks: true, //默认为false。 允许回车换行。该选项要求 gfm 为true。
    pedantic: false, //默认为false。 尽可能地兼容 markdown.pl的晦涩部分。不纠正原始模型任何的不良行为和错误。
    smartLists: true,
    smartypants: true, //使用更为时髦的标点，比如在引用语法中加入破折号。
    langPrefix: "hljs language-", // highlight.js 配置
})

// 请求AI完成
const completions = () => {
    if (data.loadingAi == true) return;
    addContext({
        'type': 'user',
        'text': data.prompt,
    })

    // 判断是否图片请求
    if (!data.noImg) {
        postImageAi()
    } else {
        postAi()
    }
    data.prompt = '';
}

// 发送请求
const postAi = async () => {
    let sessionId = data.sessionId
    // 问答模式不带会话id
    if (data.modeAi) {
        sessionId = ''
    }
    data.loadingAi = true
    let res = await app.postAi(app.api.completionsAi, {
        sessionId: sessionId,
        apiKey: data.apiKey,
        prompt: data.prompt,
    });
    data.loadingAi = false
    if (res.code == 200) {
        let text = res.data['choices'][0]['text']
        let usage = res.data['usage'] as Context
        let html = marked(text + ` [prompt_tokens:${usage.prompt_tokens}] [completion_tokens:${usage.completion_tokens}]`)
        addContext({
            type: 'ai',
            html: html,
        })
        localStorage.setItem('openai-apiKey', data.apiKey)
        return
    }
    addContext({
        isError: true,
        type: 'ai',
        text: res.msg,
    })
}

// 图片请求
const postImageAi = async () => {
    data.loadingAi = true
    let res = await app.postAi(app.api.imageAi, {
        apiKey: data.apiKey,
        prompt: data.prompt,
    });
    data.loadingAi = false
    if (res.code == 200) {
        let imgId = `AiImgId-${res.data['created']}`
        let url = res.data['data'][0]['url']
        addContext({
            type: 'ai-img',
            imgId: imgId,
            imgUrl: url,
        })
        localStorage.setItem('openai-apiKey', data.apiKey)
        imgLoadingCompleted(imgId)
        return
    }
    addContext({
        isError: true,
        type: 'ai',
        text: res.msg,
    })
}

const imgLoadingCompleted = (id: string) => {
    nextTick(() => {
        //根据id获取元素
        const img = document.getElementById(id) as HTMLImageElement
        img.addEventListener('load', function () {
            // 图片加载完毕
            aiBoxScroll()
            app.state.img.handleImg("#scrollbarAi")
        });
    })
}

watch(() => data.historyShow, (n, o) => {
    if (n) {
        nextTick(() => {
            app.state.img.handleImg("#scrollbarAi-2")
            let imgs = document.querySelectorAll(`#scrollbarAi-2 img`)
            imgs.forEach((item) => {
                item.addEventListener('load', function () {
                    // 图片加载完毕
                    aiBoxScroll(`#scrollbarAi-2 .n-scrollbar-container`)
                });
            })
        })
    }
})

const addContext = (contextObj: Context) => {
    contextObj.timestamp = new Date().getTime();
    contextObj.dateTime = getDateTime();
    data.contextArray.push(contextObj)
    aiBoxScroll()
    addHistoryContext(contextObj)
}

const addHistoryContext = (contextObj: Context) => {
    data.historyContext = getHistoryContext()
    data.historyContext.push(contextObj)
    saveHistory()
}

const getHistoryContext = () => {
    let historyContextStr = localStorage.getItem('historyContext') ?? `[]`
    let historyContext = JSON.parse(historyContextStr)
    return historyContext;
}
data.historyContext = getHistoryContext()

// 保存
const saveHistory = () => {
    let historyContextStr = JSON.stringify(data.historyContext);
    localStorage.setItem('historyContext', historyContextStr)
}

// 删除指定本地上下文
const delHistoryContext = (index: number) => {
    data.historyContext.splice(index, 1);
    saveHistory()
}

// 删除所有本地历史
const delAll = () => {
    data.historyContext = []
    localStorage.setItem('historyContext', `[]`)
}

// 删除本地历史图片会话
const delImg = () => {
    for (let i = 0; i < data.historyContext.length; i++) {
        if (data.historyContext[i]['type'] == 'ai-img') {
            // ai img
            data.historyContext.splice(i, 1);
            // user 提示
            data.historyContext.splice(i - 1, 1);
            i--; i--;
        }
    }
    saveHistory()
}

// 输入框按键事件请求
const openAiKeyup = (e: KeyboardEvent) => {
    if (e.code == "Enter" && e.ctrlKey) {
        completions()
    }
}

// 滚动条下拉
const aiBoxScroll = (query: string = `#scrollbarAi .n-scrollbar-container`) => {
    nextTick(() => {
        let scrollbarAi = document.querySelectorAll(query)[0]
        scrollbarAi.scrollTop = scrollbarAi.scrollHeight
    })
}

const getDateTime = () => {
    var date = new Date();
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var minute = date.getMinutes();
    var second = date.getSeconds();
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

// AI模式切换
const railStyle = ({
    focused,
    checked
}: {
    focused: boolean
    checked: boolean
}) => {
    const style: CSSProperties = {}
    if (checked) {
        style.background = '#18a058'
        if (focused) {
            style.boxShadow = '0 0 0 2px #d0305040'
        }
    } else {
        style.background = '#2080f0'
        if (focused) {
            style.boxShadow = '0 0 0 2px #2080f040'
        }
    }
    return style
}
</script>

<template>
    <div id="index">
        <!-- AI抽屉 -->
        <NDrawer v-model:show="data.openAiShow" :height="'100%'" :placement="'top'">
            <n-drawer-content :title="`OpenAI (Esc 收起)`"
                :body-content-style="{ 'display': 'flex', 'justify-content': 'center', 'align-items': 'center' }"
                closable>
                <div class="openAi-box">
                    <div class="openAi-box-content">

                        <n-scrollbar id="scrollbarAi" style="max-height: 100%">
                            <div v-for="item in data.contextArray">
                                <!-- OpenAI -->
                                <div class="openAi-item" v-if="item.type == 'ai'">
                                    <div class="item-left">
                                        <div class="openAi-img">
                                            <svg width="20" height="20" viewBox="0 0 41 41" fill="none"
                                                xmlns="http://www.w3.org/2000/svg" stroke-width="1.5" class="w-6 h-6">
                                                <path
                                                    d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.4888 5.19742 27.7107 5.49804 25.9832C5.55718 26.0187 5.66048 26.0818 5.73461 26.1244L13.699 30.7248C13.8975 30.8408 14.1233 30.902 14.3532 30.902C14.583 30.902 14.8088 30.8408 15.0073 30.7248L24.731 25.1103V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.5542L15.206 28.4979C15.1894 28.5089 15.1703 28.5155 15.1505 28.5173C15.1307 28.5191 15.1107 28.516 15.0924 28.5082L7.04046 23.8557C5.32135 22.8601 4.06716 21.2235 3.55289 19.3046C3.03862 17.3858 3.30624 15.3413 4.29707 13.6194ZM31.955 20.0556L22.2312 14.4411L25.5976 12.4981C25.6142 12.4872 25.6333 12.4805 25.6531 12.4787C25.6729 12.4769 25.6928 12.4801 25.7111 12.4879L33.7631 17.1364C34.9967 17.849 36.0017 18.8982 36.6606 20.1613C37.3194 21.4244 37.6047 22.849 37.4832 24.2684C37.3617 25.6878 36.8382 27.0432 35.9743 28.1759C35.1103 29.3086 33.9415 30.1717 32.6047 30.6641C32.6047 30.5947 32.6047 30.4733 32.6047 30.3889V21.188C32.6066 20.9586 32.5474 20.7328 32.4332 20.5338C32.319 20.3348 32.154 20.1698 31.955 20.0556ZM35.3055 15.0128C35.2464 14.9765 35.1431 14.9142 35.069 14.8717L27.1045 10.2712C26.906 10.1554 26.6803 10.0943 26.4504 10.0943C26.2206 10.0943 25.9948 10.1554 25.7963 10.2712L16.0726 15.8858V11.9982C16.0715 11.9783 16.0753 11.9585 16.0837 11.9405C16.0921 11.9225 16.1048 11.9068 16.1207 11.8949L24.1719 7.25025C25.4053 6.53903 26.8158 6.19376 28.2383 6.25482C29.6608 6.31589 31.0364 6.78077 32.2044 7.59508C33.3723 8.40939 34.2842 9.53945 34.8334 10.8531C35.3826 12.1667 35.5464 13.6095 35.3055 15.0128ZM14.2424 21.9419L10.8752 19.9981C10.8576 19.9893 10.8423 19.9763 10.8309 19.9602C10.8195 19.9441 10.8122 19.9254 10.8098 19.9058V10.6071C10.8107 9.18295 11.2173 7.78848 11.9819 6.58696C12.7466 5.38544 13.8377 4.42659 15.1275 3.82264C16.4173 3.21869 17.8524 2.99464 19.2649 3.1767C20.6775 3.35876 22.0089 3.93941 23.1034 4.85067C23.0427 4.88379 22.937 4.94215 22.8668 4.98473L14.9024 9.58517C14.7025 9.69878 14.5366 9.86356 14.4215 10.0626C14.3065 10.2616 14.2466 10.4877 14.2479 10.7175L14.2424 21.9419ZM16.071 17.9991L20.4018 15.4978L24.7325 17.9975V22.9985L20.4018 25.4983L16.071 22.9985V17.9991Z"
                                                    fill="currentColor"></path>
                                            </svg>
                                        </div>
                                    </div>
                                    <div class="item-right" v-if="item.html" v-html="item.html">
                                    </div>
                                    <div class="item-right" v-if="item.text">
                                        <span :style="item.isError ? { color: 'firebrick' } : {}">{{
                                            item.isError ? `[ ${item.text} ]` : item.text
                                        }}</span>
                                    </div>
                                </div>
                                <!-- OpenAI-Img -->
                                <div class="openAi-item" v-if="item.type == 'ai-img'">
                                    <div class="item-left">
                                        <div class="openAi-img">
                                            <svg width="20" height="20" viewBox="0 0 41 41" fill="none"
                                                xmlns="http://www.w3.org/2000/svg" stroke-width="1.5" class="w-6 h-6">
                                                <path
                                                    d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.4888 5.19742 27.7107 5.49804 25.9832C5.55718 26.0187 5.66048 26.0818 5.73461 26.1244L13.699 30.7248C13.8975 30.8408 14.1233 30.902 14.3532 30.902C14.583 30.902 14.8088 30.8408 15.0073 30.7248L24.731 25.1103V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.5542L15.206 28.4979C15.1894 28.5089 15.1703 28.5155 15.1505 28.5173C15.1307 28.5191 15.1107 28.516 15.0924 28.5082L7.04046 23.8557C5.32135 22.8601 4.06716 21.2235 3.55289 19.3046C3.03862 17.3858 3.30624 15.3413 4.29707 13.6194ZM31.955 20.0556L22.2312 14.4411L25.5976 12.4981C25.6142 12.4872 25.6333 12.4805 25.6531 12.4787C25.6729 12.4769 25.6928 12.4801 25.7111 12.4879L33.7631 17.1364C34.9967 17.849 36.0017 18.8982 36.6606 20.1613C37.3194 21.4244 37.6047 22.849 37.4832 24.2684C37.3617 25.6878 36.8382 27.0432 35.9743 28.1759C35.1103 29.3086 33.9415 30.1717 32.6047 30.6641C32.6047 30.5947 32.6047 30.4733 32.6047 30.3889V21.188C32.6066 20.9586 32.5474 20.7328 32.4332 20.5338C32.319 20.3348 32.154 20.1698 31.955 20.0556ZM35.3055 15.0128C35.2464 14.9765 35.1431 14.9142 35.069 14.8717L27.1045 10.2712C26.906 10.1554 26.6803 10.0943 26.4504 10.0943C26.2206 10.0943 25.9948 10.1554 25.7963 10.2712L16.0726 15.8858V11.9982C16.0715 11.9783 16.0753 11.9585 16.0837 11.9405C16.0921 11.9225 16.1048 11.9068 16.1207 11.8949L24.1719 7.25025C25.4053 6.53903 26.8158 6.19376 28.2383 6.25482C29.6608 6.31589 31.0364 6.78077 32.2044 7.59508C33.3723 8.40939 34.2842 9.53945 34.8334 10.8531C35.3826 12.1667 35.5464 13.6095 35.3055 15.0128ZM14.2424 21.9419L10.8752 19.9981C10.8576 19.9893 10.8423 19.9763 10.8309 19.9602C10.8195 19.9441 10.8122 19.9254 10.8098 19.9058V10.6071C10.8107 9.18295 11.2173 7.78848 11.9819 6.58696C12.7466 5.38544 13.8377 4.42659 15.1275 3.82264C16.4173 3.21869 17.8524 2.99464 19.2649 3.1767C20.6775 3.35876 22.0089 3.93941 23.1034 4.85067C23.0427 4.88379 22.937 4.94215 22.8668 4.98473L14.9024 9.58517C14.7025 9.69878 14.5366 9.86356 14.4215 10.0626C14.3065 10.2616 14.2466 10.4877 14.2479 10.7175L14.2424 21.9419ZM16.071 17.9991L20.4018 15.4978L24.7325 17.9975V22.9985L20.4018 25.4983L16.071 22.9985V17.9991Z"
                                                    fill="currentColor"></path>
                                            </svg>
                                        </div>
                                    </div>
                                    <div class="item-right">
                                        <img :id="item.imgId" :src="item.imgUrl" style="width: 100%;" />
                                    </div>
                                </div>
                                <!-- 用户提问 -->
                                <div class="openAi-item" v-if="item.type == 'user'">
                                    <div class="item-left">
                                        <div class="openAi-img" style="background-color:slateblue;font-size: 1.2rem;">
                                            <p>U</p>
                                        </div>
                                    </div>
                                    <div class="item-right">
                                        <span style="white-space: pre-wrap;">{{ item.text }}</span>
                                    </div>
                                </div>
                            </div>
                        </n-scrollbar>

                    </div>
                    <div class="openAi-box-bottom">
                        <n-spin :show="data.loadingAi" style="width: 100%;">
                            <n-input-group>
                                <n-input v-model:value="data.prompt" @keyup="openAiKeyup" type="textarea" size="small"
                                    :autosize="{
                                        minRows: 1,
                                        maxRows: 1
                                    }" placeholder="提问或提示。(Ctrl+Enter)" :style="{ width: '100%' }" />
                                <n-button @click="completions" type="primary" :style="{ width: '100px' }">
                                    Completions
                                </n-button>
                            </n-input-group>
                        </n-spin>
                        <n-space style="margin-top: 5px;">
                            <n-switch v-model:value="data.modeAi" :rail-style="railStyle" :round="false">
                                <template #checked>
                                    问答模式
                                </template>
                                <template #unchecked>
                                    会话模式
                                </template>
                            </n-switch>
                            <n-switch v-model:value="data.noImg" :rail-style="railStyle" :round="false">
                                <template #checked>
                                    NotImg
                                </template>
                                <template #unchecked>
                                    GetImg
                                </template>
                            </n-switch>
                            <n-button
                                @click="data.historyShow = true, aiBoxScroll(`#scrollbarAi-2 .n-scrollbar-container`)"
                                type="warning" size="tiny">
                                本地历史
                            </n-button>
                            <n-button @click="data.openAiShow = false" size="tiny">
                                返回
                            </n-button>
                            <n-input-group style="padding-top: 1.5px;">
                                <n-button type="primary" size="tiny">
                                    SessionId
                                </n-button>
                                <n-input v-model:value="data.sessionId" style="width: 6.8rem" size="tiny"
                                    placeholder="SessionId" />
                                <n-button type="primary" size="tiny">
                                    ApiKey
                                </n-button>
                                <n-input v-model:value="data.apiKey" style="width: 5.5rem" size="tiny"
                                    placeholder="PrivateKey" />
                            </n-input-group>
                            <!-- AI本地历史抽屉 -->
                            <n-drawer v-model:show="data.historyShow" :height="'100%'" :placement="'bottom'">
                                <n-drawer-content id="historyContext" title="本地历史 (Ctrl+F 搜索) (Esc 收起)"
                                    :body-content-style="{ 'display': 'flex', 'justify-content': 'center', 'align-items': 'center' }"
                                    closable>
                                    <div class="openAi-box">
                                        <div class="openAi-box-content">
                                            <n-scrollbar id="scrollbarAi-2" style="max-height: 100%">
                                                <div v-for="item, index in data.historyContext">
                                                    <!-- OpenAI -->
                                                    <div class="openAi-item" v-if="item.type == 'ai'">
                                                        <div class="item-left">
                                                            <div class="openAi-img">
                                                                <svg width="20" height="20" viewBox="0 0 41 41"
                                                                    fill="none" xmlns="http://www.w3.org/2000/svg"
                                                                    stroke-width="1.5" class="w-6 h-6">
                                                                    <path
                                                                        d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.4888 5.19742 27.7107 5.49804 25.9832C5.55718 26.0187 5.66048 26.0818 5.73461 26.1244L13.699 30.7248C13.8975 30.8408 14.1233 30.902 14.3532 30.902C14.583 30.902 14.8088 30.8408 15.0073 30.7248L24.731 25.1103V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.5542L15.206 28.4979C15.1894 28.5089 15.1703 28.5155 15.1505 28.5173C15.1307 28.5191 15.1107 28.516 15.0924 28.5082L7.04046 23.8557C5.32135 22.8601 4.06716 21.2235 3.55289 19.3046C3.03862 17.3858 3.30624 15.3413 4.29707 13.6194ZM31.955 20.0556L22.2312 14.4411L25.5976 12.4981C25.6142 12.4872 25.6333 12.4805 25.6531 12.4787C25.6729 12.4769 25.6928 12.4801 25.7111 12.4879L33.7631 17.1364C34.9967 17.849 36.0017 18.8982 36.6606 20.1613C37.3194 21.4244 37.6047 22.849 37.4832 24.2684C37.3617 25.6878 36.8382 27.0432 35.9743 28.1759C35.1103 29.3086 33.9415 30.1717 32.6047 30.6641C32.6047 30.5947 32.6047 30.4733 32.6047 30.3889V21.188C32.6066 20.9586 32.5474 20.7328 32.4332 20.5338C32.319 20.3348 32.154 20.1698 31.955 20.0556ZM35.3055 15.0128C35.2464 14.9765 35.1431 14.9142 35.069 14.8717L27.1045 10.2712C26.906 10.1554 26.6803 10.0943 26.4504 10.0943C26.2206 10.0943 25.9948 10.1554 25.7963 10.2712L16.0726 15.8858V11.9982C16.0715 11.9783 16.0753 11.9585 16.0837 11.9405C16.0921 11.9225 16.1048 11.9068 16.1207 11.8949L24.1719 7.25025C25.4053 6.53903 26.8158 6.19376 28.2383 6.25482C29.6608 6.31589 31.0364 6.78077 32.2044 7.59508C33.3723 8.40939 34.2842 9.53945 34.8334 10.8531C35.3826 12.1667 35.5464 13.6095 35.3055 15.0128ZM14.2424 21.9419L10.8752 19.9981C10.8576 19.9893 10.8423 19.9763 10.8309 19.9602C10.8195 19.9441 10.8122 19.9254 10.8098 19.9058V10.6071C10.8107 9.18295 11.2173 7.78848 11.9819 6.58696C12.7466 5.38544 13.8377 4.42659 15.1275 3.82264C16.4173 3.21869 17.8524 2.99464 19.2649 3.1767C20.6775 3.35876 22.0089 3.93941 23.1034 4.85067C23.0427 4.88379 22.937 4.94215 22.8668 4.98473L14.9024 9.58517C14.7025 9.69878 14.5366 9.86356 14.4215 10.0626C14.3065 10.2616 14.2466 10.4877 14.2479 10.7175L14.2424 21.9419ZM16.071 17.9991L20.4018 15.4978L24.7325 17.9975V22.9985L20.4018 25.4983L16.071 22.9985V17.9991Z"
                                                                        fill="currentColor"></path>
                                                                </svg>
                                                            </div>
                                                        </div>
                                                        <div class="item-right" v-if="item.html">
                                                            <div v-html="item.html"></div>
                                                            <span>[{{ item.dateTime }}]
                                                                <n-button @click="delHistoryContext(index)" type='error'
                                                                    size='tiny'>删除</n-button>
                                                            </span>
                                                        </div>
                                                        <div class="item-right" v-if="item.text">
                                                            <span :style="item.isError ? { color: 'firebrick' } : {}">{{
                                                                item.isError ? `[ ${item.text} ]` : item.text
                                                            }}</span>
                                                            <br />
                                                            <span>[{{ item.dateTime }}]
                                                                <n-button @click="delHistoryContext(index)" type='error'
                                                                    size='tiny'>删除</n-button>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <!-- OpenAI-Img -->
                                                    <div class="openAi-item" v-if="item.type == 'ai-img'">
                                                        <div class="item-left">
                                                            <div class="openAi-img">
                                                                <svg width="20" height="20" viewBox="0 0 41 41"
                                                                    fill="none" xmlns="http://www.w3.org/2000/svg"
                                                                    stroke-width="1.5" class="w-6 h-6">
                                                                    <path
                                                                        d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.4888 5.19742 27.7107 5.49804 25.9832C5.55718 26.0187 5.66048 26.0818 5.73461 26.1244L13.699 30.7248C13.8975 30.8408 14.1233 30.902 14.3532 30.902C14.583 30.902 14.8088 30.8408 15.0073 30.7248L24.731 25.1103V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.5542L15.206 28.4979C15.1894 28.5089 15.1703 28.5155 15.1505 28.5173C15.1307 28.5191 15.1107 28.516 15.0924 28.5082L7.04046 23.8557C5.32135 22.8601 4.06716 21.2235 3.55289 19.3046C3.03862 17.3858 3.30624 15.3413 4.29707 13.6194ZM31.955 20.0556L22.2312 14.4411L25.5976 12.4981C25.6142 12.4872 25.6333 12.4805 25.6531 12.4787C25.6729 12.4769 25.6928 12.4801 25.7111 12.4879L33.7631 17.1364C34.9967 17.849 36.0017 18.8982 36.6606 20.1613C37.3194 21.4244 37.6047 22.849 37.4832 24.2684C37.3617 25.6878 36.8382 27.0432 35.9743 28.1759C35.1103 29.3086 33.9415 30.1717 32.6047 30.6641C32.6047 30.5947 32.6047 30.4733 32.6047 30.3889V21.188C32.6066 20.9586 32.5474 20.7328 32.4332 20.5338C32.319 20.3348 32.154 20.1698 31.955 20.0556ZM35.3055 15.0128C35.2464 14.9765 35.1431 14.9142 35.069 14.8717L27.1045 10.2712C26.906 10.1554 26.6803 10.0943 26.4504 10.0943C26.2206 10.0943 25.9948 10.1554 25.7963 10.2712L16.0726 15.8858V11.9982C16.0715 11.9783 16.0753 11.9585 16.0837 11.9405C16.0921 11.9225 16.1048 11.9068 16.1207 11.8949L24.1719 7.25025C25.4053 6.53903 26.8158 6.19376 28.2383 6.25482C29.6608 6.31589 31.0364 6.78077 32.2044 7.59508C33.3723 8.40939 34.2842 9.53945 34.8334 10.8531C35.3826 12.1667 35.5464 13.6095 35.3055 15.0128ZM14.2424 21.9419L10.8752 19.9981C10.8576 19.9893 10.8423 19.9763 10.8309 19.9602C10.8195 19.9441 10.8122 19.9254 10.8098 19.9058V10.6071C10.8107 9.18295 11.2173 7.78848 11.9819 6.58696C12.7466 5.38544 13.8377 4.42659 15.1275 3.82264C16.4173 3.21869 17.8524 2.99464 19.2649 3.1767C20.6775 3.35876 22.0089 3.93941 23.1034 4.85067C23.0427 4.88379 22.937 4.94215 22.8668 4.98473L14.9024 9.58517C14.7025 9.69878 14.5366 9.86356 14.4215 10.0626C14.3065 10.2616 14.2466 10.4877 14.2479 10.7175L14.2424 21.9419ZM16.071 17.9991L20.4018 15.4978L24.7325 17.9975V22.9985L20.4018 25.4983L16.071 22.9985V17.9991Z"
                                                                        fill="currentColor"></path>
                                                                </svg>
                                                            </div>
                                                        </div>
                                                        <div class="item-right">
                                                            <img :src="item.imgUrl" style="width: 100%;" />
                                                            <span>[{{ item.dateTime }}]
                                                                <n-button @click="delHistoryContext(index)" type='error'
                                                                    size='tiny'>删除</n-button>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <!-- 用户提问 -->
                                                    <div class="openAi-item" v-if="item.type == 'user'">
                                                        <div class="item-left">
                                                            <div class="openAi-img"
                                                                style="background-color:slateblue;font-size: 1.2rem;">
                                                                <p>U</p>
                                                            </div>
                                                        </div>
                                                        <div class="item-right">
                                                            <span style="white-space: pre-wrap;">{{
                                                                item.text
                                                            }}</span>
                                                            <br>
                                                            <span>[{{ item.dateTime }}]
                                                                <n-button @click="delHistoryContext(index)" type="error"
                                                                    size="tiny">
                                                                    删除
                                                                </n-button>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <n-back-top :right="50" :to="`#scrollbarAi-2`" />
                                            </n-scrollbar>
                                        </div>
                                        <div class="openAi-box-bottom">
                                            <n-space>
                                                <n-popconfirm v-model:show="data.delAllShow" @positive-click=""
                                                    size="small">
                                                    <template #trigger>
                                                        <n-button type="error" size="small">
                                                            清空历史
                                                        </n-button>
                                                    </template>
                                                    确定要清空历史消息吗？
                                                    <template #action>
                                                        <n-button @click="delAll(), data.delAllShow = false"
                                                            type="error" size="small">
                                                            确定
                                                        </n-button>
                                                    </template>
                                                </n-popconfirm>
                                                <n-popconfirm v-model:show="data.delAllImgShow" @positive-click=""
                                                    size="small">
                                                    <template #trigger>
                                                        <n-button type="error" size="small">
                                                            删除图片
                                                        </n-button>
                                                    </template>
                                                    确定要删除所有图片消息及其提示吗？
                                                    <template #action>
                                                        <n-button @click="delImg(), data.delAllImgShow = false"
                                                            type="error" size="small">
                                                            确定
                                                        </n-button>
                                                    </template>
                                                </n-popconfirm>
                                                <n-button @click="data.historyShow = false" size="small">
                                                    返回
                                                </n-button>
                                            </n-space>
                                        </div>
                                    </div>

                                </n-drawer-content>
                            </n-drawer>

                        </n-space>
                    </div>
                </div>
            </n-drawer-content>
        </NDrawer>
        <div class="content_box">
            <div id="top_box">
                <div class="top_title">
                    <a href="/">
                        cczzyy.cn
                    </a>
                </div>
            </div>

            <NSpace style="margin-bottom: 10px;">
                <NInput v-model:value="SearchData.search" @input="postArticle()" clearable type="text" placeholder="搜索"
                    style="width: 240px;" />
                <div class="select_tag_box">
                    <NSelect v-model:value="SearchData.tag" @update:value="postArticle" multiple clearable filterable
                        :max-tag-count="5" :render-tag="renderTag" :render-label="renderLabel" :options="data.TagArray"
                        placeholder="标签" />
                </div>
                <NButton color="#8a2be2" type="success" @click="GoPublish('Publish', {})">Publish</NButton>
                <n-button color="rgb(16, 163, 127)" @click="data.openAiShow = true, aiBoxScroll()">
                    <svg width="20" height="20" style="margin-right: 5px;" viewBox="0 0 41 41" fill="none"
                        xmlns="http://www.w3.org/2000/svg" stroke-width="1.5" class="w-6 h-6">
                        <path
                            d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.4888 5.19742 27.7107 5.49804 25.9832C5.55718 26.0187 5.66048 26.0818 5.73461 26.1244L13.699 30.7248C13.8975 30.8408 14.1233 30.902 14.3532 30.902C14.583 30.902 14.8088 30.8408 15.0073 30.7248L24.731 25.1103V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.5542L15.206 28.4979C15.1894 28.5089 15.1703 28.5155 15.1505 28.5173C15.1307 28.5191 15.1107 28.516 15.0924 28.5082L7.04046 23.8557C5.32135 22.8601 4.06716 21.2235 3.55289 19.3046C3.03862 17.3858 3.30624 15.3413 4.29707 13.6194ZM31.955 20.0556L22.2312 14.4411L25.5976 12.4981C25.6142 12.4872 25.6333 12.4805 25.6531 12.4787C25.6729 12.4769 25.6928 12.4801 25.7111 12.4879L33.7631 17.1364C34.9967 17.849 36.0017 18.8982 36.6606 20.1613C37.3194 21.4244 37.6047 22.849 37.4832 24.2684C37.3617 25.6878 36.8382 27.0432 35.9743 28.1759C35.1103 29.3086 33.9415 30.1717 32.6047 30.6641C32.6047 30.5947 32.6047 30.4733 32.6047 30.3889V21.188C32.6066 20.9586 32.5474 20.7328 32.4332 20.5338C32.319 20.3348 32.154 20.1698 31.955 20.0556ZM35.3055 15.0128C35.2464 14.9765 35.1431 14.9142 35.069 14.8717L27.1045 10.2712C26.906 10.1554 26.6803 10.0943 26.4504 10.0943C26.2206 10.0943 25.9948 10.1554 25.7963 10.2712L16.0726 15.8858V11.9982C16.0715 11.9783 16.0753 11.9585 16.0837 11.9405C16.0921 11.9225 16.1048 11.9068 16.1207 11.8949L24.1719 7.25025C25.4053 6.53903 26.8158 6.19376 28.2383 6.25482C29.6608 6.31589 31.0364 6.78077 32.2044 7.59508C33.3723 8.40939 34.2842 9.53945 34.8334 10.8531C35.3826 12.1667 35.5464 13.6095 35.3055 15.0128ZM14.2424 21.9419L10.8752 19.9981C10.8576 19.9893 10.8423 19.9763 10.8309 19.9602C10.8195 19.9441 10.8122 19.9254 10.8098 19.9058V10.6071C10.8107 9.18295 11.2173 7.78848 11.9819 6.58696C12.7466 5.38544 13.8377 4.42659 15.1275 3.82264C16.4173 3.21869 17.8524 2.99464 19.2649 3.1767C20.6775 3.35876 22.0089 3.93941 23.1034 4.85067C23.0427 4.88379 22.937 4.94215 22.8668 4.98473L14.9024 9.58517C14.7025 9.69878 14.5366 9.86356 14.4215 10.0626C14.3065 10.2616 14.2466 10.4877 14.2479 10.7175L14.2424 21.9419ZM16.071 17.9991L20.4018 15.4978L24.7325 17.9975V22.9985L20.4018 25.4983L16.071 22.9985V17.9991Z"
                            fill="currentColor"></path>
                    </svg>
                    OpenAI
                </n-button>
            </NSpace>
            <div class="text f" style="flex-direction:row-reverse;margin-bottom: 5px;">
                <span>total:{{ data.ArticleArray.length }}/{{ data.PageData.total }}</span>
                <!-- <span style="margin-right: 10px;">page:{{ data.PageData.page }}/{{ data.PageData.last_page }}</span> -->
            </div>
            <NSpin :show="data.Loading" style="width: 100%;min-height: 700px;">
                <NCollapseTransition v-for="(item, index) in data.ArticleArray" :show="item.show">
                    <div class="item_box">
                        <NCard content-style="padding: 10px;">
                            <router-link :to="{ name: 'Article', query: { id: item.id } }">
                                <div class="item_title_box">
                                    {{ item.title }}
                                </div>
                            </router-link>

                            <div class="item_tag_box">
                                <div class="tag_box">
                                    <div v-for="(item2, index2) in item.GlArticleTag "
                                        style="margin-right: 10px;margin-bottom: 5px;">
                                        <router-link :to="`/?tag_id=${item2.tag_id}`">
                                            <NTag
                                                :color="{ color: item2.color, textColor: '#FFFFFFFF', borderColor: '#6D9B9FFF' }"
                                                style="cursor: pointer;">
                                                {{ item2.name }}</NTag>
                                        </router-link>
                                    </div>

                                </div>
                                <div class="time_box">
                                    <span>{{ item.c_time }}</span>
                                    <n-button quaternary type="success" size="small" @click="updateArticle(item, index)"
                                        style="margin-left: 5px;" :loading="item.loading">Update</n-button>
                                    <n-button quaternary type="error" size="small" @click="deleteArticle(item, index)"
                                        :loading="item.loading" style="margin-left: 5px;">Delete</n-button>
                                </div>
                            </div>
                            <Editor :editorId="item.editorId" :defaultConfig="item.editorConfig"
                                :defaultHtml="item.defaultHtml" mode="default"
                                style="height: auto;max-height: 700px;overflow-y: hidden;border: 1px solid #BBC4C2CF" />
                        </NCard>
                    </div>
                </NCollapseTransition>
            </NSpin>
            <NSpin :show="data.AddLoading">
                <div style="width: 100%;height:1px"></div>
            </NSpin>
            <div class="text f" style="flex-direction:row-reverse">
                <span>total:{{ data.ArticleArray.length }}/{{ data.PageData.total }}</span>
                <!-- <span style="margin-right: 10px;">page:{{ data.PageData.page }}/{{ data.PageData.last_page }}</span> -->
            </div>

        </div>

    </div>
</template>

<style scoped>
#index {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.openAi-box {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    box-shadow: 2px 2px 8px rgba(20, 20, 20, 0.3);
    border-radius: 0.3rem;
    max-width: 1000px;
}

.openAi-box:hover {
    box-shadow: 2px 2px 8px rgba(20, 20, 20, 0.4);
}

:deep() #scrollbarAi {
    border-bottom: 0.5px solid rgba(57, 54, 54, 0.2);
}

.openAi-box-content {
    flex: 1;
    height: 0;
    padding: 10px;
    padding-top: 0px;
}

.openAi-item {
    display: flex;
    padding-top: 10px;
    padding-bottom: 10px;
}

.item-left {
    width: 40px;
}

.item-right {
    flex: 1;
    width: 0;
    font-size: 1rem;
    line-height: 1.9rem;
    font-family: 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', 'monospace';
}

.item-right span {
    white-space: pre-wrap;
    overflow-wrap: break-word;
}

:deep() .item-right pre code {
    display: block;
    overflow-x: auto;
}

.item-right img {
    border-radius: 0.3rem;
    box-shadow: none;
}

.item-right img:hover {
    box-shadow: none;
}

:deep() .item-right pre {
    line-height: 1.2rem;
}

:deep() .hljs {
    font-size: 0.95rem;
    color: white;
    background-color: #000000 !important;
    border-radius: 0.375rem;
    font-family: 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', 'monospace' !important;
    padding: 10px;
    overflow-x: auto;
}

:deep() .item-right ol {
    margin-left: 2.25rem;
}

:deep() .item-right li {
    margin-left: 2.25rem;
}

.ai-highlightjs {
    width: 100%;
    height: auto;
}

.openAi-img {
    width: 2rem;
    height: 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    background-color: rgb(16, 163, 127);
    border-radius: 0.3rem;
}

.openAi-box-bottom {
    display: flex;
    flex-direction: column;
    padding: 10px;
    padding-top: 0px;
}

#top_box {
    display: flex;
    margin-bottom: 20px;
}

.top_title {
    font-size: 3rem;
    color: #708090;
    font-family: Consolas, Monaco, Andale Mono, Ubuntu Mono, monospace;
}

.content_box {
    max-width: 1080px;
    width: 100%;
    min-height: 900px;
    padding: 10px;
}

.item_title_box {
    width: 100%;
    font-size: 1.5rem;
    margin-bottom: 5px;
    cursor: pointer;
}

.item_title_box:hover {
    color: cornflowerblue;
}

.select_tag_box {
    min-width: 240px;
}

.bottom_box {
    width: 100%;
    margin-bottom: 20px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
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
    margin-top: -8px;
}

.item_box {
    margin-bottom: 20px;
}

.item_tag_box {
    margin-bottom: 15px;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
}

.tag_box {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 5px;
}

.time_box {
    display: flex;
    align-items: center;
    font-size: 0.8rem;
    line-height: 0.8rem;
    margin-top: 5px;
    flex-wrap: wrap;
    padding-bottom: 5px;
}
</style>
