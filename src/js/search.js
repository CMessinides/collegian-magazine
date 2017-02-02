/* create the search index as a singleton */
var ColMagSearchIndex;
(function(){
  var instance;

  ColMagSearchIndex = function ColMagSearchIndex() {
    if (instance) {
      return instance;
    };

    instance = this;

    /* Index properties and functions go here */
    var types = ['announcements', 'articles', 'pages', 'staff'];
    this.models = {};
    var models = this.models;
    this.indices = {
      'announcements': lunr(function() {
        this.field('title', {boost: 20});
        this.field('description');
        this.field('content');
        this.field('tags', {boost: 30});
        this.ref('id');
      }),
      'articles': lunr(function() {
        this.field('title', {boost: 20});
        this.field('description');
        this.field('content');
        this.field('tags', {boost: 30});
        this.field('categories', {boost: 20});
        this.field('authors');
        this.ref('id');
      }),
      'pages': lunr(function() {
        this.field('title', {boost: 30});
        this.field('description');
        this.field('content');
        this.ref('id');
      }),
      'staff': lunr(function() {
        this.field('title', {boost: 30});
        this.field('roles', {boost: 10});
        this.field('bio');
        this.ref('id');
      })
    };
    var indices = this.indices;

    this.getModel = function(type) {
      var req = new XMLHttpRequest();
      var uri = '/search/' + type + '.json';
      var modelData;
      req.open('GET', uri, true);

      req.onload = function() {
        if (this.status >= 200 && this.status < 400) {
          modelData = JSON.parse(this.response);
          models[type] = modelData;
        } else {
          console.log('ERROR: Received failing status code ' + this.status + ' for GET ' + uri);
        }
      }

      req.onerror = function() {
        console.log('ERROR: Failed to load ' + uri);
      }

      req.send();
    }

    types.forEach(function(type) { this.getModel(type) });

    this.build = function() {
      if (models['announcements']) {
        models['announcements'].forEach(function(m) {
          indices['announcements'].add({
            id: m['id'],
            title: m['title'],
            description: m['description'],
            content: m['content'],
            tags: m['tags'].join(' ')
          });
        })
      }

      if (models['articles']) {
        models['articles'].forEach(function(m) {
          indices['articles'].add({
            id: m['id'],
            title: m['title'],
            description: m['description'],
            content: m['content'],
            tags: m['tags'].join(' '),
            categories: m['categories'].join(' '),
            authors: m['authors'].join(' ')
          });
        });
      }

      if (models['pages']) {
        models['pages'].forEach(function(m) {
          indices['pages'].add({
            id: m['id'],
            title: m['title'],
            description: m['description'],
            content: m['content']
          });
        });
      }

      if (models['staff']) {
        models['staff'].forEach(function(m) {
          indices['staff'].add({
            id: m['id'],
            title: m['title'],
            roles: m['roles'].join(' '),
            bio: m['bio']
          });
        });
      }
    };

    this.search = function(query, types) {
      var resultsMap = {};
      var results;
      types.forEach(function(type) {
        results = indices[type].search(query);
        if (results.length) {
          resultsMap[type] = results;
        }
      });
      return resultsMap;
    };

    this.announcements = indices['announcements'];
    this.articles = indices['articles'];
    this.pages = indices['pages'];
    this.staff = indices['staff'];


    return instance;
  }
}());

// And a singleton search agent
var ColMagSearchAgent;
(function(){
  var instance;

  ColMagSearchAgent = function ColMagSearchAgent() {
    if (instance) {
      return instance;
    };

    instance = this;

    this.registerIndex = function(index) {
      this.index = index;
    };

    // TODO: Add render methods
    // TODO: Add url getting and setting methods

    return instance;
  }
}());

var searchAgent = ColMagSearchAgent();
searchAgent.registerIndex(ColMagSearchIndex());
