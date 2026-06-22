/**
 * @file Fluent 风格图标映射。
 *
 * 将菜单/按钮中的 icon key（如 "home"、"task"、"settings"）统一映射为 SVG path。
 * 使用 24x24 viewBox 的线性图标，stroke 风格接近 Fluent UI System Icons。
 *
 * 图标 key 不存在时回退为默认圆点。
 */

/**
 * 图标 key → SVG path 映射（24x24 viewBox，stroke 风格）。
 *
 * 每个 path 都设计为在 `fill="none" stroke="currentColor"` 下渲染。
 */
export const ICON_PATHS: Record<string, string> = {
  home: 'M3 12L12 3l9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10',
  dashboard:
    'M4 5a1 1 0 011-1h5v8H4V5zM14 4h5a1 1 0 011 1v4h-6V4zM14 13h6v6a1 1 0 01-1 1h-5v-7zM4 16h6v4H5a1 1 0 01-1-1v-3z',
  task: 'M9 5h11a1 1 0 011 1v13a1 1 0 01-1 1H4a1 1 0 01-1-1V8M9 5V3a1 1 0 011-1h0a1 1 0 011 1v2M9 5h2M3 8l3 3 3-3',
  settings:
    'M12 8a4 4 0 100 8 4 4 0 000-8zM19.4 13a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z',
  profile: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0',
  security: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  info: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 8h.01M11 12h1v5h1',
  log: 'M4 4h16v16H4V4zM8 8h8M8 12h8M8 16h5',
  beaker: 'M9 3h6M10 3v6L5 19a1 1 0 001 1h12a1 1 0 001-1l-5-10V3M8 14h8',
  sparkle:
    'M12 3l1.5 5L19 9.5 13.5 11 12 16l-1.5-5L5 9.5 10.5 8 12 3z',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  menu: 'M4 6h16M4 12h16M4 18h16',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M6 15l6-6 6 6',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5L20 7',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  refresh: 'M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5',
  filter: 'M3 5h18l-7 8v6l-4-2v-4L3 5z',
  more: 'M12 12h.01M5 12h.01M19 12h.01',
  edit: 'M11 4H4a1 1 0 00-1 1v14a1 1 0 001 1h14a1 1 0 001-1v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  delete: 'M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a1 1 0 01-1 1H7a1 1 0 01-1-1L5 6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 100-6 3 3 0 000 6z',
  download: 'M21 15v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4M7 10l5 5 5-5M12 15V3',
  upload: 'M21 15v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4M17 8l-5-5-5 5M12 3v12',
  sun: 'M12 7a5 5 0 100 10 5 5 0 000-10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
  window: 'M4 4h16v16H4V4zM4 8h16',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0',
  logout: 'M9 21H5a1 1 0 01-1-1V4a1 1 0 011-1h4M16 17l5-5-5-5M21 12H9',
  warning: 'M12 3l9 16H3l9-16zM12 9v5M12 17h.01',
  error: 'M12 22a10 10 0 100-20 10 10 0 000 20zM15 9l-6 6M9 9l6 6',
  success: 'M12 22a10 10 0 100-20 10 10 0 000 20zM7 12l3 3 7-7',
  star: 'M12 3l2.5 6.5L21 10l-5 4.5L17.5 21 12 17.5 6.5 21 8 14.5 3 10l6.5-.5L12 3z',
  folder: 'M3 5a1 1 0 011-1h5l2 2h8a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V5z',
  link: 'M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1',
  copy: 'M9 9h11a1 1 0 011 1v11a1 1 0 01-1 1H9a1 1 0 01-1-1V10a1 1 0 011-1zM5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1',
  arrowLeft: 'M19 12H5M12 19l-7-7 7-7',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
  sort: 'M7 4v16M7 4L3 8M7 4l4 4M17 20V4M17 20l4-4M17 20l-4-4',
  columns: 'M4 4h7v16H4V4zM13 4h7v16h-7V4z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  grid: 'M4 4h7v7H4V4zM13 4h7v7h-7V4zM4 13h7v7H4v-7zM13 13h7v7h-7v-7z',
  palette: 'M12 22a10 10 0 110-20 8 8 0 018 8c0 2-2 3-4 3h-2a2 2 0 00-2 2c0 1 1 2 1 3s-1 2-1 2zM7 11h.01M12 7h.01M16 11h.01'
}

/**
 * 默认图标（key 未命中时使用）。
 */
const DEFAULT_ICON = 'M12 12a3 3 0 100-6 3 3 0 000 6z'

/**
 * 获取图标 path。
 *
 * @param key 图标 key。
 * @returns SVG path 字符串。
 */
export function getIconPath(key?: string): string {
  if (!key) return DEFAULT_ICON
  return ICON_PATHS[key] ?? DEFAULT_ICON
}

/**
 * 判断图标 key 是否存在。
 */
export function hasIcon(key: string): boolean {
  return key in ICON_PATHS
}
