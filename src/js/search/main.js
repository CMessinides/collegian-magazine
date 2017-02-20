(function() {
    window.addEventListener('error', shutdown, true);

    var schemas = {
      announcements: {
        indexCallback: function() {
          this.field('title', {boost: 20});
          this.field('description');
          this.field('content');
          this.field('tags', {boost: 30});
          this.ref('id');
        }
      },

      articles: {
        indexCallback: function() {
          this.field('title', {boost: 20});
          this.field('description');
          this.field('content');
          this.field('tags', {boost: 30});
          this.field('categories', {boost: 20});
          this.field('authors');
          this.ref('id');
        }
      },

      pages: {
        indexCallback: function() {
          this.field('title', {boost: 20});
          this.field('description');
          this.field('content');
          this.ref('id');
        }
      },

      staff: {
        indexCallback: function() {
          this.field('title', {boost: 20});
          this.field('roles', {boost: 10});
          this.field('bio');
          this.ref('id');
        }
      }
    },
    models = {},
    form = new Form('search'),
    results = new Results('search-results');

    // initialize the models with the given schemas
    for (var label in schemas) {
      if (schemas.hasOwnProperty(label)) {
        models[label] = new Model(label, schemas[label]);
      }
    }


    // ## MODEL LOGIC
    // ==============

    function Model(label, schema) {
      this.label = label;
      this.indexCallback = schema.indexCallback;
      this.index;
      this.dataURI = '/data/' +
          encodeURIComponent(label) +
          '.json';
      this.templateURI = '/views/' +
          encodeURIComponent(label) +
          '.dot';
      this.data;
      this.render;
    }

    Model.prototype.buildIndex = function() {
      this.index = lunr(this.indexCallback);
    }

    Model.prototype.storeData = function(json) {
      try {
        this.data = JSON.parse(json)
      } catch (e) {
        if (e instanceof SyntaxError) {
          this.data = null;
          shutdown('bad JSON')
        } else {
          throw e
        }
      }
    }

    Model.prototype.storeTemplate = function(dot) {
      this.render = doT.template(dot);
    }

    Model.prototype.fillIndex = function(ignore) {
      ignore = null;
      var fields = this.index._fields.map(function(f){ return f.name });
      var ref = this.index._ref;
      var entry;

      for (var i = 0; i < this.data.length; i++) {
        var item = this.data[i];
        entry = {};
        for (var f in fields) {
          var field = fields[f];
          if (item[field] instanceof Array) {
            entry[field] = item[field].join(' ');
          } else {
            entry[field] = item[field] || "";
          }
        }
        entry[ref] = parseInt(i);
        this.index.add(entry);
      }
    }

    Model.prototype.getResource = function(path, target, callbacks) {
      var req = new XMLHttpRequest();
      var uri = '/search/' + path;
      req.open('GET', uri, true);

      req.onload = function() {
        if (this.status >= 200 && this.status < 400) {
          for (var i in callbacks) {
            callbacks[i].call(target, this.response)
          }
        } else {
          shutdown('bad response');
        }
      }

      req.onerror = function() {
        shutdown('bad response');
      }

      req.send();
    }

    Model.prototype.getData = function() {
      this.getResource(this.dataURI, this, [Model.prototype.storeData, Model.prototype.fillIndex]);
    }

    Model.prototype.getTemplate = function() {
      this.getResource(this.templateURI, this, [Model.prototype.storeTemplate]);
    }

    Model.prototype.assemble = function() {
      this.buildIndex();
      this.getData();
      this.getTemplate();
    }

    Model.prototype.results = function(term) {
      var data = this.data;
      var results = this.index.search(term);
      var toRender = {};
      if (results.length) {
        toRender[this.label] = results.map(function(r) {
          return data[r.ref];
        });
        return this.render(toRender)
      } else {
        return null;
      }
    }



    // ## VIEW ELEMENT LOGIC
    // =====================

    function ViewElement(id) {
      this.el = document.getElementById(id);
      if (!this.el) {
        shutdown('element missing');
      }
    }

    function Form(id) {
      ViewElement.call(this, id)
      var searchField = this.el.querySelector('input[type="text"]');
      var filters = this.el.querySelectorAll('input[type="checkbox"][name="include"]');

      this.enable = function() {
        for (var i = 0; i < this.el.length; i++) {
          this.el[i].disabled = false;
        }
      }

      this.disable = function() {
        for (var i = 0; i < this.el.length; i++) {
          this.el[i].disabled = true;
        }
      }

      this.getState = function() {
        var state = {
          include: []
        };
        state[searchField.name] = searchField.value;
        for (var i = 0; i < filters.length; i++) {
          if (filters[i].checked) { state.include.push(filters[i].value) }
        }
        return state;
      }

      this.setState = function(state) {
        searchField.value = state[searchField.name] || "";
        for (var i = 0; i < filters.length; i++) {
          filters[i].checked = state.include.includes(filters[i].value);
        }
      }

    }

    Form.prototype = Object.create(ViewElement.prototype);


    function Results(id) {
      ViewElement.call(this, id);
      this.resultsList = this.el.querySelector('ul#results-list');
      this.statusMsgs = {
        error: document.getElementById('search-error'),
        loading: document.getElementById('search-loading'),
        noResults: document.getElementById('search-no-results')
      }

      this.clear = function(replaceWith, arg) {
        this.resultsList.classList.remove('show');
        while (this.resultsList.firstChild) {
          this.resultsList.removeChild(this.resultsList.firstChild);
        }
        for (var msg in this.statusMsgs) {
          this.statusMsgs[msg].classList.remove('show');
        }
        if (typeof replaceWith === 'function') {
          replaceWith.call(this, arg);
        }
      }
    }

    Results.prototype = Object.create(ViewElement.prototype);


    Results.prototype.showStatus = function(key) {
      var msg = this.statusMsgs[key]
      if (msg) {
        msg.classList.add('show');
      }
    };

    Results.prototype.appendRenders = function(renders) {
      this.resultsList.classList.add('show');
      this.resultsList.innerHTML = renders.join();
    }



    // ## ROUTER LOGIC
    // ===============

    function arraysEql(array1, array2) {
      return (array1.length == array2.length) && array1.every(function(element, index) {
        return element === array2[index];
      });
    }

    function getURLParam(name) {
      var name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
      var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
      var results = regex.exec(location.search);
      return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '))
    }

    function parseURLParams() {
      var state = {};
      state.q = getURLParam('q');
      var include = getURLParam('include');
      if (include.length) {
        state.include = include.split(',');
      } else {
        state.include = Object.keys(models);
      }
      return state;
    };

    function encodeURLParams(state) {
      var prep = [];
      prep[0] = 'q=' + encodeURIComponent(state.q || "");
      if (state.include.length !== Object.keys(models).length) {
        prep[1] = 'include=' + state.include.map(function(x) {
          return encodeURIComponent(x)
        }).join(',');
      }
      return '?' + prep.join('&');
    };

    function handleSubmit(event) {
      event.preventDefault();
      diffState(history.state, form.getState());
    };

    var prevTimeout;
    function handleInput(event) {
      results.clear(Results.prototype.showStatus, 'loading')
      window.clearTimeout(prevTimeout);
      prevTimeout = window.setTimeout(diffState, 500, history.state, form.getState());
    };

    function handleTouch(event) {
      if (event.target.type == 'checkbox') {
        var targetedResults = document.getElementById(event.target.value + '-results');
        if (targetedResults) {
          var newState = form.getState();
          results.resultsList.removeChild(targetedResults);
          history.pushState(newState, null, window.location.pathname + encodeURLParams(newState))
        } else {
          diffState(history.state, form.getState())
        }
      }
    };

    function diffState(oldState, newState) {
      if (oldState.q !== newState.q || !arraysEql(oldState.include.sort(), newState.include.sort())) {
        history.pushState(newState, null, window.location.pathname + encodeURLParams(newState));
        changeState();
      }
    };

    function changeState() {
      form.setState(history.state);
      search(history.state);
    };

    function search(state) {
      results.clear(Results.prototype.showStatus, 'loading');
      var renders = state.include.map(function(label) {
        return models[label].results(state.q)
      }).filter(function(r) {return r !== null });
      if (renders.length > 0) {
        results.clear(Results.prototype.appendRenders, renders);
      } else {
        results.clear(Results.prototype.showStatus, 'noResults');
      }
    };

    var searchTimeout;
    function init() {
      results.clear(Results.prototype.showStatus, 'loading');
      history.replaceState(parseURLParams(), null, null);
      form.enable();
      form.setState(history.state);
      for (var m in models) {
        if (models[m] instanceof Model) {
          models[m].assemble();
        }
      }
      results.clear();
      if (history.state.q.length) {
        results.clear(Results.prototype.showStatus, 'loading');
        searchTimeout = window.setTimeout(search, 700, history.state);
      }
      watch();
    };

    function watch() {
      form.el.addEventListener('submit', handleSubmit, true);
      form.el.addEventListener('input', handleInput, true);
      form.el.addEventListener('click', handleTouch, true);
      window.addEventListener('popstate', changeState);
    };


    // ## ERROR HANDLING
    // ==============

    function shutdown(error) {
      window.clearTimeout(searchTimeout);
      form.disable();
      form.el.removeEventListener('submit', handleSubmit, true);
      form.el.removeEventListener('input', handleInput, true);
      form.el.removeEventListener('click', handleTouch, true);
      window.removeEventListener('popstate', changeState);
      results.clear(Results.prototype.showStatus, 'error');
    }

    document.addEventListener('DOMContentLoaded', init, false);

})();
