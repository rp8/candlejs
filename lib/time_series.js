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
