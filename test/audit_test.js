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

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

var assert = require('assert');
var EOL = require('os').EOL;
var File = require('gulp-util').File;
var audit = require('../');
var crypto = require('crypto');
var fs = require('fs');

var logFile = '';

function prepareLog() {
  return logFile.split(EOL);
}

var SHA1 = /^[0-9a-f]{40}$/i;
function validHash(hash) {
  return SHA1.test(hash);
}

function sha1sum(file) {
  var hash = crypto.createHash('sha1');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

exports.audit = {
  setUp: function(done) {
    var stream = audit('audit.log', {repos:['.', '.']});

    stream.on('data', function(file) {
      logFile = file.contents.toString('utf8');
    });

    stream.on('end', function() {
      done();
    });

    stream.on('error', function(err) {
      done(err);
    });

    var f = new File({
      base: __dirname,
      path: __dirname + '/index.js',
      contents: fs.readFileSync('index.js')
    });

    stream.write(f);

    stream.end();
  },
  madeFile: function(test) {
    test.expect(1);
    var log = prepareLog();
    test.ok(log.length, 'audit log should exist');
    test.done();
  },
  timeStamp: function(test) {
    test.expect(2);
    var log = prepareLog();
    var time = log[2];
    var a = time.split(': ');
    test.equal(a[0], 'Build Time');
    var d = new Date(a[1]);
    test.notEqual(d.toString(), 'Invalid Date', 'Build time should be valid');
    test.done();
  },
  nodeVersion: function(test) {
    test.expect(1);
    var log = prepareLog();
    var node_line = log[6];
    var a = node_line.split(': ');
    test.equal(a[1], process.version, 'node version should be reported');
    test.done();
  },
  gitVersions: function(test) {
    test.expect(5);
    var log = prepareLog();
    var index = log.indexOf('REPO REVISIONS');
    test.notEqual(index, -1, 'REPO REVISIONS should be a title');
    var repoline = log[index + 2];
    var repo = repoline.split(': ')[1];
    test.ok(repo,'repo should be reported');
    test.ok(validHash(repo), 'repo should be a valid sha1 hash');
    repoline = log[index + 3];
    repo = repoline.split(': ')[1];
    test.ok(repo,'repo should be reported');
    test.ok(validHash(repo), 'repo should be a valid sha1 hash');
    test.done();
  },
  buildHashes: function(test) {
    test.expect(3);
    var log = prepareLog();
    var index = log.indexOf('BUILD HASHES');
    test.notEqual(index, -1, 'BUILD HASHES should be a title');
    var line = log[index + 2].split(': ');
    test.equal(line[0], 'index.js', 'first file is testing');
    test.equal(line[1], sha1sum(line[0]), 'sha1 hash should be equal');
    test.done();
  }
};
