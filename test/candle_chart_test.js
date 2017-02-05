'use strict';

var assert = require('assert');
var cjs = require('../lib');

describe('CandleChart', function(){
  describe('#addSeries', function(){
    it('should add a series', function(){
      var t = new cjs.TickSeries('AAPL');
      var tick1 = [new Date('2015-04-24 10:10:10.001').getTime(), 129.41, 100];
      var tick2 = [new Date('2015-04-24 10:10:10.001').getTime(), 129.40, 100];
      t.add(tick1[0], tick1[1], tick1[2]);
      t.add(tick2[0], tick2[1], tick2[2]);

      assert.equal('AAPL', t.symbol);

      var chart = new cjs.CandleChart();
      chart.addSeries(t);
      assert.equal(1, chart.data.length);
    });
  });
  
  describe('#find', function() {
    it ('should find a bar for given time and return the index', function() {
      var chart = new cjs.CandleChart();
      var bars = new cjs.Bars('AAPL', 24*60*1000);
      bars.add(new Date('2015-01-01').getTime(), 129, 130, 120, 125, 1000);
      bars.add(new Date('2015-01-02').getTime(), 129, 130, 120, 125, 1000);
      bars.add(new Date('2015-04-02').getTime(), 129, 130, 120, 125, 1000);
      bars.add(new Date('2015-05-01').getTime(), 129, 130, 120, 125, 1000);
      chart.addSeries(bars);
      assert.equal(2, bars.find(new Date('2015-04-01').getTime()));
      bars.add(new Date('2015-05-03').getTime(), 129, 130, 120, 125, 1000);
      assert.equal(3, bars.find(new Date('2015-05-01').getTime()));
    });
  });
      
});
