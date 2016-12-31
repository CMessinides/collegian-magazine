'use strict';

const gulp = require('gulp'),
      sass = require('gulp-sass'),
      autoprefix = require('gulp-autoprefixer');

gulp.task('sass', function() {
  return gulp.src('./sass/**/*.scss')
    .pipe(sass({
      outputStyle: 'compressed'
    }).on('error', sass.logError))
    .pipe(autoprefix({
      browsers: ['last 2 versions', '> 5% in US']
    }))
    .pipe(gulp.dest('./static/css'));
});

gulp.task('watch', ['sass'], function() {
  gulp.watch('./sass/**/*.scss', ['sass'])
})
