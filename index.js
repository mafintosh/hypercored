#!/usr/bin/env node

process.title = 'hypercored'

var datDns = require('dat-dns')()
var wss = require('websocket-stream')
var archiver = require('hypercore-archiver')
var swarm = require('hypercore-archiver/swarm')
var readFile = require('read-file-live')
var minimist = require('minimist')
var path = require('path')
var pump = require('pump')
var http = require('http')

var argv = minimist(process.argv.slice(2))
var cwd = argv.cwd || process.cwd()
var ar = archiver(path.join(cwd, 'archiver'), argv._[0])
var server = http.createServer()
var port = argv.port || process.env.PORT || 0
var unencryptedWebsockets = !!argv['unencrypted-websockets']

if (argv.help) {
  console.log(
    'Usage: hypercored [key?] [options]\n\n' +
    '  --cwd         [folder to run in]\n' +
    '  --websockets  [share over websockets as well]\n' +
    '  --port        [explicit websocket port]\n' +
    '  --no-swarm    [disable swarming]'
  )
  process.exit(0)
}

if (unencryptedWebsockets) {
  argv.websockets = true
}

ar.on('sync', function (feed) {
  console.log('Fully synced', feed.key.toString('hex'))
})

ar.on('add', function (feed) {
  console.log('Adding', feed.key.toString('hex'))
})

ar.on('remove', function (feed) {
  console.log('Removing', feed.key.toString('hex'))
})

ar.on('changes', function (feed) {
  console.log('Archiver key is ' + feed.key.toString('hex'))
})

console.log('Watching %s for a list of active feeds', path.join(cwd, 'feeds'))

wss.createServer({server: server}, onwebsocket)
server.on('request', function (req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({
    name: 'hypercored',
    version: require('./package').version
  }))
})

if (argv.swarm != false) swarm(ar).on('listening', function () {
  console.log('Swarm listening on port %d', this.address().port)
})

if (argv.websockets) server.listen(port, function () {
  console.log('WebSocket server listening on port %d', server.address().port)
})

function resolveAll (links, cb) {
  var keys = []
  var missing = links.length

  if (!missing) return cb(null, [])

  for (var i = 0; i < links.length; i++) {
    datDns.resolveName(links[i], function (_, key) {
      keys.push(key)
      if (!--missing) cb(null, keys.filter(Boolean))
    })
  }
}

readFile(path.join(cwd, 'feeds'), function (file) {
  resolveAll(file.toString().trim().split('\n'), function (err, feeds) {
    if (err) return

    ar.list(function (err, keys) {
      if (err || !ar.changes.writable) return

      var i = 0

      for (i = 0; i < keys.length; i++) {
        if (feeds.indexOf(keys[i].toString('hex')) === -1) ar.remove(keys[i])
      }
      for (i = 0; i < feeds.length; i++) {
        ar.add(feeds[i])
      }
    })
  })
})

function onwebsocket (stream) {
  pump(stream, ar.replicate({encrypt: !unencryptedWebsockets}), stream)
}
