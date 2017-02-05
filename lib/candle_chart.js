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
