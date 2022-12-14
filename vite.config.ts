import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 请求代理
    proxy: {
      '/api': {
        // 项目内请求 /api => https://www.cczzyy.cn
        target: "https://cczzyy.cn",
        changeOrigin: true, // 允许跨越
        // 替换 '/api' 为 '' 
        //rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/OpenAI': {
        // 项目内请求 /api => https://www.cczzyy.cn
        target: "https://cczzyy.cn",
        changeOrigin: true, // 允许跨越
        // 替换 '/api' 为 '' 
        //rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/live': {
        target: "https://cczzyy.cn",
        changeOrigin: true, // 允许跨越
      },
    }
  },
  // 路径别名 配合 tsconfig.json
  resolve: {
    alias: {
      '/@': path.resolve("./src")
    }
  },
})
