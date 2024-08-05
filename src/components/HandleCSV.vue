<script setup lang="ts">
import { ref, Ref, inject, reactive } from 'vue'
import { NCard, NModal, NInput, NForm, NFormItem, NButton, NInputGroup, NDataTable, NInputNumber, NSpace, NSwitch } from 'naive-ui'
import { AppType } from "/@/type/AppType"
import Papa from 'papaparse';

const app = inject('app') as AppType

const showModal = ref(false)
const fileInput: Ref<HTMLInputElement | null> = ref(null)

const data = reactive<{
    fileName: string,
    fileList: any[],
    newFileName: string,
    columns: any[],
    fieldsCSV: any,
    csvData: any[],
    newData: any,
    value: number,
    valueH: number,
    valueW: number,
    valueS: boolean,
}>({
    fileName: '',
    fileList: [],
    newFileName: "已处理CSV文件",
    columns: [
        {
            title: '文件名',
            key: 'name'
        },
        {
            title: '文件大小',
            key: 'size'
        },
    ],
    fieldsCSV: {},
    csvData: [],
    newData: null,
    value: 210,
    valueH: 1200,
    valueW: 550,
    valueS: true,
})

const selectFileCSV = () => {
    if (fileInput.value) {
        fileInput.value.click()
    }
}


const nowDate = () => {
    let date = new Date()
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 添加前导零
    const day = date.getDate(); // 添加前导零
    return `${year}.${month}.${day}`;
}

const handleFileChange = (event: Event) => {
    data.csvData = []
    const target = event.target as HTMLInputElement;
    if (target.files) {
        let files = [] as any[]
        data.fileList = Array.from(target.files)
        data.fileList.forEach((item, index) => {
            files[index] = target.files?.[index];
            if (files[index]) {
                const reader = new FileReader();
                reader.onload = () => {
                    Papa.parse(reader.result, {
                        encoding: "GBK",
                        header: true, // 解析数据的第一行将被解释为字段名称，results.meta中将返回一个字段名称数组
                        skipEmptyLines: true, // 跳过空白行
                        complete: (results: { data: any[], meta: any }) => {
                            data.fieldsCSV = results.meta
                            results.data.forEach((item2, index2) => {
                                data.csvData.push(item2);
                                if (data.csvData.length == 1) {
                                    // 设置 (日期+颜色) 为新文件名
                                    data.newFileName = nowDate() + data.csvData[0]['颜色'] + ".csv"
                                }
                            })
                        }
                    });
                };
                reader.readAsText(files[index], "GBK");
            }
        })
        console.log(data.csvData);
    }
}

const handleCSV = () => {
    data.csvData.forEach((item, index) => {
        // 客户名称添加到地址
        data.csvData[index]['终端地址'] = data.csvData[index]['客户名称'] + "-" + data.csvData[index]['终端地址']
        // 客户名称值修改为产品名称
        data.csvData[index]['客户名称'] = data.csvData[index]['产品名称']
        // 判断修改条件
        if (data.csvData[index]['高度'] < data.value || data.csvData[index]['宽度'] < data.value) {
            data.csvData[index]['造型名称'] = "平板PETA"
        }
        if (data.csvData[index]['高度'] < data.valueH && data.csvData[index]['宽度'] < data.valueW) {
            data.csvData[index]['造型名称'] = "平板PETA"
        }
        if (data.csvData[index]['高度'] < data.valueW && data.csvData[index]['宽度'] < data.valueH) {
            data.csvData[index]['造型名称'] = "平板PETA"
        }
        if (data.valueS) {
            if (data.csvData[index]['高度'] < 50) {
                data.csvData[index]['备注'] = `${data.csvData[index]['备注']}[切到${data.csvData[index]['高度']}高]`
                data.csvData[index]['高度'] = 100
            }
            if (data.csvData[index]['宽度'] < 50) {
                data.csvData[index]['备注'] = `${data.csvData[index]['备注']}[切到${data.csvData[index]['宽度']}宽]`
                data.csvData[index]['宽度'] = 100
            }
        }
    })
}

// 获取本地参数
let stringData = localStorage.getItem('page-tools-data')
if (stringData) {
    let obj = JSON.parse(stringData)
    data.value = obj.value
    data.valueH = obj.valueH
    data.valueW = obj.valueW
    data.valueS = obj.valueS
}


// 生成新CSV文件
const generateNewCSV = () => {
    if (data.csvData.length == 0) {
        app.msg.warning('选择文件数据为空!')
        return
    }
    handleCSV()
    // 将原始数据逆序，并保存到newData中
    data.newData = data.csvData.slice().reverse();
    console.log(data.csvData);
    const csv = Papa.unparse(
        data.csvData
    );

    // 创建Blob对象
    const blob = new Blob([csv], { type: 'text/csv' });

    // 创建下载链接
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = data.newFileName;

    // 模拟点击下载
    link.click();

    // 保存参数
    localStorage.setItem('page-tools-data', JSON.stringify(data));
    app.msg.success(`成功输出文件:${data.newFileName}`)
};


</script>
  
<template>
    <div>
        <n-button color="#3C5B6F" type="success" @click="showModal = true">
            处理排版CSV
        </n-button>
        <n-modal v-model:show="showModal">
            <n-card style="width: 600px" title="处理排版文件ExcelCSV" :bordered="false" size="huge" role="dialog"
                aria-modal="true">
                <template #header-extra>
                    <n-button color="#3C5B6F" type="success" @click="selectFileCSV">
                        选择ExcelCSV文件
                    </n-button>
                    <n-button type="success" @click="generateNewCSV" style="margin-left: 10px;">
                        输出文件
                    </n-button>
                    <n-button color="#FF6500" type="error" @click="showModal = false" style="margin-left: 10px;">
                        关闭
                    </n-button>
                </template>

                <div>
                    <n-form>
                        <n-form-item label="需要处理的CSV文件：" path="input">
                            <input ref="fileInput" type="file" @change="handleFileChange($event)" multiple
                                style="display: none;">
                            <n-data-table :columns="data.columns" :data="data.fileList" :bordered="true" />
                        </n-form-item>
                        <n-form-item label="高或宽低于该值时修改为[平板PETA]：" path="input">
                            <n-input-group style="margin-left: 0px;">
                                <n-input-number v-model:value="data.value" clearable />
                            </n-input-group>
                        </n-form-item>
                        <n-form-item label="高和宽都低于以下值时修改为[平板PETA]：" path="input">
                            <n-input-group style="margin-left: 0px;">
                                <n-button>高/宽</n-button>
                                <n-input-number v-model:value="data.valueH" clearable />
                            </n-input-group>
                            <n-input-group style="margin-left: 10px;">
                                <n-button>高/宽</n-button>
                                <n-input-number v-model:value="data.valueW" clearable />
                            </n-input-group>
                        </n-form-item>
                        <n-space>
                            <n-switch v-model:value="data.valueS" /> 高或宽低于50时修改为100,[备注]添加[切到'原值']
                        </n-space>

                        <n-form-item label="输出文件名：" path="input" style="margin-top: 20px;">
                            <n-input-group style="margin-left: 0px;">
                                <n-input v-model:value="data.newFileName" placeholder="新文件名" />
                            </n-input-group>
                        </n-form-item>
                    </n-form>
                </div>

                <template #footer>

                </template>
            </n-card>
        </n-modal>
    </div>
</template>