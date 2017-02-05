'use strict';

module.exports = function (grunt) {
  // load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  // project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      dist: {
        src: ['lib/*.js'],
        dest: 'dist/candle.js'
      },
      options: {
        require: [
          './index.js:candle'
        ],
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' + '<%= grunt.template.today("yyyy-mm-dd") %> */',
        sourceMap: true
      },
      dist: {
        files: {
          'dist/candle.min.js': ['dist/candle.js']
        }
      }
		},
    jshint: {  // grunt-contrib-jshint
      options: {
        jshintrc: '.jshintrc'
      },
      all: {
        src: [
          '**/*.js',
          '!lab/*.js',
          '!test/*.js',
          '!dist/*.js',
          '!dist/*.map',
          '!node_modules/**/*',
        ]
      }
    },
    mochaTest: {  // grunt-mocha-test
      options: {
        require: ['jsdom-global/register'],
        reporter: 'spec',
        clearRequireCache: false
      },
      files: ['test/**/*.js']
    },
    mochaTestConfig: {  // grunt-mocha-test
      options: {
        reporter: 'spec',
        clearRequireCache: false
      }
    },
    watch: {
      all: {
        files: [
          '**/*.js',          
          '!lab/*.js',
          '!test/*.js',
          '!dist/*.js',
          '!dist/*.map',
          '!node_modules/**/*',
        ],
        tasks: ['jshint', 'browserify', 'uglify'],
        options: {
          debounceDelay: 2000,
        }
      }
    }
  });

  // On watch events configure jshint:all to only run on changed file
  var changedFiles = Object.create(null);
  var onChange = grunt.util._.debounce(function() {
    grunt.config('jshint.all.src', Object.keys(changedFiles));
    changedFiles = Object.create(null);
  }, 200);
  grunt.event.on('watch', function(action, filepath) {
    changedFiles[filepath] = action;
    onChange();
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.registerTask('test', ['mochaTest']);
};
