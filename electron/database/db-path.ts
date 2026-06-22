/**
 * @file 数据库路径解析与目录结构管理。
 *
 * 数据库放在 app.getPath('userData')/app-data/db/app.sqlite。
 * 建立目录：db / backups / exports / imports / file-db / logs。
 * 支持测试环境临时数据库。预留 workspaceId。防止路径穿越。
 * renderer 不能传任意数据库路径。
 */

import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { DB_DIR_NAMES, SQLITE_DB_FILENAME } from '../ipcBus/shared/database'
import { throwDbError } from '../ipcBus/shared/database'

/**
 * 路径解析选项。
 */
export interface DbPathOptions {
  /** Electron app.getPath('userData') 返回的用户数据目录。 */
  userDataDir: string
  /** 工作区标识，预留多工作区。默认 'default'。 */
  workspaceId?: string
  /** 是否使用测试临时目录。 */
  testMode?: boolean
  /** 测试模式下自定义临时根目录。 */
  testTempDir?: string
}

/**
 * 数据库路径解析结果。
 */
export interface DbPaths {
  /** app-data 根目录。 */
  rootDir: string
  /** 数据库文件目录。 */
  dbDir: string
  /** 主数据库文件绝对路径。 */
  dbFile: string
  /** 备份目录。 */
  backupsDir: string
  /** 导出目录。 */
  exportsDir: string
  /** 导入目录。 */
  importsDir: string
  /** .xuanbing 文件数据库工作目录。 */
  fileDbDir: string
  /** 日志目录。 */
  logsDir: string
  /** 工作区标识。 */
  workspaceId: string
  /** 是否测试模式。 */
  testMode: boolean
}

/**
 * 验证工作区标识，只允许字母、数字、下划线、短横线。
 *
 * @param workspaceId 工作区标识。
 */
function validateWorkspaceId(workspaceId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(workspaceId)) {
    throwDbError('DB_VALIDATION_ERROR', `Invalid workspace id: ${workspaceId}`, {
      safeDetail: { reason: 'invalid_workspace_id' },
      severity: 'high'
    })
  }
}

/**
 * 确保目录存在。
 *
 * @param dirPath 目录路径。
 */
function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true })
}

/**
 * 解析数据库全部路径并创建目录结构。
 *
 * @param options 路径解析选项。
 * @returns 数据库路径集合。
 */
export function resolveDbPaths(options: DbPathOptions): DbPaths {
  const workspaceId = options.workspaceId ?? 'default'
  validateWorkspaceId(workspaceId)

  let baseDir: string

  if (options.testMode) {
    const tempRoot = options.testTempDir ?? path.join(os.tmpdir(), `xuanbing-test-${randomUUID()}`)
    baseDir = tempRoot
  } else {
    baseDir = options.userDataDir
  }

  const rootDir = path.join(baseDir, DB_DIR_NAMES.root, workspaceId)
  const dbDir = path.join(rootDir, DB_DIR_NAMES.db)
  const backupsDir = path.join(rootDir, DB_DIR_NAMES.backups)
  const exportsDir = path.join(rootDir, DB_DIR_NAMES.exports)
  const importsDir = path.join(rootDir, DB_DIR_NAMES.imports)
  const fileDbDir = path.join(rootDir, DB_DIR_NAMES.fileDb)
  const logsDir = path.join(rootDir, DB_DIR_NAMES.logs)
  const dbFile = path.join(dbDir, SQLITE_DB_FILENAME)

  for (const dir of [dbDir, backupsDir, exportsDir, importsDir, fileDbDir, logsDir]) {
    ensureDir(dir)
  }

  return {
    rootDir,
    dbDir,
    dbFile,
    backupsDir,
    exportsDir,
    importsDir,
    fileDbDir,
    logsDir,
    workspaceId,
    testMode: options.testMode ?? false
  }
}

/**
 * 生成带时间戳的备份文件名。
 *
 * @param prefix 前缀。
 * @returns 备份文件名。
 */
export function createBackupFileName(prefix = 'app'): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  return `${prefix}-${ts}.sqlite`
}

/**
 * 生成带时间戳的导出文件名。
 *
 * @param name 文件名主体。
 * @param ext 扩展名（含点）。
 * @returns 导出文件名。
 */
export function createExportFileName(name: string, ext: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'export'
  return `${safeName}-${ts}${ext}`
}
