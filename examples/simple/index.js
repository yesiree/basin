const Basin = require('@yesiree/basin')

const basin = new Basin({
  channels: {
    js: './src/**/*.js',
    scss: './src/**/*.scss',
    html: './src/**/*.html'
  }
})

basin.on('js', function (type, file) {
  console.log(' > foo ')
  this.emit('foo', type, file)
})

basin.on('foo', (...args) => {
  console.dir(args)
})

basin.run()
