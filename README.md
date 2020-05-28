# Basin

A generic file processor. You could use this for bundling, static site generation, etc.

Many site generation and task running tools take a linear approach. Basin uses an event emitting approach, which allows you to process files using whatever workflow you like. You can specify a map of source names and globs. Any changes (creation, modification, deletion) are emitted on the basin instance. Files can be processed and any artifacts can be re-emitted for further processing or writing to file, etc.

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

basin.on('markdown', function (file) {
  if (file.event === 'DEL') return
  // convert file.content to html...
  this.write(file.path, file.content)
})


```
