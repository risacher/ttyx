# ttyx

A terminal in your browser using node.js and socket.io. 

[LIVE DEMO](https://risacher.org/zork/) (currently working as-of 2019-06-21)

An updated fork of [chjj/tty.js](https://github.com/chjj/tty.js), ttyx replaces [term.js](https://github.com/chjj/term.js) with [xterm.js](https://github.com/sourcelair/xterm.js), updates [socket.io](https://socket.io) to version 2.x and updates [Express](http://expressjs.com/) to version 4.x.  Ttyx also improves out-of-the-box security by replacing the default application with a wrapper that forces the user to login.  

Originally Based on Fabrice Bellard's vt100 for [jslinux](http://bellard.org/jslinux/).

For the standalone web terminal, see
[**xterm.js**](https://github.com/xtermjs/xterm.js).

For the lowlevel terminal spawner, see
[**pty.js**](https://github.com/chjj/pty.js).

## Screenshots

### irssi

![](http://i.imgur.com/wqare.png)

### vim & alsamixer

![](http://i.imgur.com/Zg1Jq.png)

### bash

![](http://i.imgur.com/HimZb.png)

## Features

- Tabs, Stacking Windows, Maximizable Terminals
- Screen/Tmux-like keys (optional)
- Ability to efficiently render programs: vim, mc, irssi, vifm, etc.
- Support for xterm mouse events
- 256 color support
- Persistent sessions

## Install

``` bash
$ npm install ttyx # THIS DOES NOT WORK YET
```

## Usage

ttyx is an app, but it's also possible to hook into it programatically.

``` js
var ttyx = require('ttyx');

var app = ttyx.createServer({
  shell: 'bash',
  users: {
    foo: 'bar'
  },
  port: 8000
});

app.get('/foo', function(req, res, next) {
  res.send('bar');
});

app.listen();
```

## Configuration

Configuration is stored in `~/.ttyx/config.json` or `~/.ttyx` as a single
JSON file. An example configuration file looks like:

``` json
{
  "users": {
    "hello": "world"
  },
  "https": {
    "key": "./server.key",
    "cert": "./server.crt"
  },
  "port": 8080,
  "hostname": "127.0.0.1",
  "shell": "sh",
  "shellArgs": ["arg1", "arg2"],
  "static": "./static",
  "limitGlobal": 10000,
  "limitPerUser": 1000,
  "localOnly": false,
  "cwd": ".",
  "syncSession": false,
  "sessionTimeout": 600000,
  "log": true,
  "io": { "log": false },
  "debug": false,
  "term": {
    "termName": "xterm",
    "geometry": [80, 24],
    "fontSize": 12,
    "fontFamily": "Menlo, Consolas, \"DejaVu Sans Mono\", monospace",
    "scrollback": 1000,
    "visualBell": false,
    "popOnBell": false,
    "cursorBlink": false,
    "screenKeys": false,
    "colors": [
      "#2e3436",
      "#cc0000",
      "#4e9a06",
      "#c4a000",
      "#3465a4",
      "#75507b",
      "#06989a",
      "#d3d7cf",
      "#555753",
      "#ef2929",
      "#8ae234",
      "#fce94f",
      "#729fcf",
      "#ad7fa8",
      "#34e2e2",
      "#eeeeec"
    ]
  }
}
```

Usernames and passwords can be plaintext or sha1 hashes.

### 256 colors

If ttyx fails to check your terminfo properly, you can force your `TERM`
to `xterm-256color` by setting `"termName": "xterm-256color"` in your config.

## Security

ttyx currently has https as an option. It also has express' default basic
auth middleware as an option, until it possibly gets something more robust.
It's ultimately up to you to make sure no one has access to your terminals
but you.

As an alternative approach (from tty.js), ttyx defaults to running a wrapper 
called ssh-localhost, that forces a user to login to the server. 

## CLI

- `ttyx-server.js --port 3000` - start and bind to port 3000.
- `ttyx-server.js --daemonize` - daemonize process.
- `ttyx-server.js --config ~/my-config.json` - specify config file.

## TERM

The goal of ttyx is to present a complete, usable application that fuses the 
excellent work of others: xterm.js, pty.js, socket.io, and Express.

## Portability

ttyx should ultimately be able to work on any unix that implements unix98
tty's and `forkpty(3)`. ttyx builds on linux and osx, and it *should* build
on NetBSD, FreeBSD, and OpenBSD as well. If you have trouble building, please
post an issue.

## Todo


## Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code
to be distributed under the MIT license. You are also implicitly verifying that
all code is your original work. `</legalese>`

## License

    Copyright (c) 2016-2019, Dan Risacher (MIT License)
    Copyright (c) 2012-2014, Christopher Jeffrey (MIT License)

[1]: http://invisible-island.net/xterm/ctlseqs/ctlseqs.html#Mouse%20Tracking
