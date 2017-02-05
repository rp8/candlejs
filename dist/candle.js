require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/** 
 * CandleJS
 * https://github.com/rp8/candlejs
 *
 * Copyright 2015 Ronggen Pan <rp8@competo.com>
 * Released under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 *
**/
(function(exports) {
  'use strict';

  /**
   * represents a bar
   * @interval: ms 
   * @data: optional
   *   tuple [openTime, price, volume]
   *     or 
   *   {openTime, open, high, low, close, volume}
   *
   *   all floats except time being integer in ms
  **/
  var Bar = function(interval, data) {
    this.interval = interval;
    this.openTime = this.closeTime = Number.NaN;
    this.open = this.close = this.high = this.low = Number.NaN;
    this.volume = Number.NaN;
    if (Array.isArray(data)) {
      this.add(data);
    }
    else if (data) {
      this.openTime = data.openTime;
      this.closeTime = data.openTime + interval;
      this.open = data.open;
      this.close = data.close;
      this.high = data.high;
      this.low = data.low;
      this.volume = data.volume;
    }
  };
  
  /**
   * adds a tick.
   * @tick: tuple [time, price, volume]
   *        time - integer in ms
   *        price - float
   *        volume - float
   * @return: true if the tick is in the bar
  **/
  Bar.prototype.add = function(tick) {
    if (tick) {
      var t = tick[0], p = tick[1], v = tick[2];

      if (isNaN(this.openTime)) {
        this.openTime = t;
        this.closeTime = t + this.interval;
        this.open = this.close = this.high = this.low = p;
        this.volume = v;

        return true;
      }

      if (t > this.openTime && t <= this.closeTime) {
        this.volume += v;

        if (this.high < p) {
          this.high = p;
        }
        else if (this.low > p) {
          this.low = p;
        }
        this.close = p;

        return true;
      }
      else {
        return false;
      }
    }

    return false;
  };

  /**
   * defines a series of bars.
   * @symbol: string
   * @interval: integer in ms
   * @ticks: TickSeries
  **/
  var Bars = function(symbol, interval, ticks) {
    this.symbol = symbol;
    this.interval = interval;
    this.data = [];
    this.subscribers = {};
    this.openTime = this.closeTime = Number.NaN;
    this.open = this.close = this.high = this.low = Number.NaN;
    this.volumeLow = this.volumeHigh = Number.NaN;

    this.addTicks(ticks);

    // adds a new bar and updates the stats
    this.addBar = function(bar) {
      if (isNaN(this.openTime)) {
        this.openTime = bar.openTime;
        this.closeTime = bar.openTime + this.interval;
        this.open = bar.open;
        this.close = bar.close;
        this.high = bar.high;
        this.low = bar.low;
        this.volumeLow = bar.volume;
        this.volumeHigh = bar.volume;
      }
      else {
        this.closeTime = Math.max(this.closeTime, bar.closeTime);
        this.high = Math.max(this.high, bar.high);
        this.low = Math.min(this.low, bar.low);
        this.close = bar.close;        
        this.volumeLow = Math.min(this.volumeLow, bar.volume);
        this.volumeHigh = Math.max(this.volumeHigh, bar.volume);
      }
      this.data.push(bar);
    };
  };

  /**
   * finds a bar by time.
   * @targetTime {Number} time in ms
  **/
  Bars.prototype.find = function(targetTime) {
    var lowIndex = 0, highIndex = this.data.length - 1;
    while (lowIndex <= highIndex) {
      var mid = Math.floor((lowIndex + highIndex) / 2);
      var time = this.data[mid].openTime;
      if (time === targetTime) {
        return mid;
      }
      else {
        if (time < targetTime) {
          lowIndex = mid + 1;
        }
        else {
          highIndex = mid - 1;
        }
      }
    }
    return lowIndex;
  };

  /**
   * clears the data and emits 'changed'.
  **/
  Bars.prototype.clear = function() {
    this.data = [];
    this.openTime = this.closeTime = Number.NaN;
    this.open = this.close = this.high = this.low = Number.NaN;
    this.volumeLow = this.volumeHigh = Number.NaN;
    this.notify('changed');
  };

  /**
   * adds a new bar and emits 'changed'.
   * @openTime: integer in ms
   * @open: float
   * @high: float
   * @low: float
   * @close: float
   * @volume: float
  **/
  Bars.prototype.add = function(openTime, open, high, low, close, volume) {
    var bar = new Bar(this.interval, {
      openTime: openTime,
      open: open,
      high: high,
      low: low,
      close: close,
      volume: volume
    });
    this.addBar(bar);
    this.notify('changed');
  };

  /**
   * adds a Tick and emits 'changed'.
   * @tick: Tick
  **/
  Bars.prototype.addTick = function(tick) {
    if (!tick) {
      return;
    }

    var bar;
    
    if (this.data.length === 0) {
      bar = new Bar(this.interval, tick);
      this.addBar(bar);
    }
    else {
      bar = this.data[this.data.length - 1];

      if (bar.add(tick)) {
        this.openTime = Math.min(this.openTime, bar.openTime);
        this.closeTime = Math.max(this.closeTime, bar.closeTime);
        this.high = Math.max(this.high, bar.high);
        this.low = Math.min(this.low, bar.low);
        this.close = bar.close;
        this.volumeLow = Math.min(this.volumeLow, bar.volume);
        this.volumeHigh = Math.max(this.volumeHigh, bar.volume);
      }
      else {
        bar = new Bar(this.interval, tick);
        this.addBar(bar);
      }
    }

    this.notify('changed');
  };

  /**
   * adds a TickSeries, converts them into bars and emits 'changed'.
   * @ticks: TickSeries
  **/
  Bars.prototype.addTicks = function(ticks) {
    if (!ticks) {
      return;
    }

    if (ticks.data.length > 0) {
      for (var i = 1; i < ticks.data.length; i++) {
        this.addTick(ticks.data[i]);
      }
    }
  };

  /**
   * adds a listener on an event.
  **/
  Bars.prototype.on = function(eventName, cb) {
    var list = this.subscribers[eventName];
    if (list && list.indexOf(cb) === 0) {
      list.push(cb);
    }
    else {
      this.subscribers[eventName] = [cb];
    }
  };

  /**
   * notifies the subscribers on an event.
  **/
  Bars.prototype.notify = function(eventName) {
    var list = this.subscribers[eventName];
    if (list) {
      list.forEach(function(cb) { cb(); });
    }
  };

  exports.Bar = Bar;
  exports.Bars = Bars;

})(typeof exports === 'undefined' ? this : exports);


},{}],2:[function(require,module,exports){
/** 
 * CandleJS
 * https://github.com/rp8/candlejs
 *
 * Copyright 2015 Ronggen Pan <rp8@competo.com>
 * Released under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 *
**/
(function (exports) {
  'use strict';

  var extend = function() {
    for (var i = 1; i < arguments.length; i++) {
      for (var key in arguments[i]) {
        if (arguments[i].hasOwnProperty(key)) {
          arguments[0][key] = arguments[i][key];
        }
      }
    }
    return arguments[0];
  };

  var isOdd = function (n) {
    return n % 2 !== 0;
  };

  var toLocaleDateString = function(t) {
    return new Date(t).toLocaleDateString();
  };

  /**
   * represents a slider.
   * @canvas {HTML Canvas}
   * @rect {x, y, width, height} - the slider rect
  **/
  var Slider = function(canvas, rect) {
    this.canvas = canvas;
    this.rect = rect;
    this.markers = [
      { x: rect.x, y: rect.y, width: 5, height: rect.height },
      { x: rect.x + rect.width, y: rect.y, width: 5, height: rect.height },
    ];
    this.listeners = {};
    this.dragging = false;
    this.mouseX = Number.NaN;
    this.mouseY = Number.NaN;
    this.offsetX = Number.NaN;
    this.offsetY = Number.NaN;
    this.dragIndex = Number.NaN;
    this.range = { start: 0, end: 100 };

    var self = this;

    /**
     * handles the blury line.
     * @v {Number}
    **/
    this.sharpen = function(v) {
      if (isOdd(this.canvas.lineWidth)) {
        return v + 0.5;
      }
      else {
        return v;
      }
    };

    /**
     * handles the mouse down event.
     * @e {MouseEvent}
    **/
    this.onMouseDown = function(e) {
      if (self.dragging) {
        return false;
      }
      self.mouseX = e.clientX - self.canvas.offsetLeft;
      for (var i = 0; i < self.markers.length; i++) {
        var s = self.markers[i];
        if (self.hitTest(s, self.mouseX, self.mouseY)) {
          self.dragging = true;
          self.offsetX = self.mouseX - s.x;
          self.dragIndex = i;
        }
      }
      if (e.preventDefault) {
        e.preventDefault();
      }
      return false;
    };

    /**
     * handles the mouse up event.
    **/
    this.onMouseUp = function() {
      self.dragging = false;
      self.canvas.style.cursor = 'default';
      self.range.start = self.markers[0].x / self.rect.width * 100;
      self.range.end = self.markers[1].x / self.rect.width * 100;
      self.notify('changed');
    };

    /**
     * handles the mouse move event.
     * @e {MouseEvent}
    **/
    this.onMouseMove = function(e) {
      if (!self.dragging) {
        self.mouseX = e.clientX - self.canvas.offsetLeft;
        for (var i = 0; i < self.markers.length; i++) {
          var s = self.markers[i];
          if (self.hitTest(s, self.mouseX, self.mouseY)) {
            self.canvas.style.cursor = 'ew-resize';
            break;
          }
          else {
            self.canvas.style.cursor = 'default';
          }
        }
        return;
      }
      var x, marker = self.markers[self.dragIndex];
      var minX = self.rect.x;
      var maxX = minX + self.rect.width - 5;
      if (self.dragIndex === 0) {
        maxX = self.markers[1].x - 5;
      }
      else {
        minX = self.markers[0].x + 5;
      }
      self.mouseX = e.clientX - self.canvas.offsetLeft;
      x = self.mouseX - self.offsetX;
      x = (x < minX) ? minX : ((x > maxX) ? maxX : x);
      marker.x = x;
      self.notify('render');
    };
    canvas.addEventListener('mousedown', this.onMouseDown, false);
    canvas.addEventListener('mousemove', this.onMouseMove, false);
    canvas.addEventListener('mouseup', this.onMouseUp, false);
  };

  /**
   * returns true if the mouse is within the target bounding rect.
   * @target {Rect}
  **/
  Slider.prototype.hitTest = function(target, mx) {
    var r = mx >= target.x && mx <= target.x + target.width;
    //console.log('mx='+mx+',x='+target.x+',hitTest='+r);
    return r;
  };

  /**
   * sets the range.
   * @start {Number} 0 - 100
   * @end {Number} 0 - 100
  **/
  Slider.prototype.setDisplayRange = function(start, end) {
    this.range.start = start;
    this.markers[0].x = Math.round(this.rect.x +
      this.rect.width * start / 100);
    this.range.end = end;
    this.markers[1].x = Math.round(this.rect.x +
      this.rect.width * end / 100);
  };

  /**
   * renders the slider.
  **/
  Slider.prototype.render = function() {
    var ctx = this.canvas.getContext('2d');
    //ctx.clearRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);
    //ctx.fillStyle = '#eeeeee';
    //ctx.fillRect(this.sharpen(this.rect.x), this.sharpen(this.rect.y),
    //             this.rect.width, this.rect.height);
    ctx.strokeStyle = '#000000';
    //ctx.strokeRect(this.sharpen(this.rect.x), this.sharpen(this.rect.y),
    //               this.rect.width, this.rect.height);
    ctx.fillStyle = '#00ff00';
    for (var i = 0; i < this.markers.length; i++) {
      var s = this.markers[i];
      ctx.fillRect(s.x, s.y, s.width, s.height);
    }
  };

  /**
   * adds a listener on an event.
  **/
  Slider.prototype.on = function(eventName, cb) {
    var list = this.listeners[eventName];
    if (list && list.indexOf(cb) === 0) {
      list.push(cb);
    }
    else {
      this.listeners[eventName] = [cb];
    }
  };

  /**
   * notifies the listeners on an event.
  **/
  Slider.prototype.notify = function(eventName) {
    var list = this.listeners[eventName];
    if (list) {
      list.forEach(function (cb) { cb(); });
    }
  };

  /**
   * represents a candlestick chart.
   * @options {} optional
  **/
  var CandleChart = function(options) {
    var self = this;
    this.data = [];
    this.options = extend({}, CandleChart.defaultOptions, options);

    var p = this._p = {};
    p.xMin = p.xMax = Number.NaN;
    p.openTime = p.closeTime = Number.NaN;
    p.y3Max = function() { return self.canvas.height; };
    p.y3Min = function() {
      return Math.round(self.canvas.height * (1 - self.options.sliderScale));
    };
    p.y2Max = function() {
      return p.y3Min();
    };
    p.y2Min = function() {
      return p.y2Max() - Math.round(self.canvas.height * self.options.volumeScale);
    };
    p.y1Max = function() { return p.y2Min(); };
    p.y1Min = function() { return 0; };

    // time axis conversion to pixel
    this.xToPixel = function(x) {
      var p = self._p;
      return Math.round(p.xMin + (x - p.openTime) / self.options.interval * (self.options.candleWidth + 4));
    };

    // main section converison to pixel
    this.y1ToPixel = function(y) {
      var bars = self.data[0];
      var p = self._p;
      if (bars.high === bars.low) {
        return Math.round((p.y1Max() - p.y1Min()) / 2);
      }
      else {
        return Math.round(p.y1Max() + (bars.low - y) *
          (p.y1Max() - p.y1Min()) / (bars.high - bars.low));
      }
    };

    // volume section conversion to pixel
    this.y2ToPixel = function(v) {
      var bars = self.data[0];
      var p = self._p;
      if (bars.volumeHigh === bars.volumeLow) {
        return Math.round(p.y2Max() + (p.y2Max() - p.y2Min()) / 2);
      }
      else {
        return Math.round(p.y2Max() + (bars.volumeLow - v) *
          (p.y2Max() - p.y2Min()) / (bars.volumeHigh - bars.volumeLow));
      }
    };

    // handles the blury line
    this.sharpen = function(v) {
      if (isOdd(self.canvas.lineWidth)) {
        return v + 0.5;
      }
      else {
        return v;
      }
    };
  };

  /**
   * default chart options.
  **/
  CandleChart.defaultOptions = {
    interval: 2 * 60 * 1000,
    upCandleFillStyle: '#00ff00',
    downCandleFillStyle: '#ff0000',
    candleWidth: 4,
    drawCandleLine: true,
    strokeStyle: '#000000',
    textStyle: '#000000',
    textFont: '10px serif',
    lineWidth: 1,
    autoScale: false,
    preserveEmptySpaceRatio: 0.10,
    useSlider: false,
    volumeScale: 0.1,
    sliderScale: 0.1,
    markerWidth: 5,
    markers: 10,

  };

  /**
   * outputs to the canvas.
   * @canvas {HTML5 Canvas}
  **/
  CandleChart.prototype.outputTo = function(canvas) {
    var p = this._p;
    var self = this;
    var bars = self.data[0];

    p.xMin = 0;
    p.xMax = canvas.width * (1.0 - this.options.preserveEmptySpaceRatio);

    this.canvas = canvas;
    this.canvas.lineWidth = this.options.lineWidth;

    if (this.options.useSlider) {
      var sliderRect = {
        x: p.xMin, y: p.y3Min(),
        width: this.canvas.width - 10, height: p.y3Max() - p.y3Min()
      };
      this.slider = new Slider(canvas, sliderRect);
      this.slider.on('render', function () {
        self.render();
      });
      this.slider.on('changed', function () {
        var openTime = bars.openTime + self.slider.range.start * (bars.closeTime - bars.openTime) / 100;
        var closeTime = bars.openTime + self.slider.range.end * (bars.closeTime - bars.openTime) / 100;
        self.setDisplayRange(openTime, closeTime);
        self.render();
      });
    }
  };

  /**
   * sets the display time range, used when there're more bars
   * that can be displayed.
   *
   * @openTime {Number} time in ms
   * @closeTime {Number} time in ms 
  **/
  CandleChart.prototype.setDisplayRange = function(openTime, closeTime) {
    var p = this._p;

    console.log('open = ' + toLocaleDateString(openTime) + ', end = ' + toLocaleDateString(closeTime));
 
    p.openTime = openTime;
    p.closeTime = closeTime;

    var n = Math.round(p.xMax / (this.options.candleWidth + 4));
    var st = closeTime - n * this.options.interval;
    if (p.openTime < st) {
      p.openTime = st;
    }

    console.log('min open = ' + toLocaleDateString(st) + ', actual open = ' + toLocaleDateString(p.closeTime));
  };

  /**
   * adds a time series such as Bars.
   * @series {Bars}
  **/
  CandleChart.prototype.addSeries = function(series) {
    var p = this._p;
    var that = this;

    this.data.push(series);
    this.options.interval = series.interval;
    series.on('changed', function () {
      if (isNaN(p.openTime)) {
        p.openTime = series.openTime;
      }

      p.closeTime = series.closeTime;
      
      var x = that.xToPixel(p.closeTime);
      if (that.canvas && x >= that.canvas.width) {
        // right shift an interval in display
        that.setDisplayRange(p.openTime + series.interval, p.closeTime + series.interval);
        that.render();
      }
      else if (that.canvas) {
        that.render();
      }
    });

    if (!isNaN(series.openTime)) {
      console.log('open = ' + toLocaleDateString(series.openTime) + ', end = ' + toLocaleDateString(series.closeTime));

      p.openTime = series.openTime;
      p.closeTime = series.closeTime;

      this.setDisplayRange(p.openTime, p.closeTime);
    }
  };

  /**
   * renders the chart on the canvas.
  **/
  CandleChart.prototype.render = function() {
    if (this.data.length === 0 || !this.canvas) {
      return;
    }

    var ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.beginPath();
    ctx.rect(0, 0, this.canvas.width, this.canvas.height);
    ctx.clip();

    ctx.strokeStyle = this.options.strokeStyle;
    ctx.lineWidth = this.options.lineWidth;

    ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawAxes();
    this.drawCandles();
    this.drawStatus();

    if (this.slider && this.options.useSlider) {
      this.slider.render();
    } 
  };

  // TODO: need to handle gaps in time axis
  CandleChart.prototype.drawAxes = function() {
    var ctx = this.canvas.getContext('2d');
    var p = this._p;
    var x, y, n = this.options.markers,
      xUnit = Math.round(this.canvas.width / n),
      yUnit = Math.round((p.y1Max() - p.y1Min()) / n);

    // draw x-axis
    ctx.beginPath();
    x = this.canvas.width;
    y = this.sharpen(p.y2Min());
    ctx.moveTo(0, y);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.stroke();

    // draw x-axis markers
    y = p.y1Max();
    for (var i = 1; i < n; i++) {
      x = this.sharpen(p.xMin + i * xUnit);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - this.options.markerWidth);
      ctx.closePath();
      ctx.stroke();
    }

    // draw left y-axis markers
    for (var j = 1; j < n; j++) {
      y = this.sharpen(p.y1Min() + j * yUnit);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.options.markerWidth, y);
      ctx.closePath();
      ctx.stroke();
    }

    // draw right y-axis markers
    for (var k = 1; k < n; k++) {
      y = this.sharpen(p.y1Min() + k * yUnit);
      ctx.beginPath();
      ctx.moveTo(this.canvas.width, y);
      ctx.lineTo(this.canvas.width - this.options.markerWidth, y);
      ctx.closePath();
      ctx.stroke();
    }
  };

  /**
   * draws a candle for each bar.
  **/
  CandleChart.prototype.drawCandles = function() {
    var ctx = this.canvas.getContext('2d');
    var bars = this.data[0];
    var p = this._p;

    var open = bars.find(p.openTime);
    var close = bars.find(p.closeTime);
    for (var i = open; i < close; i++) {
      var bar = bars.data[i];
      var h = this.y1ToPixel(bar.high),
        l = this.y1ToPixel(bar.low),
        o = this.y1ToPixel(bar.open),
        c = this.y1ToPixel(bar.close),
        v = this.y2ToPixel(bar.volume),
        t = this.xToPixel((bar.openTime + bar.closeTime) / 2);
      ctx.lineWidth = this.options.lineWidth;
      var w = this.options.candleWidth;
      var hw = w / 2;
      t = this.sharpen(t);

      // down candle
      if (bar.open > bar.close) {
        ctx.fillStyle = this.options.downCandleFillStyle;

        ctx.fillRect(t - hw, o, w, c - o);
        if (this.options.drawCandleLine) {
          ctx.strokeRect(t - hw, o, w, c - o);
        }

        ctx.beginPath();
        ctx.moveTo(t, h);
        ctx.lineTo(t, o);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(t, c);
        ctx.lineTo(t, l);
        ctx.closePath();
        ctx.stroke();

        // down volume
        ctx.fillRect(t - hw, this.sharpen(v), w, this.sharpen(p.y2Max()));
      }
      else if (bar.open < bar.close) { // up candle
        ctx.fillStyle = this.options.upCandleFillStyle;

        ctx.fillRect(t - hw, c, w, o - c);
        if (this.options.drawCandleLine) {
          ctx.strokeRect(t - hw, c, w, o - c);
        }

        ctx.beginPath();
        ctx.moveTo(t, h);
        ctx.lineTo(t, c);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(t, o);
        ctx.lineTo(t, l);
        ctx.closePath();
        ctx.stroke();

        // up volume
        //ctx.fillRect(t - hw, this.sharpen(p.y2Min() + v), w, this.sharpen(p.y2Max()));
      }
      else {
        ctx.strokeStyle = this.options.strokeStyle;

        ctx.beginPath();
        ctx.moveTo(t - hw, o);
        ctx.lineTo(t + hw, o);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(t, h);
        ctx.lineTo(t, l);
        ctx.closePath();
        ctx.stroke();

      }

      // volume
      ctx.strokeRect(t - hw, this.sharpen(v), w, this.sharpen(p.y2Max()));
    }
  };

  CandleChart.prototype.drawStatus = function() {
    var ctx = this.canvas.getContext('2d');
    var p = this._p;

    ctx.font = this.options.textFont;
    ctx.fillStyle = this.options.textStyle;

    ctx.fillText(new Date(p.openTime).toLocaleDateString() + ' - ' + new Date(p.closeTime).toLocaleDateString(), 5, 20);

    if (this.data.length > 0) {
      var bars = this.data[0];
      if (bars.data.length > 0) {
        ctx.fillText('Session: high = ' + bars.high + ', low = ' + bars.low + ', open = ' + bars.open + ', close = ' + bars.close, 5, 40);
        var bar = bars.data[bars.data.length - 1];
        ctx.fillText('Last Bar: high = ' + bar.high + ', low = ' + bar.low + ', open = ' + bar.open + ', close = ' + bar.close + ', ' + new Date(bar.closeTime).toLocaleDateString(), 5, 60);
      }
    }

  };

  CandleChart.extend = extend;
  exports.CandleChart = CandleChart;

})(typeof exports === 'undefined' ? this : exports);

},{}],3:[function(require,module,exports){
(function(exports) {
  /**
   * defines a candlestick chart
  **/
  var Chart = function(options) {
    this.options = options || Chart.defaultOptions;
    this.data = [];
  };

  Chart.defaultOptions = {
    yMin: 10,
    yMax: 200,
    xMin: 10,
    xMax: 200,
    msPerPixel: 200,
    valuePerPixel: 1,
    grid: {
      fillStyle: '#000000',
      lineWidth: 1,
      strokeStyle: '#777777',
      msPerPixel: 200,
      valuePerPixel: 1,
    },
    labels: {
      fillStyle: '#ffffff',
      fontFamily: 'sans-serif',
      fontSize: 12,
      precision: 2,
    },
    yMinFormatter: function(min, precision) {
      return parseFloat(min).toFixed(precision);
    },
    yMaxFormatter: function(max, precision) {
      return parseFloat(max).toFixed(precision);
    }
  };

  Chart.AnimateCompatibility = (function() {
    var lastTime = 0;
    var requestAnimationFrame = function(callback, element) {
      var requestAnimationFrame =
        window.requestAnimationFrame        ||
        window.webkitRequestAnimationFrame  ||
        window.mozRequestAnimationFrame     ||
        window.oRequestAnimationFrame       ||
        window.msRequestAnimationFrame      ||
        function(callback) {
          var timeToCall;
          var that2 = this;
          var id = window.setTimeout(function() {
            var now = new Date().getTime();
            that2.timeToCall = Math.max(0, 160 - (now - lastTime));
            lastTime = now + that2.timeToCall;
            callback(this.lastTime);
          }, timeToCall);
          return id;
        };
      return requestAnimationFrame.call(window, callback, element);
    };
    var cancelAnimationFrame = function(id) {
      var cancelAnimationFrame =
        window.cancelAnimationFrame ||
        function(id) {
          clearTimeout(id);
        };
      return cancelAnimationFrame.call(window, id);
    };

    return {
      requestAnimationFrame: requestAnimationFrame,
      cancelAnimationFrame: cancelAnimationFrame
    };
  })();

  /**
   * adds a series.
  **/
  Chart.prototype.addSeries = function(series) {
    if (series && series.data.length > 0) {
      this.yMin = 500;
      this.yMax = 50;
      this.xMin = series.startTime;
      this.xMax = series.endTime;
      this.data.push(series);
      series.on('dataChanged', function() {
        //that.render();
      });
    }
  };

  /**
   * removes a series.
  **/
  Chart.prototype.removeSeries = function(series) {
    if (series && series.data.length > 0) {
      var n = this.data.length;
      for (var i = 0; i < n; i++) {
        if (this.data[i] === series) {
          this.data.splice(i, 1);
          break;
        }
      }
    }
  };

  /**
   * streams to a canvas.
   * @canvas: canvas
   * @delay: delay in ms between two renderings
  **/
  Chart.prototype.streamTo = function(canvas, delay) {
    console.log('streamTo');
    this.canvas = canvas;
    this.delay = delay;
    this.start();
  };

  /**
   * starts the animation.
  **/
  Chart.prototype.start = function() {
    if (this.frame) {
      Chart.AnimateCompatibility.cancelAnimationFrame(this.frame);
      delete this.frame;
    }
    var animate = function() {
      this.frame = Chart.AnimateCompatibility.requestAnimationFrame(function() {
        this.render();
        animate();
      }.bind(this));
    }.bind(this);

    animate();
  };

  /**
   * stops the animation.
  **/
  Chart.prototype.stop = function() {
    console.log('stop');
    if (this.frame) {
      Chart.AnimateCompatibility.cancelAnimationFrame(this.frame);
      delete this.frame;
    }
  };

  /**
   * renders the chart.
  **/
  Chart.prototype.render = function(canvas) {
    canvas = canvas || this.canvas;
    var ctx = canvas.getContext('2d');
    var opts = this.options;
    var dims = {top: 0, left: 0, width: canvas.clientWidth, height: canvas.clientHeight};

    var timeToXPixel = function(t) {
      return Math.round((t - this.xMin) / opts.msPerPixel);
    }.bind(this);
    var valueToYPixel = function(v) {
      return Math.round((this.yMin - v) / opts.valuePerPixel);
    }.bind(this);

    ctx.font = opts.labels.fontSize + 'px' + opts.labels.fontFamily;
    ctx.save();

    // origin
    ctx.translate(dims.left, dims.top);

    ctx.rect(0, 0, dims.width, dims.height);
    ctx.clip();

    ctx.save();
    ctx.fillStyle = opts.grid.fillStyle;
    ctx.clearRect(0, 0, dims.width, dims.height);
    ctx.fillRect(0, 0, dims.width, dims.height);
    ctx.restore();

    // draw candles for each series
    for (var i = 0; i < this.data.length; i++) {
      ctx.save();
      var series = this.data[i];
      var d = series.data;
      //var sOpts = series.options;

      ctx.lineWidth = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      for (var j = 0; j < d.length ; j++) {
        var b = d[j],
            x = timeToXPixel(0.5*(b.openTime.getTime() + b.closeTime.getTime())),
            h = valueToYPixel(b.high),
            l = valueToYPixel(b.low),
            o = valueToYPixel(b.open),
            c = valueToYPixel(b.close);
            //v = b.volume;
        if ( o > c) {
          ctx.fillRect(x - 2, c, 2, o - c);
          ctx.rect(x - 2, c, 2, o - c);
          ctx.moveTo(x, h);
          ctx.lineTo(x, c);
          ctx.moveTo(x, o);
          ctx.lineTo(x, l);
        }
        else if (o === c) {
          ctx.moveTo(x - 2, o);
          ctx.lineTo(x + 2, o);
          ctx.moveTo(x, h);
          ctx.lineTo(x, l);
        }
        else {
          ctx.fillRect(x - 2, o, 2, c - o);
          ctx.rect(x - 2, o, 2, c - o);
          ctx.moveTo(x, h);
          ctx.lineTo(x, o);
          ctx.moveTo(x, c);
          ctx.lineTo(x, l);
        }
      }
    }
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
  };

  exports.Chart = Chart;

})(typeof exports === 'undefined' ? this : exports);

},{}],4:[function(require,module,exports){
(function(exports) {

  exports.TimeSeries = require('./time_series').TimeSeries;
  exports.TickSeries = require('./tick_series').TickSeries;
  exports.LineReader = require('./line_reader').LineReader;
  exports.CandleChart = require('./candle_chart').CandleChart;
  exports.Simulator = require('./simulator').Simulator;
  
  var bars = require('./bars');
  exports.Bar = bars.Bar;
  exports.Bars = bars.Bars;

})(typeof exports === 'undefined' ? this : exports);

},{"./bars":1,"./candle_chart":2,"./line_reader":5,"./simulator":6,"./tick_series":7,"./time_series":8}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
/** 
 * CandleJS
 * https://github.com/rp8/candlejs
 *
 * Copyright 2017 Ronggen Pan <rp8@competo.com>
 * Released under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 *
**/
(function (exports) {
  'use strict';

  /**
   * represents a price simulator.
   * @vol: volatility, ex., 0.10
   * @value: start value
   * @delay: up to delay ms
  **/
  var Simulator = function (vol, value, delay) {
    this.vol = vol;
    this.value = value;
    this.delay = delay || 1000;
    this.subscribers = [];
    this.run = false;
    var self = this;
    
    this.nextTick = function() {
      if (Math.random() > 0.5) {
        self.value += self.vol*Math.random();
      }
      else {
        self.value -= self.vol*Math.random();
      }

      self.emit(null, [new Date().getTime(), self.value, self.getVolume()]);

      if (self.run) {
        setTimeout(self.nextTick, Math.random()*self.delay);
      }
    };

    /**
     * emits an event.
    **/
    this.emit = function(err, data) {
      if (this.subscribers.length > 0) {
        this.subscribers.forEach(function(subscriber) { 
          subscriber(err, data); 
        });
      }
    }; 

    this.getVolume = function() {
      var rnd = Math.random()*1000;
      return Math.ceil(rnd/100)*100;
    };

  };

  Simulator.prototype.start = function() {
    this.run = true;
    this.nextTick();
  };

  Simulator.prototype.stop = function() {
    this.run = false;
  };

  /**
   * adds a subscriber (err, data) on the data event.
  **/
  Simulator.prototype.onData = function(subscriber) {
    this.subscribers.push(subscriber);
  };

  exports.Simulator = Simulator;

})(typeof exports === 'undefined' ? this : exports);
},{}],7:[function(require,module,exports){
/** 
 * CandleJS
 * https://github.com/rp8/candlejs
 *
 * Copyright 2015 Ronggen Pan <rp8@competo.com>
 * Released under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 *
**/
(function(exports) {
  /**
   * represents a tick time series for a symbol.
   * @ticks: optional array of tuple [time, price, volume][]
  **/
  var TickSeries = function(symbol, ticks) {
    this.symbol = symbol;
    this.openTime = this.closeTime = Number.NaN;
    this.low = this.high = Number.NaN;
    this.listeners = {};
    this.data = ticks || [];
  };

  /** 
   * clears the data.
  **/
  TickSeries.prototype.clear = function() {
    this.data = [];
    this.openTime = this.closeTime = Number.NaN;
    this.low = this.high = Number.NaN;
  };

  /**
   * adds a listener on an event.
  **/
  TickSeries.prototype.on = function(eventName, cb) {
    var list = this.listeners[eventName];
    if (list && list.indexOf(cb) === 0) {
      list.push(cb);
    }
    else {
      this.listeners[eventName] = [cb];
    }
  };

  /**
   * notifies the listeners on an event.
  **/
  TickSeries.prototype.notify = function(eventName) {
    var list = this.listeners[eventName];
    if (list) {
      list.forEach(function(cb) { cb(); });
    }
  };

  /**
   * adds a new tick and emits 'changed' event.
   * @time: integer in ms
   * @price: float
   * @volume: float
  **/
  TickSeries.prototype.add = function(time, price, volume) {
    this.openTime = isNaN(this.openTime) ? time : Math.min(this.openTime, time);
    this.closeTime = isNaN(this.closeTime) ? time : Math.max(this.closeTime, time);
    this.low = isNaN(this.low) ? price : Math.min(this.low, price);
    this.high = isNaN(this.high) ? price : Math.max(this.high, price);
    this.data.push([time, price, volume]);
    this.notify('changed');
  };

  /**
   * trims data older than before.
   * @before: integer in ms
   * @maxDataLength: integer
  **/
  TickSeries.prototype.trimOldData = function(before, maxDataLength) {
    var removedCount = 0;
    while (this.data.length - removedCount >= maxDataLength &&
        this.data[removedCount + 1][0] < before) {
      removedCount++;
    }
    if (removedCount !== 0) {
      this.data.splice(0, removedCount);
    }
  };

  exports.TickSeries = TickSeries;

})(typeof exports === 'undefined' ? this : exports);


},{}],8:[function(require,module,exports){
/** 
 * CandleJS
 * https://github.com/rp8/candlejs
 *
 * Copyright 2015 Ronggen Pan <rp8@competo.com>
 * Released under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 *
**/
(function(exports) {
  /**
   * represents a time series of [time, value].
   *   time  - integer in ms
   *   value - float
  **/
  var TimeSeries = function() {
    this.data = [];
    this.low = this.high = Number.NaN;
    this.startTime = this.endTime = Number.NaN;
    this.listeners = {};
  };

  /**
   * clears the data.
  **/
  TimeSeries.prototype.clear = function() {
    this.data = [];
    this.low = this.high = Number.NaN;
    this.startTime = this.endTime = Number.NaN;
    this.notify('changed');
  };

  /**
   * resets the bounds.
  **/
  TimeSeries.prototype.resetBounds = function() {
    if (this.data.length) {
      this.low = this.high = this.data[0][1];
      this.startTime = this.endTime = this.data[0][0];

      for (var i = 1; i < this.data.length; i++) {
        var t = this.data[i][0];
        var v = this.data[i][1];
        if (t < this.startTime) {
          this.startTime = t;
        }
        if (t > this.endTime) {
          this.endTime = t;
        }
        if (v < this.low) {
          this.low = v;
        }
        if (v > this.high) {
          this.high = v;
        }
      }
      this.notify('changed');
    }
    else {
      this.clear();
    }
  };

  /**
   * adds a point and preseves the order by time.
   * @time: integer in ms
   * @value: float
  **/
  TimeSeries.prototype.add = function(time, value) {
    var i = this.data.length - 1;
    while ( i >= 0 && this.data[i][0] > time) {
      i--;
    }

    if (i === -1) {
      this.data.splice(0, 0, [time, value]);
    }
    else if (this.data.length > 0 && this.data[i][0] === time) {
      this.data[i][1] = value;
    }
    else if (i < this.data.length - 1) {
      this.data.splice(i + 1, 0, [time, value]);
    }
    else {
      this.data.push([time, value]);
    }

    this.low = isNaN(this.low) ? value: Math.min(this.low, value);
    this.high = isNaN(this.high) ? value: Math.max(this.high, value);
    this.startTime = isNaN(this.startTime) ? value: Math.max(this.startTime, value);
    this.endTime = isNaN(this.endTime) ? value: Math.max(this.endTime, value);
  };

  /**
   * trims the data order than before.
   * @before: integer in ms
   * @maxDataLength: integer
  **/
  TimeSeries.prototype.trimOldData = function(before, maxDataLength) {
    var removedCount = 0;
    while (this.data.length - removedCount >= maxDataLength &&
        this.data[removedCount + 1][0] < before) {
      removedCount++;
    }
    if (removedCount !== 0) {
      this.data.splice(0, removedCount);
    }
  };

  /**
   * adds a listener on an event.
  **/
  TimeSeries.prototype.on = function(eventName, cb) {
    var list = this.listeners[eventName];
    if (list && list.indexOf(cb) === 0) {
      list.push(cb);
    }
    else {
      this.listeners[eventName] = [cb];
    }
  };

  /**
   * notifies the listeners on an event.
  **/
  TimeSeries.prototype.notify = function(eventName) {
    var list = this.listeners[eventName];
    if (list) {
      list.forEach(function(cb) { cb(); });
    }
  };

  exports.TimeSeries = TimeSeries;

})(typeof exports === 'undefined' ? this : exports);

},{}],"candle":[function(require,module,exports){
'use strict';

exports = module.exports = require('./lib');

},{"./lib":4}]},{},[1,2,3,4,5,6,7,8]);
