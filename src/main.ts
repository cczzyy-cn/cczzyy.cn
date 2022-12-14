import { createApp } from 'vue'
import App from '/@/App.vue'
import router from '/@/router/index'
// highlight 的样式，依赖包，组件
import 'highlight.js/styles/base16/railscasts.css'
import 'highlight.js/lib/common'
import hljsVuePlugin from '@highlightjs/vue-plugin'

const app = createApp(App)
app.use(router)
//注册组件
app.use(hljsVuePlugin)
app.mount('#app')
