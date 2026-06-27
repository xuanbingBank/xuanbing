/**
 * @file 为当前工作区提供的最小化 Node 运行时类型声明，避免 IPC 实现期间被全局 Node 类型污染。
 */

// TODO: 评估用 @types/node 替代 shim
declare module 'node:fs' {
  interface NodeFsModule {
    existsSync(path: string): boolean
    readFileSync(path: string, encoding: string): string
    readFileSync(path: string): Buffer
    writeFileSync(path: string, data: string): void
    mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined
    statSync(path: string): { size: number; mtimeMs: number; mtime: Date; isFile(): boolean; isDirectory(): boolean; isSymbolicLink(): boolean }
    lstatSync(path: string): { size: number; mtimeMs: number; mtime: Date; isFile(): boolean; isDirectory(): boolean; isSymbolicLink(): boolean }
    readdirSync(path: string): string[]
    unlinkSync(path: string): void
    copyFileSync(src: string, dest: string): void
    renameSync(oldPath: string, newPath: string): void
    openSync(path: string, flags: string): number
    fsyncSync(fd: number): void
    closeSync(fd: number): void
    writeFileSync(path: string, data: string, encoding?: string): void
  }

  const fs: NodeFsModule
  export default fs
}

declare module 'node:path' {
  interface NodePathModule {
    join(...parts: string[]): string
    dirname(path: string): string
    basename(path: string, ext?: string): string
    resolve(...parts: string[]): string
    extname(path: string): string
    sep: string
  }

  const path: NodePathModule
  export default path
}

declare module 'node:crypto' {
  export function randomUUID(): string
  export function createHash(algorithm: string): {
    update(data: string | Buffer): { digest(encoding: string): string }
  }
}


declare module 'fs' {
  /** 判断路径是否存在。 */
  export function existsSync(path: string): boolean
  /** 创建目录。 */
  export function mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined
  /** 按文本编码读取文件。 */
  export function readFileSync(path: string, encoding: string): string
  /** 读取文件为 Buffer。 */
  export function readFileSync(path: string): Buffer
  /** 按文本编码写入文件。 */
  export function writeFileSync(path: string, data: string, encoding?: string): void
  /** 获取文件状态。 */
  export function statSync(path: string): { size: number; mtimeMs: number; mtime: Date; isFile(): boolean; isDirectory(): boolean; isSymbolicLink(): boolean }
  /** 获取文件状态（不跟随符号链接）。 */
  export function lstatSync(path: string): { size: number; mtimeMs: number; mtime: Date; isFile(): boolean; isDirectory(): boolean; isSymbolicLink(): boolean }
  /** 读取目录内容。 */
  export function readdirSync(path: string): string[]
  /** 删除文件。 */
  export function unlinkSync(path: string): void
  /** 复制文件。 */
  export function copyFileSync(src: string, dest: string): void
  /** 重命名文件。 */
  export function renameSync(oldPath: string, newPath: string): void
  /** 打开文件，返回文件描述符。 */
  export function openSync(path: string, flags: string): number
  /** 刷新文件到磁盘。 */
  export function fsyncSync(fd: number): void
  /** 关闭文件描述符。 */
  export function closeSync(fd: number): void
}

declare module 'path' {
  /** 获取路径所在目录。 */
  export function dirname(path: string): string
  /** 拼接多个路径片段。 */
  export function join(...parts: string[]): string
  /** 获取路径基础名。 */
  export function basename(path: string, ext?: string): string
  /** 解析为绝对路径。 */
  export function resolve(...parts: string[]): string
  /** 获取扩展名。 */
  export function extname(path: string): string
  /** 平台路径分隔符。 */
  export const sep: string
}

declare module 'crypto' {
  /** 生成随机 UUID 字符串。 */
  export function randomUUID(): string
  /** 创建哈希实例。 */
  export function createHash(algorithm: string): {
    update(data: string | Buffer): { digest(encoding: string): string }
  }
}

/** Node Buffer 全局对象的最小声明。 */
declare interface Buffer {
  /** 字节长度。 */
  readonly length: number
  /** 转字符串。 */
  toString(encoding?: string): string
  /** 转 JSON。 */
  toJSON(): { type: 'Buffer'; data: number[] }
  /** 切片。 */
  slice(start?: number, end?: number): Buffer
}
declare const Buffer: {
  /** 计算字符串字节长度。 */
  byteLength(value: string, encoding?: string): number
  /** 从字符串创建 Buffer。 */
  from(value: string, encoding?: string): Buffer
  /** 拼接多个 Buffer。 */
  concat(list: Buffer[], totalLength?: number): Buffer
}
declare const __dirname: string

declare const process: {
  env: Record<string, string | undefined>
  platform: string
  versions?: Record<string, string | undefined>
  on(event: string, listener: (...args: unknown[]) => void): void
}

declare function require(moduleId: string): unknown
