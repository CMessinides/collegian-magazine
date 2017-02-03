'use strict';

const gulp = require('gulp');
// pre-processing stylesheets
const sass = require('gulp-sass');
const autoprefix = require('gulp-autoprefixer');
// uglifying and minifying scripts
const uglify = require('gulp-uglify');
// resizing images
const imageResize = require('gulp-image-resize');
const changed = require('gulp-changed');

// compiling, autoprefixing, and minifying sass
gulp.task('sass', function() {
  return gulp.src('src/sass/**/*.scss')
    .pipe(sass({
      outputStyle: 'compressed'
    }).on('error', sass.logError))
    .pipe(autoprefix({
      browsers: ['last 2 versions', '> 5% in US']
    }))
    .pipe(gulp.dest('static/assets/css'));
});

// uglifying scripts
gulp.task('js', function() {
  return gulp.src('src/js/**/*.js')
    .pipe(uglify())
    .on('error', function(err) {
      console.log(err.toString());
    })
    .pipe(gulp.dest('static/assets/js'));
});

// Resizing images

const imageSrc = 'src/img/**/*.{jpg,jpeg,png,tiff}';
var imageResizeTasks = [];

[96,128,320,540,800,1200].forEach(function(size) {
  let imageResizeTask = 'resize_' + size;
  gulp.task(imageResizeTask, function() {
    let dest = `static/assets/img/${size}`
    return gulp.src(imageSrc)
      .pipe(changed(dest, {extension: '.jpg'}))
      .pipe(imageResize({
        filter: 'Catrom',
        format: 'jpg',
        noProfile: true,
        quality: 1,
        width: size
      }))
      .pipe(gulp.dest(dest));
  });
  imageResizeTasks.push(imageResizeTask);
});

// Transfering and compressing original images
gulp.task('original_images', function() {
  let dest = 'static/assets/img'
  return gulp.src(imageSrc)
    .pipe(changed(dest, {extension: '.jpg'}))
    .pipe(imageResize({
      filter: 'Catrom',
      format: 'jpg',
      noProfile: true,
      quality: 1,
      width: 2560
    }))
    .pipe(gulp.dest(dest));
});
imageResizeTasks.push('original_images');

gulp.task('images', imageResizeTasks);

gulp.task('build', ['sass', 'js', 'images']);

gulp.task('watch', ['sass', 'js'], function() {
  gulp.watch('src/sass/**/*.scss', ['sass']);
  gulp.watch('src/js/**/*.js', ['js']);
});

gulp.task('default', ['build']);
