/**
 * @file 声明 `window.desktop` 全局类型。
 */

import type { DesktopApi } from './desktop-api'

declare global {
  interface Window {
    desktop: DesktopApi
  }
}

export {}
