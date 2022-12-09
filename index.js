import fs from 'fs'
import { join, relative, dirname } from 'path'
import chokidar from 'chokidar'
import rimraf from 'rimraf'
import mkdirp from 'mkdirp'
import pico from 'picomatch'
import del from 'del'

export * from './utils/assets.js'

/**
 * Creates an instance of Basin
 *
 * @example
 *
 *  new Basin({ root: 'src' })
 *    .on(Basin.Ready, () => console.log('Initial scan complete.'))
 *    .on(path => console.log(path))
 *
 *
 * @example
 *
 *  const { join } = require('path')
 *  const marked = require('marked')
 *
 *  const basin = new Basin({
 *    root: 'src',
 *    ignore: '**\/node_modules/**',
 *    watch: true,
 *    emitFileData: true,
 *    sources: {
 *      markdown: '**\/*.md'
 *    }
 *  })
 *
 *  basin.on('markdown', file => {
 *    file.content = marked(file.content)
 *    basin.emit('write', file)
 *  })
 *
 *  basin.on('write', async file => {
 *    const path = join('dist', file.path)
 *    await Basin.write(path, file.content)
 *    console.log(`File '${file.path}' updated.`)
 *  })
 *
 *
 * @param {Object} opts - Options for configuring the Basin instance.
 * @param {boolean} opts.watch - If true, file changes will be watched.
 * @param {boolean} opts.emitFileData - If true, emit files (path and content) instead of just file paths
 * @param {string} opts.root - A prefix...
 * @param {anymatch} opts.ignore - ...
 * @param {Object Map} opts.sources - A map of source names and globs.
 * @return {Basin Instance} A Basin instance.
 */
export function Basin({
  watch = false,
  emitFileData = false,
  root = '',
  sources = { [Basin.Default]: '**/*' },
  ignore = undefined
} = {}) {
  this.opts = {}
  this.opts.watch = watch
  this.opts.emitFileData = emitFileData
  this.opts.root = root || process.cwd()
  this.opts.ignore = ignore
  this._ready = false
  this._cache = {}
  this._events = {}
  this._rootGlob = join(this.opts.root, '**/*')
  this._sources = []
  const { resolve, promise } = Deferred()
  this._resolveReady = resolve
  this.whenReady = promise

  let allGlobs = []
  Object
    .keys(sources)
    .forEach(name => {
      const globs = (
        Array.isArray(sources[name])
          ? sources[name]
          : [sources[name]]
      ).map(glob => this.opts.root ? join(this.opts.root, glob) : glob)
      this._sources.push({ name, isMatch: pico(globs) })
      allGlobs = allGlobs.concat(globs)
    })
  this._matchesAny = pico(allGlobs)
  this.preparations = []
}

Basin.prototype.run = function Basin__Instance__run() {
  const watcher = chokidar.watch(this._rootGlob, { ignored: this.opts.ignore })
  let closed = false
  watcher
    .on('ready', listener.bind(this, 'RDY'))
    .on('add', listener.bind(this, 'ADD'))
    .on('change', listener.bind(this, 'MOD'))
    .on('unlink', listener.bind(this, 'DEL'))
  return this

  async function listener(event, path) {
    if (closed) return
    let payload = {
      type: event,
      path: path ? relative(this.opts.root, path) : undefined,
      absolutePath: path
    }
    switch (event) {
      case 'RDY':
        await Promise.all(this.preparations)
        this.preparations = null
        this._ready = true
        this._resolveReady()
        setTimeout(() => {
          this.emit(Basin.Ready)
          if (!this.opts.watch) {
            closed = true
            watcher.close()
          }
        })
        break
      case 'ADD':
      case 'MOD':
        if (!this._matchesAny(path)) return
        if (this.opts.emitFileData) {
          const fileRead = this.read(path)
          if (this.preparations) this.preparations.push(fileRead)
          const data = await fileRead
          payload = Object.assign(payload, { data })
        }
      case 'DEL':
        const emitAll$ = this.emit(Basin.All, payload)
        if (this.preparations) this.preparations.push(emitAll$)
        this._sources.forEach(({ name, isMatch }) => {
          if (isMatch(path)) {
            const emitSource$ = this.emit(name, payload)
            if (this.preparations) this.preparations.push(emitSource$)
          }
        })
        break
      default:
        throw new Error(`Reached invalid state.`)
    }
  }
}

