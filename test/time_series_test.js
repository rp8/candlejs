'use strict';

var assert = require('assert');
var cjs = require('../lib');

describe('exports', function() {
  describe('typeof exports === "undefined"', function() {
    it('should be false', function() {
      assert.equal(false, typeof exports === 'undefined');
    });
  });
});

describe('TimeSeries', function(){
  describe('#add', function(){
    it('should add the new values', function(){
      var t = new cjs.TimeSeries();
      var time1 = new Date('2015-04-23 12:30:00.123').getTime();
      var time2 = new Date('2015-04-23 12:30:00.124').getTime();
      var value1 = 1.123;
      var value2 = 1.124;

      t.add(time1, value1);
      t.add(time2, value2);

      assert.equal(2, t.data.length);

      assert.equal(time1, t.data[0][0]);
      assert.equal(value1, t.data[0][1]);

      assert.equal(time2, t.data[1][0]);
      assert.equal(value2, t.data[1][1]);

      assert.equal(value1, t.low);
      assert.equal(value2, t.high);
    });
  });
});

describe('TimeSeries', function(){
  describe('#resetBounds', function(){
    it('should reset the bounds', function(){
      var t = new cjs.TimeSeries();
      var now = new Date().getTime();
      for (var i = 0; i < 1000; i++) {
        t.add(now + i, i + 1000);
      }

      assert.equal(1000, t.data.length);

      t.resetBounds();

      assert.equal(1999, t.high);
      assert.equal(1000, t.low);
    });
  });
});

describe('TimeSeries', function(){
  describe('#trimOldData', function(){
    it('should trim the old data', function(){
      var t = new cjs.TimeSeries();
      var now = new Date().getTime();
      for (var i = 0; i < 1000; i++) {
        t.add(now + i, i + 1000);
      }

      t.trimOldData(now + 500, 500);
      t.resetBounds();

      //console.log(t.data.length);
      //console.log(t.maxValue);
      //console.log(t.minValue);

      assert.equal(501, t.data.length);
      assert.equal(1999, t.high);
      assert.equal(1499, t.low);

      t.clear();

      assert.equal(0, t.data.length);
      assert.equal(true, isNaN(t.high));
      assert.equal(true, isNaN(t.low));
    });
  });
});
