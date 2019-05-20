/**
 * ttyx-client-single.js, Copyright (C) 2016-2019, Dan Risacher (MIT License)
 * based on tty.js, Copyright (c) 2012-2013, Christopher Jeffrey (MIT License)
 */

;(function() {

/**
 * Elements
 */

var document = this.document
    , window = this
    , root
    , body
    , h1
    , open
    , lights;

    Terminal.applyAddon(fit);
    
/**
 * Initial Document Title
 */

var initialTitle = document.title;

/**
 * Helpers
 */

function cancel(ev) {
  if (ev.preventDefault) ev.preventDefault();
  ev.returnValue = false;
  if (ev.stopPropagation) ev.stopPropagation();
  ev.cancelBubble = true;
  return false;
}

function inherits(child, parent) {
    function f() {
        this.constructor = child;
    }
    f.prototype = parent.prototype;
    child.prototype = new f;
}

function  on(el, type, handler, capture) {
    if (!Array.isArray(el)) {
        el = [el];
    }
    el.forEach(function (element) {
        element.addEventListener(type, handler, capture || false);
    });
}

function off(el, type, handler, capture) {
    el.removeEventListener(type, handler, capture || false);
}
    
/**
 * ttyx
 */

var ttyx = new EventEmitter;

/**
 * Shared
 */

ttyx.socket;
ttyx.terms;
ttyx.elements;
ttyx.sid = Math.random().toString(36).replace(/[^a-z]+/g, '')
  
/**
 * Open
 */

  ttyx.open = function() {
    if (document.location.pathname) {
      var parts = document.location.pathname.split('/')
      , base = parts.slice(0, parts.length - 1).join('/') + '/'
      , resource = base + 'socket.io';
      //FIXME - remove server name 
      ttyx.socket = io.connect(window.location.origin, { path: resource,
                                                         query: { tid: ttyx.sid} });
    } else {
      ttyx.socket = io.connect();
    }
    
    ttyx.terms = {};

    ttyx.elements = {
      root: document.documentElement,
      body: document.body,
      h1: document.getElementsByTagName('h1')[0],
      tc: document.getElementById('terminal-container'),
    };
    
    root = ttyx.elements.root;
    body = ttyx.elements.body;
    h1 = ttyx.elements.h1;
    tc = ttyx.elements.tc;
    
    ttyx.socket.on('connect', function() {
      console.log('tty connect');
      //ttyx.reset();
      ttyx.emit('connect');
      status('connected');
      if (! ttyx.term)  { 
        var term = ttyx.term = new Terminal();
        tc.innerHTML = "";
        term.open(tc);
        term.fit();
        term.focus();
//      ttyx.term.write("foo");

        term.on('resize', function (x) {
          ttyx.socket.emit('resize', ttyx.term.id, x.cols, x.rows);
          status('resize: ', x);
        });
        
        let self = ttyx.term;
        ttyx.socket.emit('create', self.cols, self.rows, function(err, data) {
          if (err) return self._destroy();
          self.pty = data.pty;
          self.id = data.id;
          ttyx.terms[self.id] = self;
          //self.setProcessName(data.process);
          self.on('data', function(data) {
            ttyx.socket.emit('data', self.id, data);
          });
          ttyx.emit('open tab', self);
          self.emit('open');
        });
      }
    });
    
    ttyx.socket.on('data', function(id, data) {
        //    console.log('tty data for term ', id);
        if (!ttyx.terms[id]) return;
        ttyx.terms[id].write(data);
    });
    
    // FIXME: consider removing this (socket.io v2 can reconnect?)
    ttyx.socket.on('kill', function(id) {
      if (!ttyx.term) return;
      ttyx.term._destroy();
      status('kill: ', id);

    });
    
    // XXX Clean this up.
    ttyx.socket.on('sync', function(terms) {
      console.log('Attempting to sync...');
      console.log(terms);
      status('sync: ', terms);

      // there was code here once - ressurect if needed.
      
    });

    ttyx.socket.on('reconnect', (num) => { status('reconnect: ', num); });
    ttyx.socket.on('disconnect', (reason) => { status('disconnect: ', reason); });
    
    on(window, 'resize', function() {
      if (ttyx.term) {
        ttyx.term.fit();
      }
    });
    
    ttyx.emit('load');
    ttyx.emit('open');
};

  function status (msg, obj) {
    var status = document.getElementById('status');
    
    if (status) {
      status.innerText = msg
        + (obj?JSON.stringify(obj):'')
        + " (" + window.ttyx.socket.io.engine.transports.join(', ') + ")";
      status.setAttribute('title', status.getAttribute('title')+msg+"\n");
    }
  }
                   
/**
 * Reset
 */

ttyx.reset = function() {

  ttyx.terms = {};

  ttyx.emit('reset');
};


/**
 * Helpers
 */

function indexOf(obj, el) {
  var i = obj.length;
  while (i--) {
    if (obj[i] === el) return i;
  }
  return -1;
}

function splice(obj, el) {
  var i = indexOf(obj, el);
  if (~i) obj.splice(i, 1);
}

function sanitize(text) {
  if (!text) return '';
  return (text + '').replace(/[&<>]/g, '')
}

/**
 * Load
 */

function load() {
  if (load.done) return;
  load.done = true;

  off(document, 'load', load);
  off(document, 'DOMContentLoaded', load);
  ttyx.open();
}

on(document, 'load', load);
on(document, 'DOMContentLoaded', load);
setTimeout(load, 200);

/**
 * Expose
 */

ttyx.Window = Window;
ttyx.Terminal = Terminal;

this.ttyx = ttyx;

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());
