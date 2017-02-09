(function() {

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
    router = createRouter(),
    handler = createErrorHandler();

    // initialize the models with the given schemas
    for (var label in schemas) {
      if (schemas.hasOwnProperty(label)) {
        models[label] = new Model(label, schemas[label]);
      }
    }


    // ## MODEL LOGIC
    // ==============

    function Model(label, schema) {
      this.indexCallback = schema.indexCallback;
      this.index;
      this.dataURI = '/data/' +
          encodeURIComponent(label) +
          '.json';
      this.templateURI = '/views/' +
          encodeURIComponent(label) +
          '.hbs';
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
          handler.register('bad JSON')
        } else {
          throw e
        }
      }
    }

    Model.prototype.storeTemplate = function(hbs) {
      this.render = Handlebars.compile(hbs)
    }

    Model.prototype.fillIndex = function(ignore) {
      ignore = null;
      var fields = this.index._fields.map(function(f){ return f.name });
      var ref = this.index._ref;
      var entry;

      for (var index in this.data) {
        var item = this.data[index];
        entry = {};
        for (var f in fields) {
          var field = fields[f];
          if (item[field] instanceof Array) {
            entry[field] = item[field].join(' ');
          } else {
            entry[field] = item[field] || "";
          }
        }
        entry[ref] = parseInt(index);
        this.index.add(entry);
      }
    }

    Model.prototype.getResource = function(path, target, callbacks) {
      var req = new XMLHttpRequest();
      var uri = '/search' + path;
      req.open('GET', uri, true);

      req.onload = function() {
        if (this.status >= 200 && this.status < 400) {
          for (var i in callbacks) {
            callbacks[i].call(target, this.response)
          }
        } else {
          handler.register('bad response');
        }
      }

      req.onerror = function() {
        handler.register('bad response');
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
      var results = this.index.search(term).map(function(r) {

      });
      return results.length ? results : null
    }



    // ## VIEW ELEMENT LOGIC
    // =====================

    function ViewElement(id) {
      this.el = document.getElementById(id);
      if (!this.el) {
        handler.register('element missing');
      }
    }

    function Form(id) {
      ViewElement.call(this, id)
      var searchField = this.el.querySelector('input[type="text"]');
      var filters = this.el.querySelectorAll('input[type="checkbox"][name="include"]');
      var disableable = this.el.querySelectorAll('input, fieldset, button');

      this.enable = function() {
        for (var d in disableable) {
          disableable[d].disabled = false;
        }
      }

      this.disable = function() {
        for (var d in disableable) {
          disableable[d].disabled = true;
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
    }

    Results.prototype = Object.create(ViewElement.prototype);

    Results.prototype.clearOut = function (replaceWith, arg) {
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
    };


    Results.prototype.showStatus = function (key) {
      var msg = this.statusMsgs[key]
      if (msg) {
        msg.classList.add('show');
      }
    };

    Results.prototype.appendRenders = function(renders) {
      for (var r = 0; r < renders.length; r++) {
        this.el.appendChild(renders[r]);
      }
    }



    // ## ROUTER LOGIC
    // ===============

    function createRouter() {
      return {
        form: new Form('search'),
        results: new Results('search-results'),

        parseURLParams: function() {
          var state = {};
          var search = window.location.search;
          if (search.length > 1) {
            window.location.search.slice(1).split('&').forEach(function(p){
              var param = p.split('=').map(function(comp) { return decodeURIComponent(comp.replace('+',' ')) });
              state[param[0]] = param[1].search(',') > -1 ? param[1].split(',') : param[1];
            })
          }
          if (!(state.include instanceof Array)) {
            state.include = Object.keys(models);
          }
          return state;
        },

        encodeURLParams: function(state) {
          var value;
          var params = Object.keys(state).map(function(p) {
            if (state[p] instanceof Array && state[p].length === Object.keys(models).length) { return null }
            value = state[p] instanceof Array ? state[p].join(',') : state[p];
            return [p, value].map(function(comp) { return encodeURIComponent(comp.replace(' ', '+')) }).join('=');
          }).filter(function(i) { return i !== null });

          return params.length ? '?' + params.join('&') : "";
        },

        blockDefault: function(event) {
          event.preventDefault();
          this.diffState(history.state, this.form.getState);
        },

        diffState: function(oldState, newState) {
          if (oldState !== newState) {
            this.changeState(newState);
          }
        },

        changeState: function(newState) {
          this.form.setState(newState);
          this.search(newState);
        },

        search: function(state) {
          this.results.clearOut(Results.prototype.showStatus, 'loading');
          var include = state.include || ['articles','announcements','pages','staff'];
          var renders = include.map(function(label) {
            return models[label] ? models[label].results(state.q) : null
          }).filter(function(r) {return r !== null });
          if (renders.length > 0) {
            this.results.clear(Results.prototype.appendRenders, renders);
          } else {
            this.results.clear(Results.prototype.showStatus, 'noResults');
          }
        },

        init: function() {
          history.replaceState(this.parseURLParams(), null, null);
          console.log(this.form);
          this.form.enable();
          this.form.setState(history.state);
        },

        start: function() {
          this.search(history.state);
          this.form.el.addEventListener('submit', this.blockDefault, true);
        }
      }
    }


    // ## ERROR HANDLING
    // ==============

    function createErrorHandler() {
      return {
        shutdown: function(error) {
          console.log(error);
        }
      }
    }

    function init() {
      router.init();
      for (var m in models) {
        if (models[m] instanceof Model) {
          models[m].assemble();
        }
      }
      console.log(models);
      router.start();
    }

    window.addEventListener('error', handler.shutdown, true);
    document.addEventListener('DOMContentLoaded', init, false);

})();
