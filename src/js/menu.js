var menu = document.getElementById('header-menu');
var toggle = document.getElementById('menu-toggle');

/*
This handles an edge case in which the user a) has JS disabled and b) is using only the keyboard.
By programmatically setting tabindex, only users with JS will be able to focus on the menu toggle since the toggle depends on JS.
Users without JS enabled will have access to an anchor tag that jumps to the menu in the footer.
*/
toggle.setAttribute('tabindex', '0');

var toggleMenu = function() {
  menu.classList.toggle('open');
  toggle.classList.toggle('open');
};

var toggleMenuOnKeypress = function(e) {
  if (e.which == 13) {
    toggleMenu();
  }
};

toggle.addEventListener('click', toggleMenu);
toggle.addEventListener('keydown', toggleMenuOnKeypress, true);
