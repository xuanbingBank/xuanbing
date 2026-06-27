/**
 * @file 共享 IPC 校验层使用的轻量 zod 实现，提供运行时类型校验能力。
 */

/**
 * zod 字面量支持的取值类型。
 */
export type ZodLiteralValue = string | number | boolean | null

/**
 * 单条校验错误信息。
 */
export interface ZodIssue {
  path: string
  message: string
}

/**
 * safeParse 成功时的返回结构。
 */
export interface ZodSafeParseSuccess<TValue> {
  success: true
  data: TValue
}

/**
 * safeParse 失败时的返回结构。
 */
export interface ZodSafeParseFailure {
  success: false
  error: ZodValidationError
}

/**
 * safeParse 的返回结果（成功或失败）。
 */
export type ZodSafeParseResult<TValue> = ZodSafeParseSuccess<TValue> | ZodSafeParseFailure

/**
 * zod 模式对象对外暴露的校验 API 集合。
 */
export interface ZodSchema<TValue> {
  parse(input: unknown): TValue
  safeParse(input: unknown): ZodSafeParseResult<TValue>
  optional(): ZodSchema<TValue | undefined>
  nullable(): ZodSchema<TValue | null>
  array(): ZodSchema<TValue[]>
  default(defaultValue: TValue): ZodSchema<TValue>
  parseAtPath(input: unknown, path: readonly (string | number)[]): TValue
}

/**
 * 从 ZodSchema 实例推断其校验输出的值类型。
 */
export type InferZodSchema<TSchema extends ZodSchema<unknown>> =
  TSchema extends ZodSchema<infer TValue> ? TValue : never

/**
 * 对象 shape：字段名到字段 schema 的映射。
 */
export type ZodShape = Record<string, ZodSchema<unknown>>

/**
 * 从 ZodShape 推断其对应的输出对象类型。
 */
export type InferZodShape<TShape extends ZodShape> = {
  [TKey in keyof TShape]: InferZodSchema<TShape[TKey]>
}

/**
 * 字符串校验器可配置的选项。
 */
export interface ZodStringOptions {
  minLength?: number
  maxLength?: number
  trim?: boolean
}

/**
 * 数字校验器可配置的选项。
 */
export interface ZodNumberOptions {
  min?: number
  max?: number
  integer?: boolean
}

/**
 * 数组校验器可配置的选项。
 */
export interface ZodArrayOptions {
  minLength?: number
  maxLength?: number
}

/**
 * 内部使用的字段解析函数类型。
 */
type SchemaParser<TValue> = (input: unknown, path: readonly (string | number)[]) => TValue

/**
 * 将校验路径格式化为可读字符串。
 *
 * @param path 字段路径片段数组。
 * @returns 可读的字段路径字符串。
 */
function formatPath(path: readonly (string | number)[]): string {
  if (path.length === 0) {
    return 'value'
  }

  return path
    .map((segment, index) => {
      if (typeof segment === 'number') {
        return `[${segment}]`
      }

      return index === 0 ? segment : `.${segment}`
    })
    .join('')
}

/**
 * 构造一个 ZodValidationError 实例。
 *
 * @param path 出错字段路径。
 * @param message 错误描述。
 * @returns 构造好的校验错误对象。
 */
function createValidationError(
  path: readonly (string | number)[],
  message: string
): ZodValidationError {
  return new ZodValidationError([
    {
      path: formatPath(path),
      message
    }
  ])
}

/**
 * 判断给定值是否为普通对象（非数组、非 null）。
 *
 * @param value 待判断的值。
 * @returns 是普通对象时为 `true`。
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * zod 校验失败时抛出的错误类型。
 */
export class ZodValidationError extends Error {
  issues: ZodIssue[]

  /**
   * 构造校验错误实例。
   *
   * @param issues 校验错误条目列表。
   */
  constructor(issues: ZodIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join('; '))
    this.name = 'ZodValidationError'
    this.issues = issues
  }
}

/**
 * 包装解析函数、对外提供 zod 风格 API 的 schema 实现。
 */
export class SimpleZodSchema<TValue> implements ZodSchema<TValue> {
  private readonly parser: SchemaParser<TValue>

  /**
   * 构造 schema 实例。
   *
   * @param parser 实际执行校验与转换的解析函数。
   */
  constructor(parser: SchemaParser<TValue>) {
    this.parser = parser
  }

  /**
   * 解析输入值，校验失败时抛出错误。
   *
   * @param input 待校验输入。
   * @returns 校验通过后的值。
   */
  parse(input: unknown): TValue {
    return this.parseAtPath(input, [])
  }

  /**
   * 在指定路径下解析输入值。
   *
   * @param input 待校验输入。
   * @param path 当前字段路径。
   * @returns 校验通过后的值。
   */
  parseAtPath(input: unknown, path: readonly (string | number)[]): TValue {
    return this.parser(input, path)
  }

