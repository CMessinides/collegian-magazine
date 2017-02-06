(function(){

  function SearchError(msg, callbacks) {
    this.msg = msg || "An error occurred in the search agent. Search agent is shutting down...";
    this.callbacks = callbacks || [];
  }

  function SearchDependencyError(msg, callbacks) {

  }

  function SearchValidationError(msg, callbacks) {

  }

  function SearchBuildError(msg, callbacks) {
    var base = SearchError;
    base(msg, callbacks);
  }

  SearchBuildError.prototype = Object.create(SearchError.prototype);

  function SearchAgent() {
    // ## Error handling
    this.shutdown = function(e) {
      throw e
    }

    try {
      if (!window.Handlebars) {
        throw new SearchDependencyError('Handlebars');
      }
      if (!window.lunr) {
        throw new SearchDependencyError('lunr');
      }
    } catch (e) {
      this.shutdown(e);
    }

    var config = {
      elements: {
        form: 'search',
        field: 'search-field',
        submit: 'search-submit',
        filters: 'search-filters',
        results: 'search-results',
        loadingMsg: 'search-loading',
        errorMsg: 'search-error'
      },
      dataMethod: 'xhr',
      templateMethod: 'xhr',
      xhr: {
        protocol: window.location.protocol + '//',
        hostname: window.location.hostname,
        port: window.location.port ? ":" + window.location.port : "",
        basePath: '/search/',
        dataPath: 'data/',
        templatePath: 'views/'
      }
    };

    Object.freeze(config);

    // utility functions
    function joinObj(obj) {
      var array = [];
      for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
          array.push(obj[p]);
        }
      }
      return array.join(' ');
    }

    function getResource(path, target, callbacks) {
      var req = new XMLHttpRequest();
      var uri = config.xhr.protocol +
                config.xhr.hostname +
                config.xhr.port +
                config.xhr.basePath +
                path;
      req.open('GET', uri, true);

      req.onload = function() {
        if (this.status >= 200 && this.status < 400) {
          for (var i in callbacks) {
            callbacks[i].call(target, this.response)
          }
        } else {
          throw new SearchBuildError();
        }
      }

      req.onerror = function() {
        throw new SearchBuildError();
      }

      req.send();
    }

    // ## Models

    // These are Model-specific methods; they should not be called on any objects that are not instances of Model
    function validateModel(initObj) {
      var requiredProps = {
        name: 'string',
        indexCallback: 'function'
      };
      for (var prop in requiredProps) {
        if (typeof initObj[prop] === requiredProps[prop]) {
          return;
        } else {
          throw new SearchValidationError();
        }
      }
    }

    function buildIndex() {
      Object.defineProperty(this, 'index', {
        value: lunr(this.indexCallback)
      })
    }

    function storeData(json) {
      try {
        Object.defineProperty(this, 'data', {
          value: JSON.parse(json)
        });
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new SearchBuildError()
        } else {
          throw e
        }
      }
    }

    function storeTemplate(hbs) {
      Object.defineProperty(this, 'render', {
        value: Handlebars.compile(hbs)
      })
    }

    function fillIndex(ignore) {
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

    // Model constructors
    function Model(initObj) {
      Object.defineProperty(this, 'validate', {
        value: validateModel
      });

      this.validate(initObj);

      for (var key in initObj) {
        if (initObj.hasOwnProperty(key)) {
          Object.defineProperty(this, key, {
            value: initObj[key]
          })
        }
      }

      Object.defineProperties(this, {
        buildIndex: {
          value: buildIndex
        },
        getData: {
          value: function() {
            var path = config.xhr.dataPath +
                        encodeURIComponent(this.name) +
                        '.json';
            getResource(path, this, [storeData, fillIndex]);
          }
        },
        storeData: {
          value: storeData
        },
        fillIndex: {
          value: fillIndex
        },
        getTemplate: {
          value: function() {
            var path = config.xhr.templatePath +
                       encodeURIComponent(this.name) +
                       '.hbs';
            getResource(path, this, [storeTemplate]);
          }
        },
        storeTemplate: {
          value: storeTemplate
        }
      });
    }

    this.models = {};

    // ## Router
    // Conveys state to the search agent
    // Directs queries from the search form to the models, sets and gets the history state, and renders the search results in the document
    this.router = {
      listeners: {}
    };

    function storeElements() {
      var optional = ['filters', 'loadingMsg'];
      Object.defineProperty(this, 'elements', {
        value: {}
      })

      for (var key in config.elements) {
        var el = document.getElementById(config.elements[key]);
        if (!el && !optional.includes(key)) {
          throw new SearchBuildError();
        }
        Object.defineProperty(this.elements, key, {
          enumerable: true,
          value: el
        })
      }

      if (this.elements.filters) {
        this.storeFilters();
      }
    }

    function storeFilters() {

    }

    function initializeState() {

    }

    function buildSearchSchema() {

    }

    Object.defineProperties(this.router, {
      initialize: {
        value: function() {
          this.storeElements();
          this.buildSearchSchema();
          this.initializeState();
        }
      }
    })

    // Top-level and alias functions
    this.insert = function(models) {
      for (var key in models) {
        if (models.hasOwnProperty(key)) {
          var model = models[key];
          model.name = key;
          Object.defineProperty(this.models, key, {
            enumerable: true,
            value: new Model(model)
          })
        }
      }
    }

    this.start = function() {
      try {
        this.router.initialize()

        for (var m in this.models) {
          this.models[m].buildIndex();
          this.models[m].getData();
          this.models[m].getTemplate();
        }
      } catch (e) {
        this.shutdown(e);
      }
    }

  }


  if (typeof window.SearchAgent === 'undefined') {
    window.SearchAgent = SearchAgent;
  } else {
    throw "SearchAgent is already defined in the global scope."
  }
}());

// activating the search agent
// (function(){
  var searchModels = {
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
  };

  var searchAgent = new SearchAgent();
  searchAgent.insert(searchModels);
  for (var model in searchAgent.models) {
    searchAgent.models[model].buildIndex();
    searchAgent.models[model].getData();
    searchAgent.models[model].fillIndex();
    searchAgent.models[model].getTemplate();
  }
// })();
