'use strict';

const gulp = require('gulp'),
      sass = require('gulp-sass'),
      autoprefix = require('gulp-autoprefixer');

gulp.task('sass', function() {
  return gulp.src('./themes/colmag/sass/**/*.scss')
    .pipe(sass({
      outputStyle: 'compressed'
    }).on('error', sass.logError))
    .pipe(autoprefix({
      browsers: ['last 2 versions', '> 5% in US']
    }))
    .pipe(gulp.dest('./themes/colmag/static/assets/css'));
});

gulp.task('watch', ['sass'], function() {
  gulp.watch('./themes/colmag/sass/**/*.scss', ['sass'])
})
