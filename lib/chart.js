(function(exports) {
  /**
   * defines a candlestick chart
  **/
  var Chart = function(options) {
    this.options = options || Chart.defaultOptions;
    this.data = [];
  };

  Chart.defaultOptions = {
    yMin: 10,
    yMax: 200,
    xMin: 10,
    xMax: 200,
    msPerPixel: 200,
    valuePerPixel: 1,
    grid: {
      fillStyle: '#000000',
      lineWidth: 1,
      strokeStyle: '#777777',
      msPerPixel: 200,
      valuePerPixel: 1,
    },
    labels: {
      fillStyle: '#ffffff',
      fontFamily: 'sans-serif',
      fontSize: 12,
      precision: 2,
    },
    yMinFormatter: function(min, precision) {
      return parseFloat(min).toFixed(precision);
    },
    yMaxFormatter: function(max, precision) {
      return parseFloat(max).toFixed(precision);
    }
  };

  Chart.AnimateCompatibility = (function() {
    var lastTime = 0;
    var requestAnimationFrame = function(callback, element) {
      var requestAnimationFrame =
        window.requestAnimationFrame        ||
        window.webkitRequestAnimationFrame  ||
        window.mozRequestAnimationFrame     ||
        window.oRequestAnimationFrame       ||
        window.msRequestAnimationFrame      ||
        function(callback) {
          var timeToCall;
          var that2 = this;
          var id = window.setTimeout(function() {
            var now = new Date().getTime();
            that2.timeToCall = Math.max(0, 160 - (now - lastTime));
            lastTime = now + that2.timeToCall;
            callback(this.lastTime);
          }, timeToCall);
          return id;
        };
      return requestAnimationFrame.call(window, callback, element);
    };
    var cancelAnimationFrame = function(id) {
      var cancelAnimationFrame =
        window.cancelAnimationFrame ||
        function(id) {
          clearTimeout(id);
        };
      return cancelAnimationFrame.call(window, id);
    };

    return {
      requestAnimationFrame: requestAnimationFrame,
      cancelAnimationFrame: cancelAnimationFrame
    };
  })();

  /**
   * adds a series.
  **/
  Chart.prototype.addSeries = function(series) {
    if (series && series.data.length > 0) {
      this.yMin = 500;
      this.yMax = 50;
      this.xMin = series.startTime;
      this.xMax = series.endTime;
      this.data.push(series);
      series.on('dataChanged', function() {
        //that.render();
      });
    }
  };

  /**
   * removes a series.
  **/
  Chart.prototype.removeSeries = function(series) {
    if (series && series.data.length > 0) {
      var n = this.data.length;
      for (var i = 0; i < n; i++) {
        if (this.data[i] === series) {
          this.data.splice(i, 1);
          break;
        }
      }
    }
  };

  /**
   * streams to a canvas.
   * @canvas: canvas
   * @delay: delay in ms between two renderings
  **/
  Chart.prototype.streamTo = function(canvas, delay) {
    console.log('streamTo');
    this.canvas = canvas;
    this.delay = delay;
    this.start();
  };

  /**
   * starts the animation.
  **/
  Chart.prototype.start = function() {
    if (this.frame) {
      Chart.AnimateCompatibility.cancelAnimationFrame(this.frame);
      delete this.frame;
    }
    var animate = function() {
      this.frame = Chart.AnimateCompatibility.requestAnimationFrame(function() {
        this.render();
        animate();
      }.bind(this));
    }.bind(this);

    animate();
  };

  /**
   * stops the animation.
  **/
  Chart.prototype.stop = function() {
    console.log('stop');
    if (this.frame) {
      Chart.AnimateCompatibility.cancelAnimationFrame(this.frame);
      delete this.frame;
    }
  };

  /**
   * renders the chart.
  **/
  Chart.prototype.render = function(canvas) {
    canvas = canvas || this.canvas;
    var ctx = canvas.getContext('2d');
    var opts = this.options;
    var dims = {top: 0, left: 0, width: canvas.clientWidth, height: canvas.clientHeight};

    var timeToXPixel = function(t) {
      return Math.round((t - this.xMin) / opts.msPerPixel);
    }.bind(this);
    var valueToYPixel = function(v) {
      return Math.round((this.yMin - v) / opts.valuePerPixel);
    }.bind(this);

    ctx.font = opts.labels.fontSize + 'px' + opts.labels.fontFamily;
    ctx.save();

    // origin
    ctx.translate(dims.left, dims.top);

    ctx.rect(0, 0, dims.width, dims.height);
    ctx.clip();

    ctx.save();
    ctx.fillStyle = opts.grid.fillStyle;
    ctx.clearRect(0, 0, dims.width, dims.height);
    ctx.fillRect(0, 0, dims.width, dims.height);
    ctx.restore();

    // draw candles for each series
    for (var i = 0; i < this.data.length; i++) {
      ctx.save();
      var series = this.data[i];
      var d = series.data;
      //var sOpts = series.options;

      ctx.lineWidth = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      for (var j = 0; j < d.length ; j++) {
        var b = d[j],
            x = timeToXPixel(0.5*(b.openTime.getTime() + b.closeTime.getTime())),
            h = valueToYPixel(b.high),
            l = valueToYPixel(b.low),
            o = valueToYPixel(b.open),
            c = valueToYPixel(b.close);
            //v = b.volume;
        if ( o > c) {
          ctx.fillRect(x - 2, c, 2, o - c);
          ctx.rect(x - 2, c, 2, o - c);
          ctx.moveTo(x, h);
          ctx.lineTo(x, c);
          ctx.moveTo(x, o);
          ctx.lineTo(x, l);
        }
        else if (o === c) {
          ctx.moveTo(x - 2, o);
          ctx.lineTo(x + 2, o);
          ctx.moveTo(x, h);
          ctx.lineTo(x, l);
        }
        else {
          ctx.fillRect(x - 2, o, 2, c - o);
          ctx.rect(x - 2, o, 2, c - o);
          ctx.moveTo(x, h);
          ctx.lineTo(x, o);
          ctx.moveTo(x, c);
          ctx.lineTo(x, l);
        }
      }
    }
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
  };

  exports.Chart = Chart;

})(typeof exports === 'undefined' ? this : exports);
