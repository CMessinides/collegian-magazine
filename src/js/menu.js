var menu = document.getElementById('header-menu');
var toggle = document.getElementById('menu-toggle');

var toggleMenu = function() {
  menu.classList.toggle('active');
  toggle.classList.toggle('active');
};

var keepMenuOpen = function(e) {
  menu.classList.add('active');
  toggle.classList.add('active');
};

var closeMenu = function(e) {
  menu.classList.remove('active');
  toggle.classList.remove('active');
}

toggle.addEventListener('click', toggleMenu);
menu.addEventListener('focus', keepMenuOpen, true);
menu.addEventListener('blur', closeMenu, true);
