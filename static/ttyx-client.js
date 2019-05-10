/**
 * ttyx-client.js, Copyright (C) 2016-2019, Dan Risacher (MIT License)
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
  ttyx.windows;
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
      // do not call the sid 'sid', because socket.io uses that internally.
      ttyx.socket = io.connect(window.location.origin, { path: resource,
                                                         query: { tid: ttyx.sid } });
    } else {
      ttyx.socket = io.connect();
    }
    
    ttyx.windows = [];
    ttyx.terms = {};
    
    ttyx.elements = {
      root: document.documentElement,
      body: document.body,
      h1: document.getElementsByTagName('h1')[0],
      open: document.getElementById('open'),
      lights: document.getElementById('lights')
    };
    
    root = ttyx.elements.root;
    body = ttyx.elements.body;
    h1 = ttyx.elements.h1;
    open = ttyx.elements.open;
    lights = ttyx.elements.lights;
    
    if (open) {
      on(open, 'click', function() {
        new Window;
      });
    }
    
    if (lights) {
      on(lights, 'click', function() {
        ttyx.toggleLights();
      });
    }
    
    ttyx.socket.on('connect', function() {
      console.log('socket connect', this.id, ttyx.sid);
      // session id now passed in the handshake.
      //ttyx.socket.emit('session', ttyx.sid, this.id);
      //ttyx.reset(); 
      ttyx.emit('connect');
    });
    
    ttyx.socket.on('disconnect', function(reason) {
      console.log('socket disconnect', reason);
      ttyx.emit('disconnect');
    });
    
    ttyx.socket.on('reconnect', function(number) {
      console.log('socket reconnect', number, this.id, ttyx.sid);
      //this.emit('sync', ttyx.terms);
      ttyx.emit('reconnect');
      console.log('exit reconnect');
    });
    
    ttyx.socket.on('reconnect_attempt', function(num) {
      console.log('socket reconnect attempt ', num);
      ttyx.emit('reconnect_connect');
    });
    
    ttyx.socket.on('data', function(id, data) {
      //console.log('tty data for term ', id, " ", data);
      if (!ttyx.terms[id]) return;
      ttyx.terms[id].write(data);
    });
    
    // given that socket.io v2 can reconnect, maybe I should take this out?
    ttyx.socket.on('kill', function(id) {
      console.log('kill', id);
      if (!ttyx.terms[id]) return;
      ttyx.terms[id]._destroy();
    });
    
    // XXX Clean this up.
    ttyx.socket.on('sync', function(terms) {
      console.log('Attempting to sync...');
      console.log('terms', terms);

      // The original code below destroyed all the windows and
      // recreated them with data about the current terminals from the
      // server.  This didn't make sense - the server has no
      // information about the placement of tabs or windows, and that
      // issue was ignored.  The simpler thing to do is just do
      // nothing... if the session reconnects successfully, then the
      // open terms/tabs/windows are fine.  If we can't reconnect the
      // session, then it's all pointless anyway.

      // in the future, if this approach works, delete all the 'sync'
      // code from client and server.
      
      //ttyx.reset();
      if (0) {
      var emit = ttyx.socket.emit;
      ttyx.socket.emit = function() {};
      
      Object.keys(terms).forEach(function(key) {
        var data = terms[key]
        , win = new Window
        , tab = win.tabs[0];
        
        delete ttyx.terms[tab.id];
        tab.pty = data.pty;
        tab.id = data.id;
        ttyx.terms[data.id] = tab;
        win.resize(data.cols, data.rows);
        tab.setProcessName(data.process);
        ttyx.emit('open tab', tab);
        tab.emit('open');
      });
      
      ttyx.socket.emit = emit;
      console.log("end sync");
      }
    });
    
                   
    
    // We would need to poll the os on the serverside
    // anyway. there's really no clean way to do this.
    // This is just easier to do on the
    // clientside, rather than poll on the
    // server, and *then* send it to the client.
    setInterval(function() {
      var i = ttyx.windows.length;
      while (i--) {
        if (!ttyx.windows[i].focused) continue;
        ttyx.windows[i].focused.pollProcessName();
      }
    }, 2 * 1000);
    
    // Keep windows maximized.
    on(window, 'resize', function() {
      var i = ttyx.windows.length
      , win;
      
      while (i--) {
        win = ttyx.windows[i];
        if (win.minimize) {
          win.minimize();
          win.maximize();
        }
      }
    });
    
    ttyx.emit('load');
    ttyx.emit('open');
  };
  
  /**
   * Reset
   */
  
  ttyx.reset = function() {
    var i = ttyx.windows.length;
    while (i--) {
      ttyx.windows[i].destroy();
    }
    
    ttyx.windows = [];
    ttyx.terms = {};
    
    ttyx.emit('reset');
  };
  
  /**
   * Lights
   */
  
  ttyx.toggleLights = function() {
    root.className = !root.className
      ? 'dark'
      : '';
  };
  
  /**
   * Window
   */
  
  function Window(socket) {
    var self = this;
    
    EventEmitter.call(this);
    
    var el
    , tc
    , grip
    , bar
    , button
    , title;
    
    el = document.createElement('div');
    el.className = 'window';
    
    grip = document.createElement('div');
    grip.className = 'grip';
    
    bar = document.createElement('div');
    bar.className = 'bar';
    
    button = document.createElement('div');
    button.innerHTML = '~';
    button.title = 'new/close';
    button.className = 'tab';
    
    title = document.createElement('div');
    title.className = 'title';
    title.innerHTML = '';
    
    tc = document.createElement('div');
    tc.className = 'terminal-container';
    
    this.socket = socket || ttyx.socket;
    this.element = el;
    this.grip = grip;
    this.bar = bar;
    this.button = button;
    this.title = title;
    this.tc = tc;
    this.tabs = [];
    this.focused = null;
    
    this.cols = Terminal.geometry[0];
    this.rows = Terminal.geometry[1];
    
    el.appendChild(grip);
    el.appendChild(bar);
    el.appendChild(tc);
    bar.appendChild(button);
    bar.appendChild(title);
    body.appendChild(el);
    
    ttyx.windows.push(this);
    
    this.createTab();
    self.focus();
    this.bind();
    //this use to be 'once' not 'on'
    this.tabs[0].on('open', function() {
      ttyx.emit('open window', self);
      self.emit('open');
    });
  }
  
  inherits(Window, EventEmitter);
  
  Window.prototype.bind = function() {
    var self = this
    , el = this.element
    , bar = this.bar
    , grip = this.grip
    , button = this.button
    , tc = this.tc
    , last = 0;
    
    on(button, 'click', function(ev) {
      if (ev.ctrlKey || ev.altKey || ev.metaKey || ev.shiftKey) {
        self.destroy();
      } else {
        self.createTab();
      }
      return cancel(ev);
    });
    
    on(grip, 'mousedown', function(ev) {
      self.focus();
      self.resizing(ev);
      return cancel(ev);
    });
    
    on(el, 'mousedown', function(ev) {
      if (ev.target !== el && ev.target !== bar) return;
      
      self.focus();
      
      cancel(ev);
      
      if (new Date - last < 600) {
        return self.maximize();
      }
      last = new Date;
      
      self.drag(ev);
      
      return cancel(ev);
    });
  };
  
  Window.prototype.focus = function() {
    // Restack
    var parent = this.element.parentNode;
    if (parent) {
      parent.removeChild(this.element);
      parent.appendChild(this.element);
    }
    
    // Focus Foreground Tab
    this.focused.focus();
    
    ttyx.emit('focus window', this);
    this.emit('focus');
  };
  
  Window.prototype.destroy = function() {
    if (this.destroyed) return;
    this.destroyed = true;
    
    if (this.minimize) this.minimize();
    
    splice(ttyx.windows, this);
    if (ttyx.windows.length) ttyx.windows[0].focus();
    
    this.element.parentNode.removeChild(this.element);
    
    this.each(function(term) {
      term.destroy();
    });
    
    ttyx.emit('close window', this);
    this.emit('close');
  };
  
  Window.prototype.drag = function(ev) {
    var self = this
    , el = this.element;
    
    if (this.minimize) return;
    
    var drag = {
      left: el.offsetLeft,
      top: el.offsetTop,
      pageX: ev.pageX,
      pageY: ev.pageY
    };
    
    el.style.opacity = '0.60';
    el.style.cursor = 'move';
    root.style.cursor = 'move';
    
    function move(ev) {
      el.style.left =
        (drag.left + ev.pageX - drag.pageX) + 'px';
      el.style.top =
        (drag.top + ev.pageY - drag.pageY) + 'px';
    }
    
    function up() {
      el.style.opacity = '';
      el.style.cursor = '';
      root.style.cursor = '';
      
      off(document, 'mousemove', move);
      off(document, 'mouseup', up);
      
      var ev = {
        left: el.style.left.replace(/\w+/g, ''),
        top: el.style.top.replace(/\w+/g, '')
      };
      
      ttyx.emit('drag window', self, ev);
      self.emit('drag', ev);
    }
    
    on(document, 'mousemove', move);
    on(document, 'mouseup', up);
  };
  
  Window.prototype.resizing = function(ev) {
    var self = this
    , el = this.element
    , term = this.focused;
    
    if (this.minimize) delete this.minimize;
    
    var resize = {
      w: el.clientWidth,
      h: el.clientHeight
    };
    
    el.style.overflow = 'hidden';
    el.style.opacity = '0.70';
    el.style.cursor = 'se-resize';
    root.style.cursor = 'se-resize';
    term.element.style.height = '100%';
    
    function move(ev) {
      var x, y;
      y = el.offsetHeight - term.element.clientHeight;
      x = ev.pageX - el.offsetLeft;
      y = (ev.pageY - el.offsetTop) - y;
      el.style.width = x + 'px';
      el.style.height = y + 'px';
    }
    
    function up() {
      var x, y;
      
      x = el.clientWidth / resize.w;
      y = el.clientHeight / resize.h;
      x = (x * term.cols) | 0;
      y = (y * term.rows) | 0;
      
      self.resize(x, y);
      
      // leave it for the fit addon
      //el.style.width = '';
      //el.style.height = '';
      
      el.style.overflow = '';
      el.style.opacity = '';
      el.style.cursor = '';
      root.style.cursor = '';
      term.element.style.height = '';
      
      off(document, 'mousemove', move);
      off(document, 'mouseup', up);
    }
    
    on(document, 'mousemove', move);
    on(document, 'mouseup', up);
  };
  
  Window.prototype.maximize = function() {
    if (this.minimize) return this.minimize();
    
    var self = this
    , el = this.element
    , term = this.focused
    , x
    , y;
    
    var m = {
      cols: term.cols,
      rows: term.rows,
      left: el.offsetLeft,
      top: el.offsetTop,
      root: root.className
    };
    
    this.minimize = function() {
      delete this.minimize;
      
      el.style.left = m.left + 'px';
      el.style.top = m.top + 'px';
      el.style.width = '';
      el.style.height = '';
      term.element.style.width = '';
      term.element.style.height = '';
      el.style.boxSizing = '';
      self.grip.style.display = '';
      root.className = m.root;
      
      self.resize(m.cols, m.rows);
      
      ttyx.emit('minimize window', self);
      self.emit('minimize');
    };
    
    window.scrollTo(0, 0);
    
    x = root.clientWidth / term.element.offsetWidth;
    y = root.clientHeight / term.element.offsetHeight;
    x = (x * term.cols) | 0;
    y = (y * term.rows) | 0;
    
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.width = '100%';
    el.style.height = '100%';
    term.element.style.width = '99%';
    term.element.style.height = '99%';
    el.style.boxSizing = 'border-box';
    this.grip.style.display = 'none';
    root.className = 'maximized';
    
    this.resize(x-1, y-1);
    
    ttyx.emit('maximize window', this);
    this.emit('maximize');
  };
  
  Window.prototype.resize = function(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    console.log('resize', cols, rows);
    
    this.each(function(tab) {
      tab.resize(cols, rows);
      tab.fit();
    });
    
    ttyx.emit('resize window', this, cols, rows);
    this.emit('resize', cols, rows);
  };
  
  Window.prototype.each = function(func) {
    var i = this.tabs.length;
    while (i--) {
      func(this.tabs[i], i);
    }
  };
  
  Window.prototype.createTab = function() {
    var tab =  new Tab(this, this.socket);
    tab.focus();
    tab.fit();  // does this work?
    return tab;
  };
  
  Window.prototype.highlight = function() {
    var self = this;
    
    this.element.style.borderColor = 'orange';
    setTimeout(function() {
      self.element.style.borderColor = '';
    }, 200);
    
    this.focus();
  };
  
  Window.prototype.focusTab = function(next) {
    var tabs = this.tabs
    , i = indexOf(tabs, this.focused)
    , l = tabs.length;
    
    if (!next) {
      if (tabs[--i]) return tabs[i].focus();
      if (tabs[--l]) return tabs[l].focus();
    } else {
      if (tabs[++i]) return tabs[i].focus();
      if (tabs[0]) return tabs[0].focus();
    }
    
    return this.focused && this.focused.focus();
  };
  
  Window.prototype.nextTab = function() {
    return this.focusTab(true);
  };
  
  Window.prototype.previousTab = function() {
    return this.focusTab(false);
  };
  
  /**
   * Tab
   */
  
  function Tab(win, socket) {
    var self = this;
    
    var cols = win.cols
    , rows = win.rows;
    
    Terminal.call(this, {
        rendererType: 'dom',
        cols: cols,
        rows: rows,
        fontSize: Terminal.fontSize,
        fontFamily: Terminal.fontFamily
    });
    
    var button = document.createElement('div');
    button.className = 'tab';
    button.innerHTML = '\u2022';
    win.bar.appendChild(button);
    
    on(button, 'click', function(ev) {
      if (ev.ctrlKey || ev.altKey || ev.metaKey || ev.shiftKey) {
        self.destroy();
      } else {
        self.focus();
      }
      return cancel(ev);
    });
    
    this.id = '';
    this.socket = socket || ttyx.socket;
    this.window = win;
    this.button = button;
    this.element = null;
    this.process = '';
    //this.term = term; // Commit to Tab inherits Terminal
    this.open(win.tc);
    this.hookKeys();
    this.on('data', (data) => { this.socket.emit('data', this.id, data); });
    this.on('title', (title) => { this._handleTitle(title); }); 
    
    win.tabs.push(this);

    this.socket.emit('create', cols, rows, function(err, data) {
      if (err) return self._destroy();
      self.pty = data.pty;
      self.id = data.id;
      ttyx.terms[self.id] = self;
      self.setProcessName(data.process);
      ttyx.emit('open tab', self);
      self.emit('open');
    });
  };
  
  inherits(Tab, Terminal);
  
  Tab.prototype._handleTitle = function(title) {
    if (!title) return;
    
    title = sanitize(title);
    this.title = title;
    
    if (Terminal.focus === this) {
      document.title = title;
      // if (h1) h1.innerHTML = title;
    }
    
    if (this.window.focused === this) {
      this.window.bar.title = title;
      // this.setProcessName(this.process);
    }
  };
  
  Tab.prototype._write = Tab.prototype.write;
  
  Tab.prototype.write = function(data) {
    if (this.window.focused !== this) this.button.style.color = 'red';
    return this._write(data);
  };
  
  Tab.prototype._focus = Tab.prototype.focus;
  
  Tab.prototype.focus = function() {
    //    if (Terminal.focus === this) return;
    
    var win = this.window;
    
    // focused is the focused Tab within the Window
    // maybe move to Tab.prototype.switch
    if (win.focused !== this) {
      if (win.focused) {
        if (win.focused.element.parentNode) {
          win.focused.element.parentNode.removeChild(win.focused.element);
        }
        win.focused.button.style.fontWeight = '';
      }
      
      win.tc.appendChild(this.element);
      win.focused = this;
      
      win.title.innerHTML = this.process;
      document.title = this.title || initialTitle;
      this.button.style.fontWeight = 'bold';
      this.button.style.color = '';
    }
    
    this._handleTitle(this.title);
    
    this._focus();
    
    //  win.focus();
    
    ttyx.emit('focus tab', this);
    this.emit('focus');
  };
  
  Tab.prototype._resize = Tab.prototype.resize;
  
  Tab.prototype.resize = function(cols, rows) {
    this.socket.emit('resize', this.id, cols, rows);
    this._resize(cols, rows);
    ttyx.emit('resize tab', this, cols, rows);
    this.emit('resize', cols, rows);
  };
  
  Tab.prototype.__destroy = Tab.prototype.destroy;
  
  Tab.prototype._destroy = function() {
    if (this.destroyed) return;
    this.destroyed = true;
    
    var win = this.window;
    
    this.button.parentNode.removeChild(this.button);
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    if (ttyx.terms[this.id]) delete ttyx.terms[this.id];
    splice(win.tabs, this);
    
    if (win.focused === this) {
      win.previousTab();
    }
    
    if (!win.tabs.length) {
      win.destroy();
    }
    
    // if (!ttyx.windows.length) {
    //   document.title = initialTitle;
    //   if (h1) h1.innerHTML = initialTitle;
    // }
    
    this.__destroy();
  };
  
  Tab.prototype.destroy = function() {
    if (this.destroyed) return;
    console.log("emiting kill from within Tab.destroy");
    this.socket.emit('kill', this.id);
    this._destroy();
    ttyx.emit('close tab', this);
    this.emit('close');
  };
  
  Tab.prototype.hookKeys = function() {
    var self = this;
    
    // Alt-[jk] to quickly swap between windows.
    this.on('key', function(key, ev) {
      // console.log('key event: ', key);
      if (Terminal.focusKeys === false) {
        return;
      }
      
      var offset
      , i;
      
      if (key === '\x1bj') {
        offset = -1;
      } else if (key === '\x1bk') {
        offset = +1;
      } else {
        return;
      }
      
      i = indexOf(ttyx.windows, this.window) + offset;

      self._ignoreNext();
      
      if (ttyx.windows[i]) return ttyx.windows[i].highlight();
      
      if (offset > 0) {
        if (ttyx.windows[0]) return ttyx.windows[0].highlight();
      } else {
        i = ttyx.windows.length - 1;
        if (ttyx.windows[i]) return ttyx.windows[i].highlight();
      }
      
      return this.window.highlight();
    });
    
    this.on('request paste', function(key) {
      this.socket.emit('request paste', function(err, text) {
        if (err) return;
        self.send(text);
      });
    });
    
    this.on('request create', function() {
      this.window.createTab();
    });
    
    this.on('request term', function(key) {
      if (this.window.tabs[key]) {
        this.window.tabs[key].focus();
      }
    });
    
    this.on('request term next', function(key) {
      this.window.nextTab();
    });
    
    this.on('request term previous', function(key) {
      this.window.previousTab();
    });
  };
  
  Tab.prototype._ignoreNext = function() {
    // Don't send the next key.
    var handler = this.handler;
    this.handler = function() {
      this.handler = handler;
    };
    var showCursor = this.showCursor;
    this.showCursor = function() {
      this.showCursor = showCursor;
    };
  };
  
  /**
   * Program-specific Features
   */
  
  Tab.scrollable = {
    irssi: true,
    man: true,
    less: true,
    htop: true,
    top: true,
    w3m: true,
    lynx: true,
    mocp: true
  };
  
  Tab.prototype._bindMouse = Tab.prototype.bindMouse;
  
  Tab.prototype.bindMouse = function() {
    if (!Terminal.programFeatures) return this._bindMouse();
    
    var self = this;
    
    var wheelEvent = 'onmousewheel' in window
        ? 'mousewheel'
        : 'DOMMouseScroll';
    
    on(self.element, wheelEvent, function(ev) {
      if (self.mouseEvents) return;
      if (!Tab.scrollable[self.process]) return;
      
      if ((ev.type === 'mousewheel' && ev.wheelDeltaY > 0)
          || (ev.type === 'DOMMouseScroll' && ev.detail < 0)) {
        // page up
        self.keyDown({keyCode: 33});
      } else {
        // page down
        self.keyDown({keyCode: 34});
      }
      
      return cancel(ev);
    });
    
    return this._bindMouse();
  };
  
  Tab.prototype.pollProcessName = function(func) {
    var self = this;
    this.socket.emit('process', this.id, function(err, name) {
      if (err) return func && func(err);
      self.setProcessName(name);
      return func && func(null, name);
    });
  };
  
  Tab.prototype.setProcessName = function(name) {
    name = sanitize(name);
    
    if (this.process !== name) {
      this.emit('process', name);
    }
    
    this.process = name;
    this.button.title = name;
    
    if (this.window.focused === this) {
      // if (this.title) {
      //   name += ' (' + this.title + ')';
      // }
      this.window.title.innerHTML = name;
    }
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
  ttyx.Tab = Tab;
  ttyx.Terminal = Terminal;
  
  this.ttyx = ttyx;
  
}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());
