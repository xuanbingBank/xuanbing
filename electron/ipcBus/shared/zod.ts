/**
 * @file ??? IPC ?????????? zod ?????????????
 */

/**
 * ???????????????????
 */
export type ZodLiteralValue = string | number | boolean | null

/**
 * ?????????????
 */
export interface ZodIssue {
  path: string
  message: string
}

/**
 * ??????????????
 */
export interface ZodSafeParseSuccess<TValue> {
  success: true
  data: TValue
}

/**
 * ??????????????
 */
export interface ZodSafeParseFailure {
  success: false
  error: ZodValidationError
}

/**
 * ??????????????
 */
export type ZodSafeParseResult<TValue> = ZodSafeParseSuccess<TValue> | ZodSafeParseFailure

/**
 * ?????????????? API ???
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
 * ?????????????????
 */
export type InferZodSchema<TSchema extends ZodSchema<unknown>> =
  TSchema extends ZodSchema<infer TValue> ? TValue : never

/**
 * ????????????????????
 */
export type ZodShape = Record<string, ZodSchema<unknown>>

/**
 * ?????????????????
 */
export type InferZodShape<TShape extends ZodShape> = {
  [TKey in keyof TShape]: InferZodSchema<TShape[TKey]>
}

/**
 * ?????????????
 */
export interface ZodStringOptions {
  minLength?: number
  maxLength?: number
  trim?: boolean
}

/**
 * ????????????
 */
export interface ZodNumberOptions {
  min?: number
  max?: number
  integer?: boolean
}

/**
 * ????????????
 */
export interface ZodArrayOptions {
  minLength?: number
  maxLength?: number
}

/**
 * ?????????????????????
 */
type SchemaParser<TValue> = (input: unknown, path: readonly (string | number)[]) => TValue

/**
 * ??????????????????????
 *
 * @param path ???????????
 * @returns ???????????????
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
 * ???????????????
 *
 * @param path ?????????
 * @param message ???????
 * @returns ?????????
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
 * ????????????????
 *
 * @param value ??????????
 * @returns ??????????? `true`?
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * ??????????? zod ???????
 */
export class ZodValidationError extends Error {
  issues: ZodIssue[]

  /**
   * ???????????
   *
   * @param issues ??????????????
   */
  constructor(issues: ZodIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join('; '))
    this.name = 'ZodValidationError'
    this.issues = issues
  }
}

/**
 * ???? IPC ???????????? API?
 */
export class SimpleZodSchema<TValue> implements ZodSchema<TValue> {
  private readonly parser: SchemaParser<TValue>

  /**
   * ??????????????
   *
   * @param parser ???????????????
   */
  constructor(parser: SchemaParser<TValue>) {
    this.parser = parser
  }

  /**
   * ??????????
   *
   * @param input ???????
   * @returns ??????
   */
  parse(input: unknown): TValue {
    return this.parseAtPath(input, [])
  }

  /**
   * ??????????????
   *
   * @param input ???????
   * @param path ???????????
   * @returns ??????
   */
  parseAtPath(input: unknown, path: readonly (string | number)[]): TValue {
    return this.parser(input, path)
  }

  /**
   * ??????????????????????
   *
   * @param input ???????
   * @returns ???????????
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
   * ????????? `undefined`?
   *
   * @returns ?? `undefined` ?????????
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
   * ????????? `null`?
   *
   * @returns ?? `null` ?????????
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
   * ????????????????
   *
   * @returns ???????????????
   */
  array(): ZodSchema<TValue[]> {
    return array(this)
  }

  /**
   * ???? `undefined` ???????
   *
   * @param defaultValue ??????
   * @returns ?????????????
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
 * ????????????????
 *
 * @param options ???????????
 * @returns ????????
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
 * ???????????????
 *
 * @param options ??????????
 * @returns ???????
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
 * ??????????
 *
 * @returns ????????
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
 * ???????????????
 *
 * @returns ???????????????
 */
function unknown(): ZodSchema<unknown> {
  return new SimpleZodSchema<unknown>((input) => input)
}

/**
 * ???????????????????
 *
 * @param expectedValue ?????????
 * @returns ????????
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
 * ??????????????????
 *
 * @param values ??????????
 * @returns ??????????
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
 * ????????????????
 *
 * @param itemSchema ??????????????
 * @param options ??????????
 * @returns ???????
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
 * ?????????????????
 *
 * @param shape ??????????????
 * @returns ???????
 */
function object<TShape extends ZodShape>(shape: TShape): ZodSchema<InferZodShape<TShape>> {
  return new SimpleZodSchema<InferZodShape<TShape>>((input, path) => {
    if (!isRecord(input)) {
      throw createValidationError(path, 'Expected an object.')
    }

    const source = input as Record<string, unknown>
    const result = {} as InferZodShape<TShape>

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
 * ?????????????????????
 *
 * @param schemas ???????????????
 * @returns ???????
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
 * ???? IPC ???????? zod ?????????
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
  union
} as const

