var menu = document.getElementById('header-menu');
var toggle = document.getElementById('menu-toggle');
var menuLinks = document.getElementsByClassName('header__nav-link');

var toggleMenu = function() {
  menu.classList.toggle('active');
  toggle.classList.toggle('active');
};

var toggleMenuOnFocus = function() {
  if (document.activeElement.classList.contains('header__nav-link')) {
    menu.classList.add('active');
    toggle.classList.add('active');
  } else {
    menu.classList.remove('active');
    toggle.classList.remove('active');
  }
};

toggle.addEventListener('click', toggleMenu);

[].forEach.call(menuLinks, function(menuLink) {
  menuLink.addEventListener('focus', toggleMenuOnFocus);
  menuLink.addEventListener('blur', toggleMenuOnFocus);
});
