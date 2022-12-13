<script setup lang="ts">
import { reactive, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NCard, NTag, NButton, NCollapseTransition, NSpin } from 'naive-ui'
import { IEditorConfig } from '@wangeditor/editor'
import { Editor } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { AppType } from "/@/type/AppType"

const app = inject('app') as AppType
const router = useRouter();
const route = useRoute()

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

const data = reactive<{
    ArticleArray: Article[],
    TagArray: {
        label: string,
        color: string,
        value: string
    }[],
    DeleteList: {
        [key: string]: boolean;
    },
    ShowBotton: boolean,
    Loading: boolean,
    msg: string,
}>({
    ArticleArray: [],
    TagArray: [],
    DeleteList: {},
    ShowBotton: false,
    Loading: false,
    msg: '',
})

const postArticle = async () => {
    if (!route.query.id) {
        app.msg.error('缺少文章ID参数')
        data.msg = `缺少文章ID参数`;
        return;
    }
    data.ArticleArray = []
    data.Loading = true
    let RequestData = {
        sql: {
            where: [
                ['id', '=', route.query.id]
            ],
        }
    }
    let res = await app.post(app.api.postArticle, RequestData)
    data.Loading = false
    if (res.code == 200) {
        if (!res.data[0]) {
            app.msg.error('文章不存在或ID参数错误')
            data.msg = `文章不存在或ID参数错误`;
        }
        res.data.forEach((item: Article, index: number) => {
            document.title = item.title + ' | cczzyy.cn'
            item.editorId = `w-e-${Math.random().toString().slice(-5)}-${item.id}`
            item.loading = false
            item.show = false
            item.editorConfig = {
                // 只读编辑器
                readOnly: true
            }
            data.ArticleArray.push(item)
            setTimeout(() => {
                data.ArticleArray[index].show = true
            }, 100)
        })
        setTimeout(() => {
            data.ShowBotton = true
        }, 500)
    }
    if (res.code == 400 && res.msg) {
        data.msg = res.msg;
    }
    // 等待富文本内 img dom 渲染完再添加点击抽屉大图事件
    setTimeout(() => {
        // #article 所有后代 img 元素
        app.state.img.handleImg("#article")
    }, 500)
}

postArticle()

const deleteArticle = async (item: Article, index: number) => {
    let pw = localStorage.getItem('pw')
    data.ArticleArray[index].loading = true
    let res = await app.post(app.api.deleteArticle, { id: item.id, pw: pw })
    data.ArticleArray[index].loading = false
    if (res.code == 200) {
        data.ArticleArray[index].show = false
        router.push({
            name: 'Index',
        })
    }
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
            }
        })
    }
}

</script>

<template>
    <div id="article">
        <div class="content_box">
            <div id="top_box">
                <div class="top_title">
                    <a href="/">cczzyy.cn</a>
                </div>
            </div>
            <div class="top_title">
                {{ data.msg }}
            </div>
            <NSpin :show="data.Loading" style="width: 100%;min-height: 600px;">
                <NCollapseTransition v-for="(item, index) in data.ArticleArray" :show="item.show">
                    <div class="item_box">
                        <NCard content-style="padding: 10px;">
                            <div class="item_title_box">
                                {{ item.title }}
                            </div>
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
                                    {{ item.c_time }}
                                    <n-button quaternary type="success" size="small" @click="updateArticle(item, index)"
                                        style="margin-left: 5px;" :loading="item.loading">Update</n-button>
                                    <n-button quaternary type="error" size="small" @click="deleteArticle(item, index)"
                                        style="margin-left: 5px;" :loading="item.loading">Delete</n-button>
                                </div>
                            </div>
                            <Editor :editorId="item.editorId" :defaultConfig="item.editorConfig"
                                :defaultHtml="item.defaultHtml" mode="default"
                                style="height: auto;overflow-y: hidden;border: 1px solid #BBC4C2CF" />
                        </NCard>
                    </div>
                </NCollapseTransition>
            </NSpin>
        </div>
    </div>
</template>

<style scoped>
#article {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
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
    padding-bottom: 10px;
}

.item_title_box {
    width: 100%;
    font-size: 1.5rem;
    margin-bottom: 5px;
}

.select_tag_box {
    min-width: 240px;
}

.bottom_box {
    width: 100%;
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
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

.item_box {
    margin-bottom: 10px;
}

.item_tag_box {
    margin-bottom: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
}

.tag_box {
    display: flex;
    align-items: center;
    margin-top: 5px;
    flex-wrap: wrap;
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
