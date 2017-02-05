'use strict';

var assert = require('assert');
var cjs = require('../lib');

describe('TickSeries', function(){
  describe('#add', function(){
    it('should add a new tick', function(){
      var t = new cjs.TickSeries('AAPL');
      var tick1 = [new Date('2015-04-24 10:10:10.001').getTime(), 129.41, 100];
      var tick2 = [new Date('2015-04-24 10:10:10.001').getTime(), 129.40, 100];
      t.add(tick1[0], tick1[1], tick1[2]);
      t.add(tick2[0], tick2[1], tick2[2]);

      assert.equal('AAPL', t.symbol);

      assert.equal(2, t.data.length);

      assert.equal(tick1[0], t.data[0][0]);
      assert.equal(tick1[1], t.data[0][1]);
      assert.equal(tick1[2], t.data[0][2]);

      assert.equal(tick2[0], t.data[1][0]);
      assert.equal(tick2[1], t.data[1][1]);
      assert.equal(tick2[2], t.data[1][2]);

      assert.equal(tick2[1], t.low);
      assert.equal(tick1[1], t.high);
    });
  });
});

describe('TickSeries', function(){
  describe('#trimOldData', function(){
    it('should trim the old data', function(){
      var now = new Date().getTime();
      var t = new cjs.TickSeries('AAPL');
      for (var i = 0; i < 1000; i++) {
        t.add(new Date(now + i), 129.41 + Math.random(), 100 + Math.random() * 10);
      }

      t.trimOldData(now + 500, 500);

      assert.equal(501, t.data.length);

      t.clear();

      assert.equal(0, t.data.length);
      assert.equal(true, isNaN(t.high));
      assert.equal(true, isNaN(t.low));
    });
  });
});
