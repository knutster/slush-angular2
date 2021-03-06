'use strict';

var gulp = require('gulp'),
	Builder = require('systemjs-builder'),
	del = require('del'),
	merge = require('merge-stream'),
	path = require('path'),
	plumber = require('gulp-plumber'),
	replace = require('gulp-html-replace'),
	run = require('run-sequence'),
	ts = require('gulp-typescript'),
	webserver = require('gulp-webserver');

gulp.task('build:angular2', function() {
	var angular2 = new Builder({
		paths: {'angular2/*': 'node_modules/angular2/es6/prod/*.es6', 'rx': 'node_modules/angular2/node_modules/rx/dist/rx.js'}, 
		meta: {'rx': {format: 'cjs'}}
	});
	return angular2.build('angular2/*', './src/lib/angular2.js');
});
gulp.task('build:bundle', function() {
	var bundle = new Builder({
		baseURL: './',
		paths: {'angular2/*': 'node_modules/angular2/es6/prod/*.es6',
				'reflect-metadata': 'node_modules/angular2/node_modules/reflect-metadata/Reflect.js',
				'rx': 'node_modules/angular2/node_modules/rx/dist/rx.js',
				'traceur-runtime': 'node_modules/angular2/node_modules/traceur/bin/traceur-runtime.js',
				'zone.js': 'node_modules/angular2/node_modules/zone.js/lib/zone.js'
		}, meta: {'rx': {format: 'cjs'}, 'zone.js': {format: 'global'}}
	});
	return bundle.buildSFX('src/js/index', 'dist/bundle.js', {minify: true, sourceMaps: true});
});
gulp.task('build:dist', function() {
	var html = gulp.src('./src/*.html').pipe(replace({'bundle': ['bundle.js', 'Reflect.js']})),
		meta = gulp.src('./src/content/**'),
		reflect = gulp.src('node_modules/reflect-metadata/Reflect.js');
	return merge(html, meta, reflect).pipe(gulp.dest('./dist'));
});
gulp.task('build:lib', ['clean:lib'], function(cb) {
	run(['copy:definitions', 'copy:dependencies'], 'build:angular2', cb);
});
gulp.task('build:ts', ['clean:js'], function() {
	var tsProject = ts.createProject('./tsconfig.json', {typescript: require('typescript')});
	var tsResult = gulp.src('./src/ts/**/*.ts')
		.pipe(plumber())
		.pipe(ts(tsProject));
	return tsResult.js.pipe(gulp.dest('./src/js'));
});

gulp.task('clean:js', function(cb) { del(['./src/js'], cb); });
gulp.task('clean:lib', function(cb) { del(['./src/lib'], cb); });

gulp.task('copy:definitions', function() {
	var reflect = gulp.src('./node_modules/reflect-metadata/reflect-metadata.d.ts'),
		typescript = gulp.src('./node_modules/typescript/bin/lib.es6.d.ts'),
		zone = gulp.src('./node_modules/angular2/atscript/typings/zone/zone.d.ts');
	return merge(reflect, typescript, zone).pipe(gulp.dest('./src/typings'));
});
gulp.task('copy:dependencies', function() {
	gulp.src([
	    './node_modules/angular2/node_modules/traceur/bin/traceur-runtime.js',
			'./node_modules/angular2/node_modules/reflect-metadata/Reflect*.{js,map}',
			'./node_modules/angular2/node_modules/rtts_assert/rtts_assert*.{js,map}',
	    './node_modules/angular2/node_modules/zone.js/dist/zone.js',
			'./node_modules/es6-promise/dist/es6-promise*.js',
			'./node_modules/whatwg-fetch/fetch.js',
	    './node_modules/systemjs/dist/system*.{js,map}',
	    './node_modules/systemjs/node_modules/es6-module-loader/dist/es6-module-loader*.{js,map}'
	]).pipe(gulp.dest('./src/lib'));
});

gulp.task('src', function(cb) {
	run('build:ts', ['serve:src', 'watch'], cb);
});
gulp.task('serve:src', function() {
	gulp.src('./src').pipe(webserver({livereload: true, open: true}));
});

gulp.task('dist', function(cb) {
	run(['build:dist', 'build:ts'], 'build:bundle', 'serve:dist', cb);
});
gulp.task('serve:dist', function() {
	gulp.src('./dist').pipe(webserver({open: true}));
});

gulp.task('watch', function() {
	gulp.watch('./src/**/*.html', ['build:dist']);
	gulp.watch('./src/ts/**/*.ts', ['build:ts']);
});
