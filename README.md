# Basin

A generic file processor. You could use this for bundling, static site generation, etc.

Many site generation and task running tools take a linear approach. Basin uses an event emitting approach, which allows you to process files using whatever workflow you like. You can specify a map of source names and globs, separating files into different channels. Any changes (creation, modification, deletion) are emitted to those channels. Files can be processed and any artifacts can be re-emitted on any relevant channels for further processing or writing to a file, etc. You can emit whatever data you like to whichever channels you like whenever you like. You can even emit the same data to multiple channels. This provides a lot of flexibility and allows Basin to work for the very simple and the very complex.

## Install

```
npm i @yesiree/basin
```

## Example

```javascript
const Basin = require('@yesiree/basin')

const basin = new Basin({
  sourceRoot: 'src',
  sources: {
    markdown: 'src/**/*.md'
  }
})

basin.on('markdown', /*async*/ function (file) {
  if (file.event === 'DEL') return
  // /*await*/ convert file.content to html...
  this.write(file.path, file.content)
})
```


## Tutorial

> Create a simple bundler, with preprocessors, minification, cache-busting URLs, and template rendering.


## API

