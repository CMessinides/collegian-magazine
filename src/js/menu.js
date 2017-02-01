var nav = document.getElementById('header-nav');
var firstNavItem = document.getElementsByClassName('js-nav-link')[0];
var toggle = document.getElementById('nav-toggle');

var focusNav = function(e) {
  e.preventDefault();
  firstNavItem.focus();
};

var focusNavOnKeypress = function(e) {
  /* Code 13 = Enter/Return */
  if (e.which == 13) {
    focusNav(e);
  }
};

var openNav = function(e) {
  nav.classList.add('open');
}

var closeNav = function(e) {
  nav.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', function() {
  toggle.addEventListener('click', focusNav, true);
  toggle.addEventListener('keydown', focusNavOnKeypress, true);
  nav.addEventListener('focus', openNav, true);
  nav.addEventListener('blur', closeNav, true);
});
