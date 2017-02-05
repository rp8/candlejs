/** 
 * CandleJS
 * https://github.com/rp8/candlejs
 *
 * Copyright 2015 Ronggen Pan <rp8@competo.com>
 * Released under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Forked from below source.
 *
 * Copyright (c) 2012 Matthew Meyers hello@matthewmeye.rs
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy 
 * of this software and associated documentation files (the "Software"), to 
 * deal in the Software without restriction, including without limitation the 
 * rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included 
 * in all copies or substantial portions of the Software.
**/
(function(exports) {
  // LineReader
  // var lr = new LineReader();
  // lr.on('error', function(err) {...});
  // lr.on('end', function() {...});
  // lr.on('line', function(line, next) {... next();});
  // lr.read(file);
  //
  var LineReader = function(options) {
    if (!(this instanceof LineReader)) {
      return new LineReader(options);
    }

    var self = this;
    var p = this._p = {};

    p.reader = new FileReader();
    p.events = {};
    p.canRead = true;
    p.chunkSize = (options && options.chunkSize) ? options.chunkSize : 1024;

    p.reader.onload = function() {
      p.chunk += this.result;
      if(/\r|\n/.test(p.chunk)) {
        p.lines = p.chunk.match(/[^\r\n]+/g);
        if (self._hasMoreData()) {
          p.chunk = p.lines.pop();
        }
        self._step();
      }
      else {
        if (self._hasMoreData()) {
          return self.read();
        }
        if (p.chunk.length) {
          return self._emit('line', [
            p.chunk,
            self._emit.bind(self, 'end')
          ]);
        }
        self._emit('end');
      }
    };

    p.reader.onerror = function() {
      self._emit('error', [this.error]);
    };
  };

  LineReader.prototype.read = function(file) {
    var p = this._p;
    if (typeof file !== 'undefined') {
      p.file = file;
      p.fileLength = file.size;
      p.readPosition = 0;
      p.chunk = '';
      p.lines = [];
    }
    var blob = p.file.slice(p.readPosition, p.readPosition + p.chunkSize);
    p.readPosition += p.chunkSize;
    p.reader.readAsText(blob);
  };

  LineReader.prototype._hasMoreData = function () {
    var p = this._p;
    return p.readPosition <= p.fileLength;
  };

  LineReader.prototype.abort = function() {
    this._p.canRead = false;
  };

  LineReader.prototype.on = function(eventName, cb) {
    this._p.events[eventName] = cb;
  };

  LineReader.prototype._emit = function(eventName, args) {
    var boundEvents = this._p.events;
    if (typeof boundEvents[eventName] === 'function') {
      boundEvents[eventName].apply(this, args);
    }
  };

  LineReader.prototype._step = function() {
    var p = this._p;
    if (p.lines.length === 0) {
      if (this._hasMoreData()) {
        return this.read();
      }
      return this._emit('end');
    }
    if (p.canRead) {
      this._emit('line', [
        p.lines.shift(),
        this._step.bind(this)
      ]);
    }
    else {
      this._emit('end');
    }
  };

  exports.LineReader = LineReader;

})(typeof exports === 'undefined' ? this : exports);
