
import axios, { AxiosRequestConfig } from "axios";
import { api } from "/@/axios/api";

type handleConfig = (config: AxiosRequestConfig<any>) => AxiosRequestConfig<any>
type handleRes = (res: any) => { code: number, msg: string }
type handleError = (error: { message: string }) => void

const CreatePost = (URL: string, handleConfig: handleConfig, handleRes: handleRes, handleError: handleError, timeout = 30000) => {
    // 创建 axios 实例
    let Axios = axios.create({
        baseURL: URL,
        timeout: timeout,
    });

    let axiosError = (error: any) => {
        handleError(error)
        let res = {
            code: 400,
            msg: error.message
        }
        return Promise.resolve(res);
    }

    // 请求拦截器
    Axios.interceptors.request.use((config) => {
        config = handleConfig(config)
        return config;
    }, function (error) {
        return axiosError(error);
    });

    // 响应拦截器
    Axios.interceptors.response.use((response) => {
        let res = response.data;
        res = handleRes(res)
        return res;
    }, async function (error) {
        return axiosError(error);
    });

    let post = (url: string, data: object) => {
        return Axios.post(url, data)
    }

    return post
}

export { api, CreatePost }