/**
 * @file 构建 Electron 启动所需的浏览器端 bundle 与 preload bundle。
 *
 * 项目使用纯 tsc 输出 CommonJS，本脚本负责把渲染层与 preload 层的相对依赖打包成
 * Electron 可以直接加载的单文件脚本。渲染层会额外把 Vue `template` 预编译为静态
 * `render` 函数，避免在严格 CSP 下触发运行时 `unsafe-eval`。
 */

const fs = require('node:fs')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..')
const distRoot = path.join(projectRoot, 'dist')

/**
 * 定义单个 bundle 的构建配置。
 *
 * @typedef {object} BundleConfig
 * @property {string} name 构建日志中展示的 bundle 名称。
 * @property {string} entryPath bundle 入口文件绝对路径。
 * @property {string} outputPath bundle 输出文件绝对路径。
 * @property {string} runtimeName bundle 内部 require 函数名称。
 * @property {string} modulesName bundle 内部模块表变量名称。
 * @property {string} cacheName bundle 内部模块缓存变量名称。
 * @property {boolean} allowExternalRequire 是否允许回退到运行时外部 require。
 * @property {boolean} precompileVueTemplates 是否预编译 Vue 模板字符串。
 */

/**
 * 定义收集到的模块记录。
 *
 * @typedef {object} ModuleRecord
 * @property {string} code 模块源码。
 * @property {Record<string, string>} deps 模块依赖映射。
 */

/**
 * 将绝对路径转换为 bundle 内部使用的模块 ID。
 *
 * @param {string} absolutePath 绝对文件路径。
 * @returns {string} 标准化后的模块 ID。
 */
function toModuleId(absolutePath) {
  return path.relative(distRoot, absolutePath).replace(/\\/g, '/')
}

/**
 * 判断给定文件是否存在。
 *
 * @param {string} filePath 待检查文件路径。
 * @returns {boolean} 文件是否存在。
 */
function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

/**
 * 根据 CommonJS require 请求解析实际 JS 文件路径。
 *
 * @param {string} ownerPath 发起 require 的模块路径。
 * @param {string} request require 请求字符串。
 * @param {BundleConfig} config bundle 构建配置。
 * @returns {string | null} 被依赖模块的绝对路径，外部依赖返回 null。
 */
function resolveDependency(ownerPath, request, config) {
  if (!request.startsWith('.')) {
    if (config.allowExternalRequire) {
      return null
    }

    throw new Error(`${config.name} bundle only supports relative imports, got "${request}" in ${ownerPath}`)
  }

  const basePath = path.resolve(path.dirname(ownerPath), request)
  const candidates = [
    basePath,
    `${basePath}.js`,
    path.join(basePath, 'index.js')
  ]

  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return candidate
    }
  }

  throw new Error(`Cannot resolve ${config.name} dependency "${request}" from ${ownerPath}`)
}

/**
 * 提取 CommonJS require 调用中的依赖请求字符串。
 *
 * @param {string} code 模块源码。
 * @returns {string[]} 依赖请求列表。
 */