  /**
   * 安全解析输入值，不抛出异常而是返回结果对象。
   *
   * @param input 待校验输入。
   * @returns 成功或失败的结果对象。
   */
  safeParse(input: unknown): ZodSafeParseResult<TValue> {
    try {
      return {
        success: true,
        data: this.parse(input)
      }
    } catch (error) {
      if (error instanceof ZodValidationError) {
        return {
          success: false,
          error
        }
      }

      throw error
    }
  }

  /**
   * 返回允许 `undefined` 的新 schema。
   *
   * @returns 接受 `undefined` 的可选 schema。
   */
  optional(): ZodSchema<TValue | undefined> {
    return new SimpleZodSchema<TValue | undefined>((input, path) => {
      if (input === undefined) {
        return undefined
      }

      return this.parseAtPath(input, path)
    })
  }

  /**
   * 返回允许 `null` 的新 schema。
   *
   * @returns 接受 `null` 的可空 schema。
   */
  nullable(): ZodSchema<TValue | null> {
    return new SimpleZodSchema<TValue | null>((input, path) => {
      if (input === null) {
        return null
      }

      return this.parseAtPath(input, path)
    })
  }

  /**
   * 返回校验数组的新 schema。
   *
   * @returns 以当前 schema 为元素类型的数组 schema。
   */
  array(): ZodSchema<TValue[]> {
    return array(this)
  }

  /**
   * 为 `undefined` 输入提供默认值。
   *
   * @param defaultValue 默认值。
   * @returns 带默认值的 schema。
   */
  default(defaultValue: TValue): ZodSchema<TValue> {
    return new SimpleZodSchema<TValue>((input, path) => {
      if (input === undefined) {
        return defaultValue
      }

      return this.parseAtPath(input, path)
    })
  }
}

/**
 * 创建字符串校验 schema。
 *
 * @param options 字符串校验选项。
 * @returns 字符串 schema。
 */
function string(options: ZodStringOptions = {}): ZodSchema<string> {
  return new SimpleZodSchema<string>((input, path) => {
    if (typeof input !== 'string') {
      throw createValidationError(path, 'Expected a string.')
    }

    const value = options.trim ? input.trim() : input

    if (options.minLength !== undefined && value.length < options.minLength) {
      throw createValidationError(path, `Expected at least ${options.minLength} characters.`)
    }

    if (options.maxLength !== undefined && value.length > options.maxLength) {
      throw createValidationError(path, `Expected at most ${options.maxLength} characters.`)
    }

    return value
  })
}

/**
 * 创建数字校验 schema。
 *
 * @param options 数字校验选项。
 * @returns 数字 schema。
 */
function number(options: ZodNumberOptions = {}): ZodSchema<number> {
  return new SimpleZodSchema<number>((input, path) => {
    if (typeof input !== 'number' || Number.isNaN(input) || !Number.isFinite(input)) {
      throw createValidationError(path, 'Expected a finite number.')
    }

    if (options.integer && !Number.isInteger(input)) {
      throw createValidationError(path, 'Expected an integer.')
    }

    if (options.min !== undefined && input < options.min) {
      throw createValidationError(path, `Expected a number greater than or equal to ${options.min}.`)
    }

    if (options.max !== undefined && input > options.max) {
      throw createValidationError(path, `Expected a number less than or equal to ${options.max}.`)
    }

    return input
  })
}

/**
 * 创建布尔值校验 schema。
 *
 * @returns 布尔 schema。
 */
function boolean(): ZodSchema<boolean> {
  return new SimpleZodSchema<boolean>((input, path) => {
    if (typeof input !== 'boolean') {
      throw createValidationError(path, 'Expected a boolean.')
    }

    return input
  })
}

/**
 * 创建接受任意值的 schema。
 *
 * @returns 接受任意值的 unknown schema。
 */
function unknown(): ZodSchema<unknown> {
  return new SimpleZodSchema<unknown>((input) => input)
}

/**
 * 创建只接受指定字面量的 schema。
 *
 * @param expectedValue 期望的字面量值。
 * @returns 字面量 schema。
 */
function literal<TValue extends ZodLiteralValue>(expectedValue: TValue): ZodSchema<TValue> {
  return new SimpleZodSchema<TValue>((input, path) => {
    if (input !== expectedValue) {
      throw createValidationError(path, `Expected the literal value ${String(expectedValue)}.`)
    }

    return expectedValue
  })
}

/**
 * 创建枚举值校验 schema。
 *
 * @param values 允许的枚举值集合。
 * @returns 枚举 schema。
 */
function enumeration<const TValues extends readonly string[]>(
  values: TValues
): ZodSchema<TValues[number]> {
  return new SimpleZodSchema<TValues[number]>((input, path) => {
    if (typeof input !== 'string' || !values.includes(input)) {
      throw createValidationError(path, `Expected one of: ${values.join(', ')}.`)
    }

    return input as TValues[number]
  })
}

