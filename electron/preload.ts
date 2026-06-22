/**
 * @file 启动 preload 桥接并暴露桌面 API。
 */

import { exposeDesktopApi } from './ipcBus/preload/expose-api'

exposeDesktopApi()

export { exposeDesktopApi }
