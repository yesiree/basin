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
  root: 'src',
  sources: {
    markdown: '**/*.md'
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






## API — Basin






### Static Properties

#### `Basin.Ready`

A JavaScript symbol that is used to register listeners on a special `Basin.Ready` channel. This channel is emitted to only once, after the initial glob search has completed and all asynchronous listeners called as part of that initial search have resolved.

#### `Basin.All`

A JavaScript symbol that is used to register listeners on a special `Basin.All` channel. This channel receives all events emitted on the basin instance, regardless of the channel name. This can be useful for logging and debugging.

#### `Basin.Default`

A JavaScript symbol that is used to register listeners on a special `Basin.Default` channel. This channel is the default channel if no channels are specified in the `source` parameter to the basin constructor.






### Static Methods

#### `Basin.constructor`
Creates a new `Basin` object.

##### Parameters

 - `root` — The root path to read files from. This path will be further refined by the `sources` parameter. (Defaults to `/`.)
 - `sources` — A map of source names and globs (globs can be either strings or array of strings). These globs will be prefixed with the `root` parameter. The source names will be the names of Basin channels, and the globs will be used to find files to push to these chanels. (Defaults to `{ [Basin.Default]: '**/*'}`.)
 - `ignore` — a glob pattern to ignore when searching for files. (Defaults to `undefined`.)
 - `emitFileData` — If true, a file object with `path` and `content` properties will be emitted on the channel, otherwise, only the `path` will be emitted.
- `watch` — If true, Basin will watch for changes on the file system and emit those files to the appropriate channels.

##### Return Value

An instance of `Basin`.

#### `Basin.read(path)`

Reads the contents of a file specified by `path` from disk.

##### Parameters

  - `path` — The path of the file to read from.
  - `root` — A root directory to prefix the path with (optional).

##### Return Value

The contents of the file (as a buffer).

#### `Basin.write(path, data, root)`

Writes `data` out to a file specified by `path`.

##### Parameters

 - `path` — The path of the file to write to.
 - `data` — The data to be written to the file.
 - `root` —  A root directory to prefix the path with (optional).

##### Return Value

A promise that resolves when the file has been written.

#### `Basin.rimraf(glob)`

Deletes files matching `glob`.

##### Parameters

 - `glob` — A glob pattern to match files to be deleted.

##### Return Value

A promise that resolves when the files have been deleted.






### Instance Properties

#### `basin.ready`

A boolean property that indicates whether or not the `Basin.Ready` event has been fired or not.






### Instance Methods

#### `basin.on(channel, listener)`

Adds a listener to `channel`. Whenever something is emitted on that channel, the listener will be called.

##### Parameters

 - `channel` — The channel to which the listener should be added. If no channel is specified, the `Basin.Default` channel will be used.
 - `listener` — A listener function to be called when something is emitted on the channel.

##### Return Value

The basin instance. This allows chaining multiple calls to `basin.on`.

#### `basin.off(channel, listener)`

Removes a listener from `channel`.

##### Parameters

 - `channel` — The channel from which to remove the listener. If no channel is specified, the `Basin.Default` channel will be used.
 - `listener` — A reference to the listener function to be removed.

##### Return Value

The basin instance.

#### `basin.once(channel, listener)`

Adds a listener to `channel`. If no channel is specified, the `Basin.Default` channel will be used. The listener will be removed after the first time it is called.

##### Parameters

 - `channel` — The channel to which the listener should be added.
 - `listener` — A listener function to be called when something is emitted on the channel.

##### Return Value

The basin instance. This allows chaining multiple calls to `basin.once`.

#### `basin.emit(channel, ...args)`

Emits a series of arguments on `channel`.

##### Parameters

 - `channel` — The channel on which to emit the arguments.
 - `...args` — A series of arguments to be emitted on the channel.

##### Return Value

A promise that resolves when all asynchronous listeners have resolved.

#### `basin.emitWhenReady(channel, ...args)`

Emits a series of arguments on `channel` only after the `Basin.Ready` event has been fired. The `ready` event occurs after the initial glob search is complete and all pending emits from that initial search settle.

##### Parameters

 - `channel` — The channel on which to emit the arguments
 - `...args` — A series of arguments to be emitted on the channel.

##### Return Value

A promise that resolves when all asynchronous listeners have resolved.

#### `basin.run()`

Start the process of searching for files and loading them into channels.

##### Return Value

An instance of `Basin`.

#### `basin.cache(store, key, object)`

Stores an `object` in a cache `store` using `key`

##### Parameters

 - `store` — The cache namespace in which to store the object.
 - `key` — The key used to store the object.
 - `object` — The object to be stored

##### Return Value

The object being stored in the cache.

#### `basin.get(store, key)`

Returns an object from the cache.

##### Parameters

 - `store` — The cache namespace from which to retrieve the object.
 - `key` — The key of the object to be retrieved.

##### Return Value

The object being retrieved from the cache.

#### `basin.purge(store, key)`

Purges an object from the cache.

##### Parameters

 - `store` — The cache namespace from which to purge the object.
 - `key` — The key of the object to be purged.

##### Return Value

The object being purged from the cache.

#### `basin.read(path)`

Reads the contents of a file specified by `path` from disk.

##### Parameters

  - `path` — The path of the file to read from.
  - `root` — A root directory to prefix the path with (optional).

##### Return Value

The contents of the file (as a buffer).

#### `basin.write(path, data, root)`

Writes `data` out to a file specified by `path`.

##### Parameters

 - `path` — The path of the file to write to.
 - `data` — The data to be written to the file.
 - `root` —  A root directory to prefix the path with (optional).

##### Return Value

A promise that resolves when the file has been written.

#### `basin.rimraf(glob)`

Deletes files matching `glob`.

##### Parameters

 - `glob` — A glob pattern to match files to be deleted.

##### Return Value

A promise that resolves when the files have been deleted.

### Listener Function

#### `async listener = ({ type, path, absolutePath, data? }) => Promise`

##### Parameters

 - `type` — The type of event that was emitted. This will be one of the following:
  - `'ADD'` — A file was created.
  - `'MOD'` — A file was modified.
  - `'DEL'` — A file was deleted.
 - `path` — The path of the file that was created, modified, or deleted.
 - `absolutePath` — The absolute path of the file that was created, modified, or deleted.
 - `data` — The contents of the file that was created, modified, or deleted. This will only be present if the `emitFileData` option is passed to the `Basin` constructor.

##### Return Value

A promise that resolves when the listener has finished processing the event.






### Utility Methods

#### `getCacheBustingPath(path, content)`

##### Parameters

 - `path` — The path of the file to be cache busted.
 - `content` — The contents of the file to be cache busted.

##### Return Value

A path with a hash of the file contents inserted into the filename.

#### `replaceWithCacheBustingPath(path, content)`

Replaces instances of `path` in `content` with a cache-busting path.

##### Parameters

 - `path` — The path of the file to be cache busted.
 - `content` — The contents of a file in which to replace `path` with a cache-busting path.
 - `cacheBustingPath` — The cache-busting path to replace `path` with.
 - `openingTag` — The opening tag to use when replacing `path` with `cacheBustingPath`.
  - `closingTag` — The closing tag to use when replacing `path` with `cacheBustingPath`.

##### Return Value

The value of `content` with instances of `path` replaced with `cacheBustingPath`.
