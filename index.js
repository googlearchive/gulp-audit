/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

// jshint node: true

'use strict';

var Buffer = require('buffer').Buffer;
var EOL = require('os').EOL;
var async = require('async');
var crypto = require('crypto');
var exec = require('child_process').exec;
var gutil = require('gulp-util');
var path = require('path');
var ri = require('read-installed');
var through = require('through2');

// vinyl file -> `filename`: `sha1 hash`
function hash(file, cb) {
  var sha1sum = crypto.createHash('sha1');
  var done = function(err) {
    if (err) {
      return cb(err);
    }
    cb(null, file.relative + ': ' + sha1sum.digest('hex'));
  };
  if (file.isBuffer()) {
    sha1sum.update(file.contents);
    done();
  }
  if (file.isStream()) {
    var s = file.contents;
    s.on('data', function(b) {
      sha1sum.update(b);
    });
    s.on('error', done);
    s.on('end', done);
  }
}

function findRev(repo, cb) {
  var cmd = ['git --git-dir ', path.resolve(repo, '.git'), 'rev-parse', 'HEAD'].join(' ');
  exec(cmd, function(err, stdout, stderr) {
    if (err) {
      return cb(err);
    }
    if (stdout) {
      stdout = stdout.trim();
    }
    cb(null, path.basename(path.resolve(repo)) + ': ' + stdout);
  });
}

// report all the installed node modules and their versions
//
// Example:
//   gulp: 3.8.8
//   gulp-util: 3.0.1
function moduleVersions(cb) {
  ri('.', {depth: 0}, function(err, data) {
    if (err) {
      return cb(err);
    }
    var deps = Object.keys(data.dependencies).map(function(v) {
      return v + ': ' + data.dependencies[v].version;
    }).join(EOL);
    cb(null, deps);
  });
}

function buildLog(outputName, opts) {
  if (!outputName || typeof outputName !== 'string') {
    throw new gutil.PluginError('gulp-audit', 'output file name must be given');
  }
  if (!opts) {
    opts = {repos: []};
  }
  var repos = opts.repos;
  var fileHashes = [];
  var firstFile;
  var log = [];

  function bufferContents(file, enc, cb) {
    if (file.isNull()) {
      console.log('null');
      return cb();
    }
    // keep the "first" file to use for a vinyl stub file
    if (!firstFile) {
      var done = cb.bind(null);
      cb = gutil.noop;
      firstFile = file;
      // async do the git revisions and installed modules
      async.parallel({
        repos: function(cb) {
          async.map(repos, findRev, cb);
        },
        modules: function(cb) {
          moduleVersions(cb);
        },
      }, function(err, results) {
        if (err) {
          return done(err);
        }
        log = [
          'BUILD LOG',
          '---------',
          'Build Time: ' + gutil.date('isoDateTime'),
          '',
          'NODEJS INFORMATION',
          '==================',
          'nodejs: ' + process.version,
          results.modules,
          '',
          'REPO REVISIONS',
          '==============',
          results.repos.join(EOL),
          '',
          'BUILD HASHES',
          '============'
        ];
        done();
      });
    }
    var self = this;
    hash(file, function(err, data) {
      if (err) {
        return self.emit('error', err);
      }
      fileHashes.push(data);
      cb();
    });
  }

  function endStream(cb) {
    // copy "first" file as stub
    var file;
    if (!firstFile) {
      file = new gutil.File(outputName);
    } else {
      file = firstFile.clone({content: false});
      file.path = path.join(firstFile.path, '..', outputName);
    }
    log = log.concat(fileHashes);
    file.contents = new Buffer(log.join(EOL));
    this.push(file);
    cb();
  }

  return through.obj(bufferContents, endStream);
}

// input: files as gulp src, opts.repos
module.exports = buildLog;
