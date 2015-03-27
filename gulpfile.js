var gulp        = require('gulp');
var babel       = require('gulp-babel');
var changed     = require('gulp-changed');
var size        = require('gulp-size');
var browserify  = require('browserify');
var transform   = require('vinyl-transform');
var uglify      = require('gulp-uglify');
var sourcemaps  = require('gulp-sourcemaps');
var rename      = require('gulp-rename');
var runSequence = require('run-sequence');
var notify      = require('gulp-notify');

var browserified = transform(function(filename) {
	var b = browserify({entries: filename, debug: true});
    return b.bundle();
});

gulp.task('convertEs6toEs5', function(done) {

	return gulp.src('app/**/*.js')
		.pipe(changed('app-es5'))
		.pipe(babel())
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('app-es5'));
});

gulp.task('buildForBrowser', function(done) {

	var uglifyOptions = {output: {beautify: true}};

	return gulp.src('app-es5/Browser/main.js')
		.pipe(browserified)
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/Browser'))
		.pipe(uglify(uglifyOptions))
		.pipe(rename('main-min.js'))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/Browser'));
});

gulp.task('notify', function() {

	return gulp.src('')
		.pipe(notify('task completed'));
});

gulp.task('convertAndBuild', function(done) {
	runSequence('convertEs6toEs5', 'buildForBrowser', 'notify', done);
});

gulp.task('watch', function(done) {
	gulp.watch('app/**/*.js', ['convertAndBuild']);
});