/**
 * 创建数组校验 schema。
 *
 * @param itemSchema 元素 schema。
 * @param options 数组校验选项。
 * @returns 数组 schema。
 */
function array<TValue>(
  itemSchema: ZodSchema<TValue>,
  options: ZodArrayOptions = {}
): ZodSchema<TValue[]> {
  return new SimpleZodSchema<TValue[]>((input, path) => {
    if (!Array.isArray(input)) {
      throw createValidationError(path, 'Expected an array.')
    }

    if (options.minLength !== undefined && input.length < options.minLength) {
      throw createValidationError(path, `Expected at least ${options.minLength} items.`)
    }

    if (options.maxLength !== undefined && input.length > options.maxLength) {
      throw createValidationError(path, `Expected at most ${options.maxLength} items.`)
    }

    return input.map((item, index) => itemSchema.parseAtPath(item, [...path, index]))
  })
}

/**
 * 创建对象校验 schema。
 *
 * @param shape 字段名到字段 schema 的映射。
 * @returns 对象 schema。
 */
// TODO: 评估用真实 zod 替代自定义实现
function object<TShape extends ZodShape>(shape: TShape): ZodSchema<InferZodShape<TShape>> {
  return new SimpleZodSchema<InferZodShape<TShape>>((input, path) => {
    if (!isRecord(input)) {
      throw createValidationError(path, 'Expected an object.')
    }

    const source = input as Record<string, unknown>
    const result = {} as InferZodShape<TShape>

    // 检测 shape 之外的未知字段，仅告警不抛错以保持现有契约（默认 strip 模式）
    const shapeKeys = new Set<string>(Object.keys(shape))
    const unknownKeys = Object.keys(source).filter((k) => !shapeKeys.has(k))
    if (unknownKeys.length > 0) {
      console.warn('[zod] object() received unknown fields', unknownKeys)
    }

    for (const key of Object.keys(shape) as Array<keyof TShape>) {
      const fieldSchema = shape[key]
      const fieldValue = source[key as string]
      const parsedValue = fieldSchema.parseAtPath(fieldValue, [...path, key as string])

      ;(result as Record<string, unknown>)[key as string] = parsedValue
    }

    return result
  })
}

/**
 * 严格对象校验：对 shape 之外的未知字段抛出 ZodValidationError，而非 strip。
 *
 * 用于安全敏感的契约，需要显式拒绝多余字段以防止字段注入。
 * 现有 object() 行为保持不变（向后兼容），仅在需要严格语义时使用本变体。
 *
 * @param shape 对象字段定义。
 * @returns 对象校验器。
 */
function objectStrict<TShape extends ZodShape>(shape: TShape): ZodSchema<InferZodShape<TShape>> {
  return new SimpleZodSchema<InferZodShape<TShape>>((input, path) => {
    if (!isRecord(input)) {
      throw createValidationError(path, 'Expected an object.')
    }

    const source = input as Record<string, unknown>
    const result = {} as InferZodShape<TShape>

    const shapeKeys = new Set<string>(Object.keys(shape))
    const unknownKeys = Object.keys(source).filter((k) => !shapeKeys.has(k))
    if (unknownKeys.length > 0) {
      throw createValidationError(path, `Unexpected fields: ${unknownKeys.join(', ')}.`)
    }

    for (const key of Object.keys(shape) as Array<keyof TShape>) {
      const fieldSchema = shape[key]
      const fieldValue = source[key as string]
      const parsedValue = fieldSchema.parseAtPath(fieldValue, [...path, key as string])

      ;(result as Record<string, unknown>)[key as string] = parsedValue
    }

    return result
  })
}

/**
 * 创建联合类型校验 schema。
 *
 * @param schemas 候选 schema 列表。
 * @returns 联合类型 schema。
 */
function union<const TSchemas extends readonly ZodSchema<unknown>[]>(
  schemas: TSchemas
): ZodSchema<InferZodSchema<TSchemas[number]>> {
  return new SimpleZodSchema<InferZodSchema<TSchemas[number]>>((input, path) => {
    const issues: ZodIssue[] = []

    for (const schema of schemas) {
      const result = schema.safeParse(input)

      if (result.success) {
        return result.data as InferZodSchema<TSchemas[number]>
      }

      issues.push(...result.error.issues)
    }

    if (issues.length > 0) {
      throw new ZodValidationError(issues)
    }

    throw createValidationError(path, 'Expected a matching union member.')
  })
}

/**
 * 导出供 IPC 契约使用的 zod schema 工厂集合。
 */
export const z = {
  string,
  number,
  boolean,
  unknown,
  literal,
  enum: enumeration,
  array,
  object,
  objectStrict,
  union
} as const
