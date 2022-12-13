<script setup lang="ts">
import { onBeforeUnmount, h, reactive, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NButton, NInput, NSpace, NTag, NColorPicker, NSelect, SelectRenderTag, NSpin } from 'naive-ui'
import '@wangeditor/editor/dist/css/style.css'
import { IDomEditor, IEditorConfig } from '@wangeditor/editor'
import { Editor, Toolbar, getEditor, removeEditor } from '@wangeditor/editor-for-vue'

import { AppType } from "/@/type/AppType"

const app = inject('app') as AppType

const router = useRouter();
const route = useRoute()

interface Article {
    id: string,
    title: string,
    GlArticleTag: {
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
    PublishLoading: boolean,
    AddTagLoading: boolean,
    ImageList: {
        [key: string]: string,
    },
    IsPublish: boolean,
    Loading: boolean,
    msg: string,
}>({
    ArticleArray: [],
    TagArray: [],
    PublishLoading: false,
    AddTagLoading: false,
    ImageList: {}, // 所有上传插入过的图片
    IsPublish: false,
    Loading: false,
    msg: '',
})

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
        document.title = `修改文章 - [${res.data[0].title}] | cczzyy.cn`;
        FormData.id = res.data[0].id
        FormData.title = res.data[0].title
        FormData.tag = res.data[0].tag
        FormData.ImageSrcList = res.data[0].ImageSrcList
        res.data[0].ImageSrcList.forEach((item: string) => {
            data.ImageList[item] = item
        })
        const editor = getEditor(editorId)
        if (editor == null) return
        editor.dangerouslyInsertHtml(res.data[0].defaultHtml)
    }
    if (res.code == 400 && res.msg) {
        data.msg = res.msg;
    }
}

postArticle()

const postTag = async () => {
    let res = await app.post(app.api.postTag, {})
    res.data.forEach((item: { name: string; id: string; color: string; }) => {
        data.TagArray.push({
            label: item.name,
            value: item.id,
            color: item.color
        })
    });
}

postTag()

const mode = 'default'
const editorId = `w-e-${Math.random().toString().slice(-5)}` //【注意】编辑器 id ，要全局唯一

// 编辑器配置
const toolbarConfig = {}
const editorConfig = {
    placeholder: '请输入内容...',
    MENU_CONF: {
        uploadImage: {
            // 图片上传路径
            server: app.api.Url + app.api.uploadImage,
            // form-data 文件字段名
            fieldName: 'wangeditor-uploaded-image',
            // 单个文件的最大体积限制
            maxFileSize: 5 * 1024 * 1024, // 2M
        },
        insertImage: {
            // 插入图片回调
            onInsertedImage(imageNode: { src: string, alt: string, url: string, href: string } | null) {
                if (imageNode == null) return
                data.ImageList[imageNode.src] = imageNode.src
                console.log(data.ImageList)
            }
        },
    },
}

// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
    const editor = getEditor(editorId)
    if (editor == null) return
    editor.destroy()
    removeEditor(editorId)
})

// 修改文章
const clickUpdateBtn = async () => {
    const editor = getEditor(editorId)
    if (!editor) {
        return
    }
    // 最后编辑器存在的图片
    let ImageArray = editor.getElemsByType('image')
    // 所有上传插入过的图片
    let DeleteImageList = data.ImageList
    let ImageSrcList = [] as string[]
    ImageArray.forEach((item: any) => {
        if (DeleteImageList[item.src]) {
            // 保存需要的图片
            ImageSrcList.push(item.src)
            // 移除需要的图片
            delete DeleteImageList[item.src]
        }
    })
    FormData.ImageSrcList = ImageSrcList
    data.PublishLoading = true
    let res = await app.post(app.api.editArticle, { FormData: FormData, DeleteImageList: DeleteImageList })
    data.PublishLoading = false
    if (res.code == 200) {
        data.IsPublish = true
        router.push({
            name: 'Article',
            query: {
                id: FormData.id
            }
        })
    }
}

const NewTag = reactive({
    name: '',
    color: '#52A9998C',
})

const clickAddTag = async () => {
    data.AddTagLoading = true
    let res = await app.post(app.api.addTag, { FormData: NewTag })
    data.AddTagLoading = false
    if (res.code == 200) {
        data.TagArray.push({
            label: res.Res.name,
            value: res.Res.id,
            color: res.Res.color
        })
    }
}

const changeContent = (editor: IDomEditor) => {
    FormData.defaultHtml = editor.getHtml()
}

const FormData = reactive({
    id: '',
    title: '',
    tag: [],
    defaultHtml: "" as string,
    ImageSrcList: [] as string[],
})
</script>

<template>
    <div id="publish">

        <div class="form_box">
            <div id="top_box">
                <div class="top_title">
                    <a href="/">cczzyy.cn</a>
                </div>
            </div>
            <div class="top_title">
                {{ data.msg }}
            </div>
            <NSpin :show="data.Loading">
                <NSpace vertical>
                    <NInput v-model:value="FormData.title" size="large" type="text" placeholder="标题" />
                    <div class="select_tag_box">
                        <NSelect v-model:value="FormData.tag" multiple :render-tag="renderTag"
                            :render-label="renderLabel" :options="data.TagArray" placeholder="文章标签" />
                    </div>
                    <div class="add_tag_box">
                        <NInput v-model:value="NewTag.name" type="text" placeholder="新增标签名"
                            style="width: 200px;margin-right: 10px;" />
                        <div class="f_a_i_c">
                            <span class="l_span">颜色:</span>
                            <NColorPicker v-model:value="NewTag.color" :modes="['hex']"
                                style="width: 120px;margin-right: 10px;" />
                        </div>
                        <div class="f_a_i_c">
                            <span class="l_span">预览:</span>
                            <NTag :color="{ color: NewTag.color, textColor: '#FFFFFFFF', borderColor: '#6D9B9FFF' }"
                                style="margin-right: 10px;">{{ NewTag.name }}</NTag>
                        </div>
                        <NButton type="success" @click="clickAddTag" :loading="data.AddTagLoading" size="small">添加
                        </NButton>
                    </div>
                </NSpace>
            </NSpin>

            <div class="editor_box">
                <div style="border: 1px solid #ccc;z-index: 9999;">
                    <Toolbar :editorId="editorId" :defaultConfig="toolbarConfig" :mode="mode"
                        style="border-bottom: 1px solid #ccc;" />
                    <Editor :editorId="editorId" :defaultConfig="editorConfig" :defaultHtml="FormData.defaultHtml"
                        :mode="mode" @onChange="changeContent" style="height: 830px; overflow-y: hidden;" />
                    <!-- 注意: defaultContent (JSON 格式) 和 defaultHtml (HTML 格式) ，二选一 -->
                </div>
            </div>
            <div class="publish_box">
                <NButton type="success" @click="clickUpdateBtn" :loading="data.PublishLoading">修改文章</NButton>
            </div>
        </div>
    </div>
</template>

<style scoped>
#publish {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 10px;
}

.form_box {
    max-width: 1080px;
    width: 100%;
    height: 100%;
    padding: 10px;
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

.editor_box {
    width: 100%;
    margin-top: 5px;
    margin-bottom: 10px;
}

.l_span {
    margin-right: 10px;
}

.add_tag_box {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
}

.add_tag_box>div {
    margin-bottom: 5px;
}

.add_tag_box>button {
    margin-bottom: 5px;
}

.publish_box {
    display: flex;
    justify-content: right;
}
</style>