function extractRequires(code) {
  const requests = []
  const pattern = /require\((['"])(.+?)\1\)/g
  let match = pattern.exec(code)

  while (match) {
    requests.push(match[2])
    match = pattern.exec(code)
  }

  return requests
}

/**
 * 在 pnpm 或普通 node_modules 布局中查找 Vue 模板编译器入口。
 *
 * @returns {string} Vue compiler-dom 的 CommonJS 入口路径。
 */
function resolveVueCompilerPath() {
  try {
    return require.resolve('@vue/compiler-dom')
  } catch {
    const pnpmDir = path.join(projectRoot, 'node_modules', '.pnpm')
    const candidates = fs.readdirSync(pnpmDir)
      .filter((name) => name.startsWith('@vue+compiler-dom@'))
      .sort()
      .reverse()

    for (const candidate of candidates) {
      const compilerPath = path.join(
        pnpmDir,
        candidate,
        'node_modules',
        '@vue',
        'compiler-dom',
        'dist',
        'compiler-dom.cjs.js'
      )

      if (fileExists(compilerPath)) {
        return compilerPath
      }
    }
  }

  throw new Error('Cannot locate @vue/compiler-dom for template precompilation.')
}

/**
 * 加载 Vue 模板编译器。
 *
 * @returns {{ compile: (template: string, options: Record<string, unknown>) => { code: string } }} Vue 编译器。
 */
function loadVueCompiler() {
  return require(resolveVueCompilerPath())
}

const vueCompiler = loadVueCompiler()

/**
 * 读取 JS 模板字符串字面量内容。
 *
 * @param {string} code 源码文本。
 * @param {number} startIndex 反引号起始位置。
 * @returns {{ value: string, endIndex: number }} 模板内容与结束位置。
 */
function readTemplateLiteral(code, startIndex) {
  let index = startIndex + 1
  let value = ''

  while (index < code.length) {
    const char = code[index]

    if (char === '\\') {
      const nextChar = code[index + 1] ?? ''
      value += char + nextChar
      index += 2
      continue
    }

    if (char === '`') {
      return {
        value,
        endIndex: index + 1
      }
    }

    value += char
    index += 1
  }

  throw new Error('Unterminated Vue template literal.')
}

/**
 * 将 Vue 模板编译为可直接放进对象属性的 render 函数表达式。
 *
 * @param {string} template Vue 模板字符串。
 * @param {string} moduleId 当前模块 ID，用于错误定位。
 * @returns {string} render 函数表达式源码。
 */
function compileVueTemplate(template, moduleId) {
  const result = vueCompiler.compile(template, {
    mode: 'function',
    prefixIdentifiers: true,
    hoistStatic: false,
    cacheHandlers: false,
    comments: false
  })

  return `(function () {\n${result.code}\n})()`
}

/**
 * 将模块源码中的 Vue `template` 属性替换为预编译 `render` 属性。
 *
 * @param {string} code 模块源码。
 * @param {string} moduleId 当前模块 ID。
 * @returns {string} 替换后的模块源码。
 */
function precompileVueTemplates(code, moduleId) {
  const pattern = /\btemplate\s*:\s*/g
  let cursor = 0
  let output = ''
  let match = pattern.exec(code)

  while (match) {
    const literalStart = pattern.lastIndex

    if (code[literalStart] !== '`') {
      match = pattern.exec(code)
      continue
    }

    const literal = readTemplateLiteral(code, literalStart)
    output += code.slice(cursor, match.index)
    output += `render: ${compileVueTemplate(literal.value, moduleId)}`
    cursor = literal.endIndex
    pattern.lastIndex = literal.endIndex
    match = pattern.exec(code)
  }

  return output + code.slice(cursor)
}

/**
 * 按 bundle 类型预处理模块源码。
 *
 * @param {string} code 原始模块源码。
 * @param {string} moduleId 当前模块 ID。
 * @param {BundleConfig} config bundle 构建配置。
 * @returns {string} 预处理后的模块源码。
 */
function preprocessModuleCode(code, moduleId, config) {
  if (!config.precompileVueTemplates) {
    return code
  }

  return precompileVueTemplates(code, moduleId)
}

/**
 * 递归收集入口模块依赖图。
 *
 * @param {string} absolutePath 当前模块绝对路径。
 * @param {BundleConfig} config bundle 构建配置。
 * @param {Map<string, ModuleRecord>} modules 模块收集表。
 */
function collectModule(absolutePath, config, modules) {
  const moduleId = toModuleId(absolutePath)

  if (modules.has(moduleId)) {
    return
  }

  const originalCode = fs.readFileSync(absolutePath, 'utf8')
  const deps = {}

  modules.set(moduleId, {
    code: preprocessModuleCode(originalCode, moduleId, config),
    deps
  })

  for (const request of extractRequires(originalCode)) {
    const dependencyPath = resolveDependency(absolutePath, request, config)

    if (!dependencyPath) {
      continue
    }

    deps[request] = toModuleId(dependencyPath)
    collectModule(dependencyPath, config, modules)
  }
}

/**
 * 生成单个模块在 bundle 中的函数包装代码。
 *
 * @param {string} moduleId 模块 ID。
 * @param {ModuleRecord} record 模块记录。
 * @returns {string} 模块包装代码。
 */
function renderModule(moduleId, record) {
  return [
    `${JSON.stringify(moduleId)}: [function(require, module, exports) {`,
    record.code,
    `}, ${JSON.stringify(record.deps)}]`
  ].join('\n')
}

/**
 * 生成本地 require 函数的外部依赖回退代码。
 *
 * @param {BundleConfig} config bundle 构建配置。
 * @returns {string} 外部依赖回退代码。
 */
function renderExternalRequireFallback(config) {
  if (!config.allowExternalRequire) {
    return `      throw new Error('${config.name} dependency not found: ' + moduleId + ' -> ' + request)`
  }

  return [
    `      if (typeof __externalRequire === 'function') {`,
    `        return __externalRequire(request)`,
    `      }`,
    `      throw new Error('${config.name} dependency not found: ' + moduleId + ' -> ' + request)`
  ].join('\n')
}

/**
 * 生成完整 bundle 文本。
 *
 * @param {BundleConfig} config bundle 构建配置。
 * @param {Map<string, ModuleRecord>} modules 模块收集表。
 * @returns {string} bundle 源码。
 */
function renderBundle(config, modules) {
  const entryId = toModuleId(config.entryPath)
  const renderedModules = [...modules.entries()]
    .map(([moduleId, record]) => renderModule(moduleId, record))
    .join(',\n')
  const externalRequireLine = config.allowExternalRequire
    ? `  var __externalRequire = typeof require === 'function' ? require : null\n`
    : ''

  return `/**\n * @file ${config.name} bundle，由 scripts/build-renderer-bundle.js 自动生成。\n */\n;(function () {\n  var ${config.modulesName} = {\n${renderedModules}\n  }\n  var ${config.cacheName} = {}\n${externalRequireLine}\n  /**\n   * 加载 bundle 内部模块。\n   *\n   * @param {string} moduleId 模块 ID。\n   * @returns {unknown} 模块导出值。\n   */\n  function ${config.runtimeName}(moduleId) {\n    if (${config.cacheName}[moduleId]) {\n      return ${config.cacheName}[moduleId].exports\n    }\n\n    var record = ${config.modulesName}[moduleId]\n    if (!record) {\n      throw new Error('${config.name} module not found: ' + moduleId)\n    }\n\n    var module = { exports: {} }\n    ${config.cacheName}[moduleId] = module\n\n    /**\n     * 解析当前模块的相对依赖。\n     *\n     * @param {string} request 原始 require 请求。\n     * @returns {unknown} 依赖模块导出值。\n     */\n    function localRequire(request) {\n      var dependencyId = record[1][request]\n      if (!dependencyId) {\n${renderExternalRequireFallback(config)}\n      }\n      return ${config.runtimeName}(dependencyId)\n    }\n\n    record[0](localRequire, module, module.exports)\n    return module.exports\n  }\n\n  ${config.runtimeName}(${JSON.stringify(entryId)})\n})()\n`
}

/**
 * 构建单个 bundle 并写入磁盘。
 *
 * @param {BundleConfig} config bundle 构建配置。
 */
function buildBundle(config) {
  const modules = new Map()

  collectModule(config.entryPath, config, modules)
  fs.mkdirSync(path.dirname(config.outputPath), { recursive: true })
  fs.writeFileSync(config.outputPath, renderBundle(config, modules), 'utf8')
  console.log(`[${config.name}-bundle] wrote ${path.relative(projectRoot, config.outputPath)} with ${modules.size} modules`)
}

/**
 * 构建全部 Electron 启动 bundle。
 */
function buildAllBundles() {
  buildBundle({
    name: 'renderer',
    entryPath: path.join(distRoot, 'src', 'renderer.js'),
    outputPath: path.join(distRoot, 'src', 'renderer.bundle.js'),
    runtimeName: '__rendererRequire',
    modulesName: '__rendererModules',
    cacheName: '__rendererCache',
    allowExternalRequire: false,
    precompileVueTemplates: true
  })

  buildBundle({
    name: 'preload',
    entryPath: path.join(distRoot, 'electron', 'preload.js'),
    outputPath: path.join(distRoot, 'electron', 'preload.bundle.js'),
    runtimeName: '__preloadRequire',
    modulesName: '__preloadModules',
    cacheName: '__preloadCache',
    allowExternalRequire: true,
    precompileVueTemplates: false
  })
}

buildAllBundles()