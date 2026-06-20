/**
 * @file Ϊ��ǰ�ֿ��ṩ��С���õ� Node ����ʱ�������������� IPC �����ڼ䱻ȫ�� Node ��������������
 */

declare module 'node:fs' {
  interface NodeFsModule {
    existsSync(path: string): boolean
    readFileSync(path: string, encoding: string): string
    writeFileSync(path: string, data: string): void
  }

  const fs: NodeFsModule
  export default fs
}

declare module 'node:path' {
  interface NodePathModule {
    join(...parts: string[]): string
  }

  const path: NodePathModule
  export default path
}

declare module 'node:crypto' {
  export function randomUUID(): string
}


declare module 'fs' {
  /** 判断路径是否存在。 */
  export function existsSync(path: string): boolean
  /** 创建目录。 */
  export function mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined
  /** 按文本编码读取文件。 */
  export function readFileSync(path: string, encoding: string): string
  /** 按文本编码写入文件。 */
  export function writeFileSync(path: string, data: string, encoding?: string): void
}

declare module 'path' {
  /** 获取路径所在目录。 */
  export function dirname(path: string): string
  /** 拼接多个路径片段。 */
  export function join(...parts: string[]): string
}

declare module 'crypto' {
  /** 生成随机 UUID 字符串。 */
  export function randomUUID(): string
}

/** Node Buffer 全局对象的最小声明。 */
declare const Buffer: {
  /** 计算字符串字节长度。 */
  byteLength(value: string, encoding?: string): number
}
declare const __dirname: string

declare const process: {
  env: Record<string, string | undefined>
  platform: string
  versions?: Record<string, string | undefined>
  on(event: string, listener: (...args: unknown[]) => void): void
}

declare function require(moduleId: string): unknown

