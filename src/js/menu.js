var toggleMenu = function() {
  var menu = document.getElementById('header-menu');
  menu.classList.toggle('active');
};

var toggles = document.getElementsByClassName('js-menu-toggle');
[].forEach.call(toggles, function(toggle) {
  toggle.addEventListener('click', toggleMenu);
});
