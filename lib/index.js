(function(exports) {

  exports.TimeSeries = require('./time_series').TimeSeries;
  exports.TickSeries = require('./tick_series').TickSeries;
  exports.LineReader = require('./line_reader').LineReader;
  exports.CandleChart = require('./candle_chart').CandleChart;
  exports.Simulator = require('./simulator').Simulator;
  
  var bars = require('./bars');
  exports.Bar = bars.Bar;
  exports.Bars = bars.Bars;

})(typeof exports === 'undefined' ? this : exports);
