# hypercored

A daemon that can download and share multiple hypercores and hyperdrives. Supports seeding them to the browser over WebSockets as well.
Backed by [hypercore-archiver](https://github.com/mafintosh/hypercore-archiver)

```
npm install -g hypercored
```

## Usage

``` js
# will watch ./feeds and store data in ./archiver
hypercored
```

For more info run

```
Usage: hypercored [key?] [options]

    --cwd         [folder to run in]
    --websockets  [share over websockets as well]
    --port        [explicit websocket port]
    --no-swarm    [disable swarming]
```

## License

MIT
