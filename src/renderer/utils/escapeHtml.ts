/**
 * @file HTML 转义工具，防止 v-html / XSS 注入。
 */

/**
 * 转义 HTML 特殊字符，防止 XSS。
 *
 * 转义字符：& < > " '
 *
 * @param s 原始字符串。
 * @returns 转义后的字符串（可安全用于 HTML 文本节点或 v-html）。
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
