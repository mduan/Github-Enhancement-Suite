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
  ExtendedModel.lookup = function(id) {
    return this._items[id];
  };
  ExtendedModel.remove = function(id) {
    assert(this.hasOwnProperty(id));
    delete this._items[id];
  };

  ExtendedModel.prototype.initialize = function(params) {
    this._super('initialize', params);
    ExtendedModel.register(this.cid, this);
  };

  return ExtendedModel;
};

Backbone.Model.prototype._super = function(funcName) {
  return this.constructor.__super__[funcName].apply(this, _.rest(arguments));
};


Globals.Models = {};

})();
