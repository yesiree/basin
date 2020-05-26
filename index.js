const fs = require('fs')
const { join, relative } = require('path')
const chokidar = require('chokidar')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const pico = require('picomatch')

module.exports = Basin

function Basin({
  watch = false,
  emitPath = false,
  root = undefined,
  channels = { [Basin.Default]: '**/*' }
} = {}) {
  this.opts = {}
  this.opts.watch = watch
  this.opts.emitPath = emitPath
  this.opts.root = root
  this._ready = false
  this._cache = {}
  this._events = {}
  this._globs = []
  this._channels = []
  Object
    .keys(channels)
    .forEach(name => {
      const glob = channels[name]
      if (glob === Basin.None) return
      this._globs.push(channels[name])
      this._channels.push({
        name,
        isMatch: pico(glob)
      })
    })
}

Basin.Ready = Symbol('Basin__Ready')
Basin.Default = Symbol('Basin__Default')

Basin.prototype.run = function Basin__Instance__run() {
  const watcher = chokidar.watch(this._globs)
  let closed = false
  watcher
    .on('ready', listener.bind(this, 'RDY'))
    .on('add', listener.bind(this, 'ADD'))
    .on('change', listener.bind(this, 'MOD'))
    .on('unlink', listener.bind(this, 'DEL'))

  async function listener(type, path) {
    if (closed) return
    let payload
    switch (type) {
      case 'RDY':
        this.ready = true
        this.emit(Basin.Ready)
        if (!this.opts.watch) {
          closed = true
          watcher.close()
        }
        break
      case 'ADD':
      case 'MOD':
        payload = this.opts.emitPath
          ? path
          : await this.read(path, this.opts.root)
      case 'DEL':
        this._channels.forEach(({ name, isMatch }) => {
          if (isMatch(path)) this.emit(name, type, payload)
        })
        break
      default:
        throw new Error(`Reached invalid state.`)
    }
  }
}


Basin.prototype.cache = function Basin__Instance__cache(store, key, obj) {
  if (this._cache[store]) {
    this._cache[store] = {}
  }
  return this._cache[store][key] = obj
}

Basin.prototype.purge = function Basin__Instance__purge(store, key) {
  if (this._cache[store] || !this._cache[store][key]) return
  const obj = this._cache[store][key]
  delete this._cache[store][key]
  return obj
}

Basin.prototype.read = function Basin__read(path, root) {
  const filename = path
  path = root ? relative(root, path) : path
  return new Promise((resolve, reject) => {
    fs.readFile(filename, (err, data) => {
      if (err) return reject(err)
      resolve({
        path,
        content: data.toString()
      })
    })
  })
}

Basin.prototype.write = function Basin__write(path, data, root) {
  if (root) path = join(root, path)
  return new Promise(async (resolve, reject) => {
    await mkdirp(path)
    fs.writeFile(path, data, err => {
      if (err) return reject(err)
      resolve()
    })
  })
}

Basin.prototype.rimraf = function Basin__rimraf(glob) {
  return new Promise((resolve, reject) => {
    rimraf(glob, err => {
      if (err) return reject(err)
      resolve()
    })
  })
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

Basin.prototype.emit = function Basin__Instance__emit(name, ...args) {
  const listeners = this._events[name]
  if (!Array.isArray(listeners)) return
  return Promise.all(
    listeners.map(listener => listener.apply(this, args))
  )
}


// const basin = new Basin({
//   watch: false,
//   root: '/path',
//   channels: {
//     foo: '**/*.*'
//   }
// })

// basin.on(Basin.Ready, () => {
//   basin.cache...
//
// })

// basin.on('foo', (type, data) => {

// })
