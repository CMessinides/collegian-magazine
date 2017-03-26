var drawer = document.getElementById('drawer');
var toggles = {
   opener: document.getElementById('drawerOpener'),
   closer: document.getElementById('drawerCloser')
};

document.addEventListener('DOMContentLoaded', function() {
  header.addEventListener('keydown', handleKeypress, true);
});

function handleKeypress(e) {
  if (e.which == 27) {
    window.location.hash = "";
  }
}
