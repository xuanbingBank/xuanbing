"use strict";
/**
 * @file ??? IPC ?????????? zod ?????????????
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.z = exports.SimpleZodSchema = exports.ZodValidationError = void 0;
/**
 * ??????????????????????
 *
 * @param path ???????????
 * @returns ???????????????
 */
function formatPath(path) {
    if (path.length === 0) {
        return 'value';
    }
    return path
        .map((segment, index) => {
        if (typeof segment === 'number') {
            return `[${segment}]`;
        }
        return index === 0 ? segment : `.${segment}`;
    })
        .join('');
}
/**
 * ???????????????
 *
 * @param path ?????????
 * @param message ???????
 * @returns ?????????
 */
function createValidationError(path, message) {
    return new ZodValidationError([
        {
            path: formatPath(path),
            message
        }
    ]);
}
/**
 * ????????????????
 *
 * @param value ??????????
 * @returns ??????????? `true`?
 */
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * ??????????? zod ???????
 */
class ZodValidationError extends Error {
    /**
     * ???????????
     *
     * @param issues ??????????????
     */
    constructor(issues) {
        super(issues.map((issue) => `${issue.path}: ${issue.message}`).join('; '));
        this.name = 'ZodValidationError';
        this.issues = issues;
    }
}
exports.ZodValidationError = ZodValidationError;
/**
 * ???? IPC ???????????? API?
 */
class SimpleZodSchema {
    /**
     * ??????????????
     *
     * @param parser ???????????????
     */
    constructor(parser) {
        this.parser = parser;
    }
    /**
     * ??????????
     *
     * @param input ???????
     * @returns ??????
     */
    parse(input) {
        return this.parseAtPath(input, []);
    }
    /**
     * ??????????????
     *
     * @param input ???????
     * @param path ???????????
     * @returns ??????
     */
    parseAtPath(input, path) {
        return this.parser(input, path);
    }
    /**
     * ??????????????????????
     *
     * @param input ???????
     * @returns ???????????
     */
    safeParse(input) {
        try {
            return {
                success: true,
                data: this.parse(input)
            };
        }
        catch (error) {
            if (error instanceof ZodValidationError) {
                return {
                    success: false,
                    error
                };
            }
            throw error;
        }
    }
    /**
     * ????????? `undefined`?
     *
     * @returns ?? `undefined` ?????????
     */
    optional() {
        return new SimpleZodSchema((input, path) => {
            if (input === undefined) {
                return undefined;
            }
            return this.parseAtPath(input, path);
        });
    }
    /**
     * ????????? `null`?
     *
     * @returns ?? `null` ?????????
     */
    nullable() {
        return new SimpleZodSchema((input, path) => {
            if (input === null) {
                return null;
            }
            return this.parseAtPath(input, path);
        });
    }
    /**
     * ????????????????
     *
     * @returns ???????????????
     */
    array() {
        return array(this);
    }
    /**
     * ???? `undefined` ???????
     *
     * @param defaultValue ??????
     * @returns ?????????????
     */
    default(defaultValue) {
        return new SimpleZodSchema((input, path) => {
            if (input === undefined) {
                return defaultValue;
            }
            return this.parseAtPath(input, path);
        });
    }
}
exports.SimpleZodSchema = SimpleZodSchema;
/**
 * ????????????????
 *
 * @param options ???????????
 * @returns ????????
 */
function string(options = {}) {
    return new SimpleZodSchema((input, path) => {
        if (typeof input !== 'string') {
            throw createValidationError(path, 'Expected a string.');
        }
        const value = options.trim ? input.trim() : input;
        if (options.minLength !== undefined && value.length < options.minLength) {
            throw createValidationError(path, `Expected at least ${options.minLength} characters.`);
        }
        if (options.maxLength !== undefined && value.length > options.maxLength) {
            throw createValidationError(path, `Expected at most ${options.maxLength} characters.`);
        }
        return value;
    });
}
/**
 * ???????????????
 *
 * @param options ??????????
 * @returns ???????
 */
