'use strict';

var assert = require('assert');
var csj = require('../lib');

describe('Bars', function() {

  describe('#add', function() {
    it('should add ticks', function() {
      var bars = new csj.Bars(60);
      var startTime = new Date('2015-04-29 10:00:00.000').getTime();
      var ticks = new csj.TickSeries('AAPL');
      for (var i = 0; i < 50; i++) {
        ticks.add(startTime + 10000*i,
           100 + 10 * Math.random(), 10 + Math.round(10 * Math.random()));
      }

      bars.add(ticks);
      bars.addBar(bars.endTime + 100, 100, 120, 90, 95, 1000);

      //console.log('\n');
      //console.log('high=' + bars.high);
      //console.log('low=' + bars.low);
      //console.log('startTime=' + bars.startTime);
      //console.log('endTime=' + bars.endTime);
      //console.log(bars);
    });
  });
      
});

