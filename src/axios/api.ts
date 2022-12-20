import { ApiType } from "/@/type/AppType"

const api: ApiType = {
    Url: process.env.NODE_ENV === "development" ? '/api' : 'https://cczzyy.cn/api',
    LiveUrl: process.env.NODE_ENV === "development" ? 'http://localhost:1936' : 'https://cczzyy.cn/live',
    LiveWs: process.env.NODE_ENV === "development" ? 'ws://localhost:9502/LiveWs' : 'wss://cczzyy.cn/WsLive',
    OpenAI: process.env.NODE_ENV === "development" ? '/OpenAI' : 'https://cczzyy.cn/OpenAI',
    completionsAi: "/completions",
    imageAi: "/images",
    authRoot: "/blog/authRoot",
    addArticle: "/blog/addArticle",
    editArticle: "/blog/editArticle",
    addTag: "/blog/addTag",
    postTag: "/blog/postTag",
    postArticle: "/blog/postArticle",
    deleteArticle: "/blog/deleteArticle",
    uploadImage: "/blog/uploadImage",
}

export { api } 