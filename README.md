# gulp-audit

> Generates an audit trail for minified builds with build sha1s and git revision numbers

## Install
```sh
npm install --save gulp-audit
```

## Usage
```js
var gulp = require('gulp');
var audit = require('gulp-audit');

gulp.task('audit', function() {
  return gulp.src('file_to_audit.js')
  .pipe(audit('logfile', { repos: ['.', '../some/other/build/repo'] })
  .pipe(gulp.dest('output'));
});
```

## API

### audit('audit file', options)

#### audit file

Output file that contains the audit log of your project

### options

#### repos

Array of paths to git repositiories, prints the current revision of that repo into the log
