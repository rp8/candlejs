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

