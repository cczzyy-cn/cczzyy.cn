
import type { DrawerPlacement, MessageProviderInst } from 'naive-ui';

export interface ApiType {
    [key: string]: string
}

// 允许修改值
export type AppKeyType = 'api' | 'post' | 'msg'

export interface StateImgType {
    [key: string]: any
    active: boolean
    placement: DrawerPlacement
    imgSrc: string
    imgWidth: number
    activate: (place?: DrawerPlacement) => void
    handleImg: (query?: string) => void
    changeImgWidth: (value: number) => void
    wheel: (e: WheelEvent) => void
}

export interface AppType {
    [key: string]: any
    state: {
        [key: string]: any
        scroll: boolean,
        bottomShow: boolean,
        img: StateImgType
    }
    api: ApiType
    post: PostFT
    postAi: PostFT
    msg: MessageProviderInst
    updateState: (key: string, value: any) => void
    updateApp: (key: AppKeyType, value: any) => void
}

export type PostFT = (url: string, data: object) => Promise<any>