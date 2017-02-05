'use strict';

var assert = require('assert');
var cjs = require('../lib');

describe('Simulator', function() {

  describe('#onData', function() {
    it('should emit ticks', function() {
      var s = new cjs.Simulator(0.2, 99.00);
      s.onData((err, data) => {
        if (err) {
          console.log('err = ' + err);
        }
        console.log('data = ' + data);
      });
      s.start();

      setTimeout(() => {
        s.stop();
        console.log('done');
      }, 50000);
    });
  });
      
});