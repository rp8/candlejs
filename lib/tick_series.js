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

