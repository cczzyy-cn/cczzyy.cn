<script setup lang="ts">
import { ref, Ref, inject } from 'vue'
import { NCard, NModal, NInput, NImage } from 'naive-ui'
import { AppType } from "/@/type/AppType"
const app = inject('app') as AppType

const showModal = ref(false)
const fileInput: Ref<HTMLInputElement | null> = ref(null)
let imageBase64: string | ArrayBuffer | null
let text = ref(null)
let imageSrc = ref('https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg')
let time = ref('0')
const selectImage = () => {
    if (fileInput.value) {
        fileInput.value.click()
    }
}

const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        console.log('已选择文件:', file);
        if (file.size > 2 * 1024 * 1024) {
            app.msg.error('图片文件不能大于2M')
            return
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target) {
                // 将文件转换为 Base64 字符串
                imageBase64 = e.target.result as string;
                imageSrc.value = imageBase64
                time.value = '0'
                console.log(imageSrc);
            }

        };
        reader.readAsDataURL(file);
    }
}

const postTextByImage = async () => {
    text.value = null
    // 开始计时
    const startTime = performance.now();
    if (!imageBase64) {
        app.msg.warning('选择图片数据为空!')
        return
    }
    time.value = '等待中...'
    let RequestData = {
        imageBase64: imageBase64,
    }
    let res = await app.post(app.api.imageToText, RequestData)
    if (res.code == 200) {
        console.log(res.data);
        text.value = res.data
        // 结束计时
        const endTime = performance.now();
        // 计算耗时（以毫秒为单位）
        const elapsedTime = endTime - startTime;
        // 将毫秒转换为秒，并保留两位小数
        const seconds = (elapsedTime / 1000).toFixed(2);
        time.value = res.time + 's <- ' + seconds + 's'
    }
}

</script>
  
<template>
    <div>
        <n-button color="#3C5B6F" type="success" @click="showModal = true">
            图片转文字
        </n-button>
        <n-modal v-model:show="showModal">
            <n-card style="width: 600px" title="图片转文字" :bordered="false" size="huge" role="dialog" aria-modal="true">
                <template #header-extra>
                    <n-button color="#3C5B6F" type="success" @click="selectImage">
                        选择图片
                    </n-button>
                    <n-button type="success" @click="postTextByImage" style="margin-left: 10px;">
                        提取文本
                    </n-button>
                    <n-button color="#FF6500" type="success" @click="showModal = false" style="margin-left: 10px;">
                        关闭
                    </n-button>
                </template>

                <div>
                    <input ref="fileInput" type="file" @change="handleFileChange($event)" style="display: none;">
                    <n-image width="200" :src="imageSrc"
                        fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg" />
                    <span style="margin-left: 10px;">识别耗时：{{ time }}</span>
                    <n-input v-model:value="text" type="textarea" style="height: 500px;" placeholder="图片内文本..." />
                </div>

                <template #footer>

                </template>
            </n-card>
        </n-modal>
    </div>
</template>