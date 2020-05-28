# Basin

A generic file processor. You could use this for bundling, static site generation, etc.

Many site generation and task running tools take a linear approach. Basin uses an event emitting approach, which allows you to process files using whatever workflow you like. You can specify a map of source names and globs, separating files into different channels. Any changes (creation, modification, deletion) are emitted to those channels. Files can be processed and any artifacts can be re-emitted on any relevant channels for further processing or writing to a file, etc. You can emit whatever data you like to whichever channels you like whenever you like. You can even emit the same data to multiple channels. This provides a lot of flexibility and allows Basin to work for very simple and very complex workflows.

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
  this.emit('write', file)
})

basin.on('write', async function (file) {
  await this.write(file.path, file.content)
})
```
A couple of things to note about this example:

 - Sources, which are a type of channel on which events can be emitted, are setup when instantiating the Basin instance
 - Sources have a glob associated with them and whenever a file change (creation, modification, deletion) occurs, an event is emitted on that source's channel.
 - Channels can be subscribed to using the Basin instance method `on`. The first parameter is the channel name, which in the case of source channels, is the name of the source specificed in the configuration object passed to the Basin constructor method.
 - Non-source channels don't need to be configured. You can simply emit data to a new channel by specifying a new name as the first parameter to the Basin instance's `emit` method, followed by whatever data you want to send to that channel (this is the case for the `write` channel in the example above).



## Tutorial

> Create a simple bundler, with preprocessors, minification, cache-busting URLs, and template rendering.


## API

