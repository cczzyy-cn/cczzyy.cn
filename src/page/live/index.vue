<script setup lang="ts">
import { onMounted, reactive, inject, onBeforeUnmount, } from 'vue'
import { useRoute } from 'vue-router'
import { NCard } from 'naive-ui'
import { AppType } from "/@/type/AppType"
import { Editor, Toolbar, getEditor, removeEditor } from '@wangeditor/editor-for-vue'
import { IDomEditor, IToolbarConfig, IEditorConfig, Boot } from '@wangeditor/editor'
import { IButtonMenu } from '@wangeditor/core'

import '@wangeditor/editor/dist/css/style.css'
import vue3videoPlay from 'vue3-video-play'
import 'vue3-video-play/dist/style.css'

const app = inject('app') as AppType

const route = useRoute()

const data = reactive<{
    LiveID: string,
    RoomInfo: {
        title: string,
    },
    ShowMsg: boolean,
    ChatArray: {
        name?: string,
        msg?: string,
        type: string,
    }[],
    SendMsg: string,
    msg: string,
    ws: WebSocket,
    options: object
}>({
    LiveID: '',
    RoomInfo: {
        title: '直播',
    },
    ShowMsg: false,
    ChatArray: [],
    SendMsg: '',
    msg: '',
    ws: {} as WebSocket,
    options: {
        width: '100%', // 播放器高度
        height: 'auto', // 播放器高度
        color: "#409eff", // 主题色
        title: '直播', // 视频名称
        src: '', // 视频源
        type: 'm3u8', // 视频源格式
        muted: true, // 静音
        webFullScreen: false, // 网页全屏
        speedRate: ["0.75", "1.0"], //播放倍速
        autoPlay: true, // 自动播放
        loop: false, // 循环播放
        mirror: false, // 镜像画面
        ligthOff: false,  // 关灯模式
        volume: 0.3, // 默认音量大小
        control: true, // 是否显示控制
        controlBtns: [
            'audioTrack', // 音轨切换按钮
            'quality', // 视频质量切换按钮
            'speedRate', // 速率切换按钮
            'volume', // 音量
            'setting', // 设置
            'pip', // 画中画按钮
            'pageFullScreen', // 网页全屏按钮
            'fullScreen', // 全屏按钮
        ]
    }
})

const mode = 'simple' //  default | simple:隐藏选中文本时的 hoverbar
const editorId = `w-e-${Math.random().toString().slice(-5)}` //【注意】编辑器 id ，要全局唯一
// 自定义按钮菜单
// 定义菜单 class
class WSSendButtonMenu implements IButtonMenu {
    // 菜单配置，参考“引用”菜单源码
    readonly title = '发送'
    readonly iconSvg?: string;
    readonly hotkey?: string;
    readonly alwaysEnable?: boolean;
    readonly tag = 'button'
    readonly width?: number;

    getValue = (editor: IDomEditor) => {
        return ''
    }

    isActive(editor: IDomEditor): boolean {
        return false
    }

    // 是否禁止使用
    isDisabled(editor: IDomEditor): boolean {
        let msg = editor.getText()
        // 内容为空禁止按钮使用
        if (msg == '') {
            return true
        }
        return false
    }

    /**
     * 执行命令
     * @param editor editor
     * @param value node.type
     */
    exec(editor: IDomEditor, value: string | boolean) {
        let msg = editor.getText()
        wsSend(msg, editor);
    }

}

// 定义菜单配置
const WSSendConf = {
    key: 'ws-send', // menu key ，唯一。注册之后，可配置到工具栏
    factory() {
        return new WSSendButtonMenu()
    },
}

// 注册到 wangEditor
Boot.registerMenu(WSSendConf)
// 编辑器配置
const toolbarConfig: Partial<IToolbarConfig> = {
    // 需要菜单
    toolbarKeys: [
        'ws-send',
        'emotion',
    ],
    // 插入菜单
}
const editorConfig: Partial<IEditorConfig> = {
    placeholder: '请输入内容...',
    maxLength: 50,
    MENU_CONF: {

    },
    customAlert: (info, type) => {
        switch (type) {
            case 'success':
                app.msg.success(info)
                break
            case 'info':
                app.msg.info(info)
                break
            case 'warning':
                app.msg.warning(info)
                break
            case 'error':
                app.msg.error(info)
                break
            default:
                app.msg.info(info)
                break
        }
    }
}

// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
    const editor = getEditor(editorId)
    if (editor == null) return
    editor.destroy()
    removeEditor(editorId)
})

// 回车发送
const onEnter = (e: Event) => {
    let editor = getEditor(editorId)
    if (editor) {
        let msg = editor.getText()
        wsSend(msg, editor)
    }
}

// 发送信息
const wsSend = (msg: string, editor: IDomEditor) => {
    // str.replace(/[\n\r]/g, '').replace(/\s+/g, '').substring(0, 50)
    msg = msg.replace(/[\n\r]/g, '').substring(0, 50)
    if (msg) {
        let SendData = {
            LiveID: data.LiveID,
            type: 'msg',
            msg: msg,
        }
        let json = JSON.stringify(SendData)
        data.ws.send(json)
        console.log(`ws-send: ${msg}`);
    }
    // 清空
    editor.select([])
    editor.deleteFragment()
}

