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