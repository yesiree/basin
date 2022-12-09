import {
  Basin,
  getCacheBustingPath,
  replaceWithCacheBustingPath,
} from '../../index.js'

const cfg = {
  watch: true,
  root: 'src',
  emitFile: true,
  sources: {
    assets: [
      '**/*.js',
      '**/*.scss'
    ],
    html: '**/*.html'
  }
}

const basin = new Basin(cfg)
  .on(Basin.Ready, () => basin.emit('write'))
  .on('assets', assets)
  .on('html', html)
  .on('paths', updatePaths)
  .on('write', writeFiles)
  .run()

function assets(file) {
  if (file.type === Basin.DEL) {
    this.purge('assets', file.path)
    this.purge('templates', file.path)
    return
  }
  if (file.path.endsWith('.scss')) file.path = file.path.slice(0, -4) + 'css'
  file.content = file.data.toString()
  file.dest = getCacheBustingPath(file.path, file.content)
  this.cache('assets', file.path, file)
  this.cache('templates', file.path, file)
  return this.emit('paths')
}

function html(file) {
  if (file.type === 'DEL') return this.purge('templates', file.path)
  file.content = file.data.toString()
  file.dest = file.path
  this.cache('templates', file.path, file)
  return this.emit('paths')
}

function updatePaths() {
  const assets = this.get('assets')
  assets.forEach(asset => this.cache('static', asset.path, asset))
  this
    .get('templates')
    .map(template => {
      let content = template.content
      assets.forEach(asset => {
        content = replaceWithCacheBustingPath({
          path: asset.path,
          content,
          cacheBustingPath: asset.dest,
        })
      })
      template.content = content
      this.cache('static', template.path, template)
    })
  return this.emit('write')
}

async function writeFiles() {
  if (!this.ready) return
  await this.rimraf('./dist/**/*')
  const promises = this
    .get('static')
    .sort((a, b) => {
      const aOrder = a.dest.endsWith('.html') ? 1 : 0
      const bOrder = b.dest.endsWith('.html') ? 1 : 0
      return aOrder - bOrder
    })
    .map(file => this.write(file.dest, file.content, './dist'))
  await Promise.all(promises)
  console.log('Updated.')
}