const customPaste = (editor: IDomEditor, event: ClipboardEvent, callback: (b: boolean) => void) => {
    if (event.clipboardData) {
        // const html = event.clipboardData.getData('text/html') // 获取粘贴的 html
        let text = event.clipboardData.getData('text/plain') // 获取粘贴的纯文本
        text = text.replace(/[\n\r]/g, '')
        // const rtf = event.clipboardData.getData('text/rtf') // 获取 rtf 数据（如从 word wsp 复制粘贴）

        // 自定义插入内容
        editor.insertText(text)
    }

    // 返回 false ，阻止默认粘贴行为
    event.preventDefault()
    callback(false) // 返回值（注意，vue 事件的返回值，不能用 return）

    // 返回 true ，继续默认的粘贴行为
    // callback(true)
}

onMounted(() => {
    data.LiveID = route.query.LiveID as string
    if (!data.LiveID) {
        app.msg.error('缺少 LiveID 参数')
        data.ShowMsg = true
        data.msg = '缺少 LiveID 参数';
        return;
    }

    data.ws = new WebSocket(app.api.LiveWs);

    data.ws.onopen = (e) => {
        let SendData = {
            type: 'open',
            LiveID: data.LiveID,
        }
        let json = JSON.stringify(SendData)
        data.ws.send(json)
    }

    data.ws.onmessage = (e) => {
        let Res = JSON.parse(e.data)
        data.ChatArray.push(Res)
    }

    data.ws.onclose = (e) => {
        let Res = {
            type: 'error',
            msg: '连接断开',
        }
        data.ChatArray.push(Res)
    }

    data.ws.onerror = (e) => {
        console.log(e);
    }
})

</script>

<template>
    <div id="live">

        <div class="live_box">
            <div id="top_box">
                <div class="top_title">
                    <a href="/">cczzyy.cn</a>
                </div>
            </div>

            <NCard content-style="padding: 10px;flex-direction: column;">
                <div class="room_title_box">
                    {{ data.RoomInfo.title }}
                </div>
                <div class="room_title_box" style="font-size: 0.8rem;">LiveID: {{ data.LiveID }}</div>
                <div class="content_box">
                    <div class="video_box">
                        <div v-show="!data.ShowMsg">
                            <vue3videoPlay v-bind="data.options"
                                :src="app.api.LiveUrl + '/hls/' + data.LiveID + '.m3u8'" :type="'m3u8'" poster='' />
                        </div>
                        <div class="top_title" v-show="data.ShowMsg">
                            {{ data.msg }}
                        </div>

                    </div>

                    <NCard class="chat_box" content-style="padding: 5px;display:flex;flex-direction: column;">
                        <div class="item_box">
                            <div class="item_chat_box" v-for="(item, index) in data.ChatArray">
                                <span v-if="item.type == 'open'">{{ item.msg }}</span>
                                <span v-if="item.type == 'msg'">{{ item.name }}: {{ item.msg }}</span>
                                <span v-if="item.type == 'error'" style="color: crimson;">{{ item.msg }}</span>
                            </div>
                        </div>

                        <NCard content-style="padding: 0px;width:100%">
                            <Toolbar :editorId="editorId" :defaultConfig="toolbarConfig" :mode="mode"
                                style="border-bottom: 1px solid #ccc" />
                            <Editor :editorId="editorId" :defaultConfig="editorConfig" :defaultHtml="data.SendMsg"
                                :mode="mode" @customPaste="customPaste" @keydown.enter.prevent="onEnter"
                                style="height: 100px; overflow-y: hidden;z-index: 999;" />
                        </NCard>
                    </NCard>

                </div>
            </NCard>

        </div>

    </div>
</template>

<style scoped>
#live {
    width: 100%;
    padding: 10px;
}

.live_box {
    width: 100%;
    display: flex;
    flex-direction: column;
    padding-bottom: 20px;

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

.room_title_box {
    width: 100%;
    font-size: 1.5rem;
    line-height: 1.5rem;
    color: #708090;
    font-family: Consolas, Monaco, Andale Mono, Ubuntu Mono, monospace;
    margin-bottom: 10px;
}

.content_box {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
}

.video_box {
    flex: 1 1 600px;
    margin-bottom: 10px;
    background-color: darkgray;
    font-size: 1rem;
}


.chat_box {
    flex: 0 1 250px;
    width: 0;
    margin-bottom: 10px;
    z-index: 9;
}

.item_box {
    flex: 1 1 auto;
    width: 100%;
    height: 200px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

.item_chat_box {
    font-size: 0.8rem;
    line-height: 1.1rem;
    color: #708090;
    font-family: Consolas, Monaco, Andale Mono, Ubuntu Mono, monospace;
    white-space: normal;
    word-break: break-all;
    word-wrap: break-word;
    padding: 5px;
}

:deep() .w-e-bar-show {
    display: flex;
    flex-direction: row-reverse;
}

:deep() .w-e-panel-content-emotion {
    font-size: 20px;
    list-style: none;
    text-align: left;
    width: 220px;
    height: 135px;
    overflow-y: auto;
}

:deep() .w-e-panel-content-emotion li {
    min-width: 38px;
    text-align: center
}

:deep() .w-e-text-container p {
    font-size: 0.8rem;
    line-height: 1rem;
    margin-top: 10px !important;
    margin-bottom: 10px;
}

:deep() .w-e-text-placeholder {
    font-style: italic;
    left: 10px;
    top: 7px;
    width: 90%;
}
</style>
