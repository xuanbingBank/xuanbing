/**
 * @file SQLite PRAGMA 初始化。
 *
 * 初始化执行：
 *   PRAGMA journal_mode = WAL;
 *   PRAGMA synchronous = NORMAL;
 *   PRAGMA foreign_keys = ON;
 *   PRAGMA busy_timeout = 5000;
 * 可选：
 *   PRAGMA temp_store = MEMORY;
 *   PRAGMA cache_size = -20000;
 */

import type Database from 'better-sqlite3'

/**
 * 期望的 PRAGMA 值，用于 health check 校验。
 */
export const EXPECTED_PRAGMAS = {
  journalMode: 'wal',
  synchronous: 'normal',
  foreignKeys: 1,
  busyTimeout: 5000
} as const

/**
 * 应用全部 PRAGMA 设置。
 *
 * @param db better-sqlite3 数据库实例。
 */
export function applyPragmas(db: Database.Database): void {
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  db.pragma('temp_store = MEMORY')
  db.pragma('cache_size = -20000')
}

/**
 * 读取当前 PRAGMA 值，用于 health check。
 *
 * @param db better-sqlite3 数据库实例。
 * @returns 当前 PRAGMA 值快照。
 */
export function readPragmas(db: Database.Database): {
  journalMode: string
  synchronous: string
  foreignKeys: number
  busyTimeout: number
  tempStore: number
  cacheSize: number
} {
  return {
    journalMode: String(db.pragma('journal_mode', { simple: true })),
    synchronous: String(db.pragma('synchronous', { simple: true })),
    foreignKeys: Number(db.pragma('foreign_keys', { simple: true })),
    busyTimeout: Number(db.pragma('busy_timeout', { simple: true })),
    tempStore: Number(db.pragma('temp_store', { simple: true })),
    cacheSize: Number(db.pragma('cache_size', { simple: true }))
  }
}

/**
 * 把 SQLite 返回的 synchronous 值统一映射为小写字符串。
 *
 * SQLite 的 PRAGMA synchronous 读取时返回整数（0=OFF、1=NORMAL、2=FULL、3=EXTRA），
 * 而非字符串。直接 String(...) 后与 'normal' 比较恒不等，导致健康检查误报。
 *
 * @param val 从 PRAGMA synchronous 读取的值（数字 / 数字字符串 / 字符串）。
 * @returns 规范化的小写字符串（'off' | 'normal' | 'full' | 'extra' 或原始小写字符串）。
 */
export function mapSynchronousValue(val: unknown): string {
  if (typeof val === 'number') {
    switch (val) {
      case 0: return 'off'
      case 1: return 'normal'
      case 2: return 'full'
      case 3: return 'extra'
      default: return String(val).toLowerCase()
    }
  }
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed)
      switch (num) {
        case 0: return 'off'
        case 1: return 'normal'
        case 2: return 'full'
        case 3: return 'extra'
        default: return trimmed.toLowerCase()
      }
    }
    return trimmed.toLowerCase()
  }
  return String(val ?? '').toLowerCase()
}

/**
 * 校验关键 PRAGMA 是否符合预期。
 *
 * @param db better-sqlite3 数据库实例。
 * @returns 不符合预期的 PRAGMA 列表。
 */
export function validatePragmas(db: Database.Database): string[] {
  const current = readPragmas(db)
  const mismatches: string[] = []

  if (current.journalMode.toLowerCase() !== EXPECTED_PRAGMAS.journalMode) {
    mismatches.push(`journal_mode: expected ${EXPECTED_PRAGMAS.journalMode}, got ${current.journalMode}`)
  }
  if (mapSynchronousValue(current.synchronous) !== EXPECTED_PRAGMAS.synchronous) {
    mismatches.push(`synchronous: expected ${EXPECTED_PRAGMAS.synchronous}, got ${mapSynchronousValue(current.synchronous)}`)
  }
  if (current.foreignKeys !== EXPECTED_PRAGMAS.foreignKeys) {
    mismatches.push(`foreign_keys: expected ${EXPECTED_PRAGMAS.foreignKeys}, got ${current.foreignKeys}`)
  }
  if (current.busyTimeout < EXPECTED_PRAGMAS.busyTimeout) {
    mismatches.push(`busy_timeout: expected >= ${EXPECTED_PRAGMAS.busyTimeout}, got ${current.busyTimeout}`)
  }

  return mismatches
}
