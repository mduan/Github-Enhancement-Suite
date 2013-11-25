(function() {

var assert = Globals.Utils.assert;

// Monkey patch Backbone.Model with some useful features
var origExtend = Backbone.Model.extend;
Backbone.Model.extend = function() {
  var ExtendedModel = origExtend.apply(this, arguments);

  ExtendedModel._items = {};
  // TODO(mack): Look to create these methods on the prototype
  ExtendedModel.register = function(id, object) {
    assert(object instanceof ExtendedModel);
    this._items[id] = object;
  };

  ExtendedModel.find = function(id) {
    return this._items[id];
  };

  ExtendedModel.get = function(id) {
    var item = this._items[id];
    assert(item instanceof ExtendedModel);
    return item;
  };

  ExtendedModel.remove = function(id) {
    assert(this.hasOwnProperty(id));
    delete this._items[id];
  };

  var origInitialize = ExtendedModel.prototype.initialize;
  ExtendedModel.prototype.initialize = function(params) {
    this._super('initialize', params);
    origInitialize.call(this, params);
    ExtendedModel.register(this.cid, this);
  };

  ExtendedModel.prototype._onChildChange = function(eventName) {
    this.trigger('change');
  };

  ExtendedModel.prototype.propagateChange = function(field) {
    if (this.has(field)) {
      this.get(field).on('all', this._onChildChange, this);
    }
    this.on('change:' + field, function() {
      if (this.has(field)) {
        this.get(field).on('all', this._onChildChange, this);
      }
      if (this.previous(field)) {
        this.previous(field).off('all', this._onChildChange);
      }
    }.bind(this));
  };

  return ExtendedModel;
};

Backbone.Model.prototype._super = function(funcName) {
  return this.constructor.__super__[funcName].apply(this, _.rest(arguments));
};


Globals.Models = {};

})();