function number(options = {}) {
    return new SimpleZodSchema((input, path) => {
        if (typeof input !== 'number' || Number.isNaN(input) || !Number.isFinite(input)) {
            throw createValidationError(path, 'Expected a finite number.');
        }
        if (options.integer && !Number.isInteger(input)) {
            throw createValidationError(path, 'Expected an integer.');
        }
        if (options.min !== undefined && input < options.min) {
            throw createValidationError(path, `Expected a number greater than or equal to ${options.min}.`);
        }
        if (options.max !== undefined && input > options.max) {
            throw createValidationError(path, `Expected a number less than or equal to ${options.max}.`);
        }
        return input;
    });
}
/**
 * ??????????
 *
 * @returns ????????
 */
function boolean() {
    return new SimpleZodSchema((input, path) => {
        if (typeof input !== 'boolean') {
            throw createValidationError(path, 'Expected a boolean.');
        }
        return input;
    });
}
/**
 * ???????????????
 *
 * @returns ???????????????
 */
function unknown() {
    return new SimpleZodSchema((input) => input);
}
/**
 * ???????????????????
 *
 * @param expectedValue ?????????
 * @returns ????????
 */
function literal(expectedValue) {
    return new SimpleZodSchema((input, path) => {
        if (input !== expectedValue) {
            throw createValidationError(path, `Expected the literal value ${String(expectedValue)}.`);
        }
        return expectedValue;
    });
}
/**
 * ??????????????????
 *
 * @param values ??????????
 * @returns ??????????
 */
function enumeration(values) {
    return new SimpleZodSchema((input, path) => {
        if (typeof input !== 'string' || !values.includes(input)) {
            throw createValidationError(path, `Expected one of: ${values.join(', ')}.`);
        }
        return input;
    });
}
/**
 * ????????????????
 *
 * @param itemSchema ??????????????
 * @param options ??????????
 * @returns ???????
 */
function array(itemSchema, options = {}) {
    return new SimpleZodSchema((input, path) => {
        if (!Array.isArray(input)) {
            throw createValidationError(path, 'Expected an array.');
        }
        if (options.minLength !== undefined && input.length < options.minLength) {
            throw createValidationError(path, `Expected at least ${options.minLength} items.`);
        }
        if (options.maxLength !== undefined && input.length > options.maxLength) {
            throw createValidationError(path, `Expected at most ${options.maxLength} items.`);
        }
        return input.map((item, index) => itemSchema.parseAtPath(item, [...path, index]));
    });
}
/**
 * ?????????????????
 *
 * @param shape ??????????????
 * @returns ???????
 */
function object(shape) {
    return new SimpleZodSchema((input, path) => {
        if (!isRecord(input)) {
            throw createValidationError(path, 'Expected an object.');
        }
        const source = input;
        const result = {};
        for (const key of Object.keys(shape)) {
            const fieldSchema = shape[key];
            const fieldValue = source[key];
            const parsedValue = fieldSchema.parseAtPath(fieldValue, [...path, key]);
            result[key] = parsedValue;
        }
        return result;
    });
}
/**
 * ?????????????????????
 *
 * @param schemas ???????????????
 * @returns ???????
 */
function union(schemas) {
    return new SimpleZodSchema((input, path) => {
        const issues = [];
        for (const schema of schemas) {
            const result = schema.safeParse(input);
            if (result.success) {
                return result.data;
            }
            issues.push(...result.error.issues);
        }
        if (issues.length > 0) {
            throw new ZodValidationError(issues);
        }
        throw createValidationError(path, 'Expected a matching union member.');
    });
}
/**
 * ???? IPC ???????? zod ?????????
 */
exports.z = {
    string,
    number,
    boolean,
    unknown,
    literal,
    enum: enumeration,
    array,
    object,
    union
};