Basin.prototype.cache = function Basin__Instance__cache(store, key, obj) {
  if (!store || !key) {
    throw new Error(`Must provide a store name and key. Provided store: ${store}; provided key: ${key}.`)
  }
  if (!this._cache[store]) {
    this._cache[store] = {}
  }
  return this._cache[store][key] = obj
}

Basin.prototype.purge = function Basin__Instance__purge(store, key) {
  if (!store || !key) {
    throw new Error(`Must provide a store name and key. Provided store: ${store}; provided key: ${key}.`)
  }
  if (this._cache[store] || !this._cache[store][key]) return
  const obj = this._cache[store][key]
  delete this._cache[store][key]
  return obj
}

Basin.prototype.get = function Basin__Instance__get(store, key) {
  if (!store) {
    throw new Error(`Must provide a store name. Found '${store}'.`)
  }
  if (!key) {
    return Object
      .keys(this._cache[store] || {})
      .map(key => this._cache[store][key])
  } else {
    return (this._cache[store] || {})[key]
  }
}

Basin.prototype.on = function Basin__Instance__on(name, listener) {
  if (!listener && typeof name === 'function') {
    listener = name
    name = Basin.Default
  }
  if (!Array.isArray(this._events[name])) this._events[name] = []
  this._events[name].push(listener)
  return this
}

Basin.prototype.off = function Basin__Instance__off(name, listener) {
  if (!Array.isArray(this._events[name])) return
  const index = this._events[name].indexOf(listener)
  if (index === -1) return
  this._events[name].splice(index, 1)
  return this
}

Basin.prototype.once = function Basin__Instance__once(name, listener) {
  return this.on(name, (...args) => {
    this.off(name, listener)
    listener(...args)
  })
}

Basin.prototype.emit = async function Basin__Instance__emit(name, ...args) {
  const listeners = this._events[name]
  if (!Array.isArray(listeners)) return
  await Promise.all(
    listeners.map(listener => listener.apply(this, args))
  )
}

Basin.prototype.emitWhenReady = async function Basin__Instance__emitWhenReady(name, ...args) {
  await this.whenReady
  await this.emit(name, ...args)
}

Object.defineProperties(Basin.prototype, {
  ready: {
    configurable: false,
    get() { return this._ready }
  }
})

Basin.read = Basin.prototype.read = function Basin__read(path, root) {
  const filename = root ? join(root, path) : path
  return new Promise((resolve, reject) => {
    fs.readFile(filename, (err, data) => {
      if (err) return reject(err)
      resolve(data)
    })
  })
}

Basin.write = Basin.prototype.write = function Basin__write(path, data, root) {
  if (root) path = join(root, path)
  return new Promise(async (resolve, reject) => {
    await mkdirp(dirname(path))
    fs.writeFile(path, data, err => {
      if (err) return reject(err)
      resolve()
    })
  })
}

Basin.rimraf = Basin.prototype.rimraf = function Basin__rimraf(glob) {
  return new Promise((resolve, reject) => {
    rimraf(glob, err => {
      if (err) return reject(err)
      resolve()
    })
  })
}

Basin.clean = Basin.prototype.clean = async function Basin__clean(globs, opts) {
  return await del(globs, opts)
}

Basin.Default = Symbol('Basin__Default')
Basin.Ready = Symbol('Basin__Ready')
Basin.All = Symbol('Basin__All')

Basin.ADD = 'ADD'
Basin.MOD = 'MOD'
Basin.DEL = 'DEL'

const Deferred = () => {
  let resolve, reject, promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { resolve, reject, promise }
}
