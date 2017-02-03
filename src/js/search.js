// Contain everything in a singleton search agent
var ColMagSearchAgent;
(function(){
  var instance;

  ColMagSearchAgent = function ColMagSearchAgent() {
    if (instance) {
      return instance;
    };

    instance = this;

    var contentTypes = [
      {
        name: 'announcements',
        indexCallback: function() {
          this.field('title', {boost: 20});
          this.field('description');
          this.field('content');
          this.field('tags', {boost: 30});
          this.ref('id');
        }
      },
      {
        name: 'articles',
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
      {
        name: 'pages',
        indexCallback: function() {
          this.field('title', {boost: 20});
          this.field('description');
          this.field('content');
          this.ref('id');
        }
      },
      {
        name: 'staff',
        indexCallback: function() {
          this.field('title', {boost: 20});
          this.field('roles', {boost: 10});
          this.field('bio');
          this.ref('id');
        }
      }
    ];

    this.dataLists = {};
    this.indices = {};
    this.templates = {};
    this.currentParams;
    this.currentQuery;
    this.currentExclude;

    this.searchBar = document.getElementById('main-search');

    this.getResource = function(uri, type, success, error) {
      var req = new XMLHttpRequest();
      req.open('GET', uri, true);

      req.onload = function() {
        if (this.status >= 200 && this.status < 400) {
          success(this.response, type);
        } else {
          error();
        }
      }

      req.onerror = function() {
        error();
      }

      req.send();
    }

    this.buildIndices = function() {
      contentTypes.forEach(function(type) {
        this.indices[type.name] = lunr(type.indexCallback);
      })
    }

    this.loadDataLists = function() {
      contentTypes.forEach(function(type) {
        var uri = '/search/data/' + type.name + '.json';
        this.getResource(uri, type, this.dataLoaded, function(){});
      })
    }

    this.dataLoaded = function(response, type) {
      this.storeDataList(response, type);
      this.fillIndex(type);
    }

    this.storeDataList = function(response, type) {
      this.dataLists[type.name] = JSON.parse(response);
    }

    this.fillIndex = function(type) {
      var dataList = this.dataLists[type.name];
      var index = this.indices[type.name];
      var fields = index._fields.map(function(f){ return f.name });
      var ref = index._ref;
      var entry;

      dataList.forEach(function(dataItem) {
        entry = {};
        fields.forEach(function(field) {
          if (dataItem[field] instanceof Array) {
            entry[field] = dataItem[field].join(' ');
          } else {
            entry[field] = dataItem[field] || "";
          }
        });
        entry[ref] = dataItem[ref];
        index.add(entry);
      })
    }

    this.loadTemplates = function() {
      contentTypes.forEach(function(type) {
        var uri = '/search/views/' + type.name + '.hbs';
        this.getResource(uri, type, this.storeTemplate, function(){});
      })
    }

    this.storeTemplate = function(response, type) {
      this.templates[type.name] = response;
    }

    this.initializeFromURLParams = function(callbacks) {
      var search = window.location.search;
      var params = {};
      if (search) {
        search.slice(1).split('&').forEach(function(param) {
          var pair = param.split('=');
          params[pair[0]] = pair[1].match(',') ? pair[1].split(',') : pair[1];
        })
      }
      console.log(params)
      this.currentParams = params;
      this.currentQuery = params.q;
      this.currentExclude = params.exclude;

      if (callbacks instanceof Array) {
        callbacks.forEach(function(callback) {
          if (typeof callback === 'function') { callback(params) };
        })
      }
    }

    this.setFormValues = function(params) {
      this.searchBar.value = this.currentQuery;
    }

    var initializeHistory = function(params) {
      window.history.state = this.currentParams;
    }

    this.build = function() {
      this.buildIndices();
      this.loadDataLists();
      this.loadTemplates();
      this.initializeFromURLParams([initializeHistory, this.setFormValues]);
    }

    // TODO: Add render methods
    // TODO: Add url getting and setting methods

    return instance;
  }
}());

var searchAgent = ColMagSearchAgent();
searchAgent.build();
