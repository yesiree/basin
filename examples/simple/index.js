const Basin = require('@yesiree/basin')
const {
  getCacheBustingPath,
  replaceWithCacheBustingPath
} = require('@yesiree/basin/utils/assets')

const basin = new Basin({
  root: 'src',
  channels: {
    assets: './src/**/*.{js,scss}',
    html: './src/**/*.html'
  }
})

basin.on(Basin.Ready, function () {
  return this.emit('write')
})

basin.on('assets', function (evt, file) {
  if (evt.isDEL) {
    this.purge('assets', file.path)
    this.purge('templates', file.path)
    return
  }
  if (file.path.endsWith('.scss')) file.path = file.path.slice(0, -4) + 'css'
  file.dest = getCacheBustingPath(file.path, file.content)
  this.cache('assets', file.path, file)
  this.cache('templates', file.path, file)
  return this.emit('update-paths')
})

basin.on('html', function (evt, file) {
  if (evt.isDEL) return this.purge('templates', file.path)
  file.dest = file.path
  this.cache('templates', file.path, file)
  return this.emit('update-paths')
})

basin.on('update-paths', function () {
  const assets = this.get('assets')
  assets.forEach(asset => this.cache('static', asset.path, asset))
  this
    .get('templates')
    .map(template => {
      let content = template.content
      assets.forEach(asset => {
        content = replaceWithCacheBustingPath({
          path: asset.path,
          cacheBustingPath: asset.dest,
          content
        })
      })
      template.content = content
      this.cache('static', template.path, template)
    })
  return this.emit('write')
})

basin.on('write', async function () {
  if (!this.ready) return
  await this.rimraf('./dist/**/*')
  this
    .get('static')
    .forEach(file => {
      this.write(file.dest, file.content, './dist')
    })
})

basin.run()
