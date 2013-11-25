(function () {

var FileDiffs = Globals.Models.FileDiffs;
var assert = Globals.Utils.assert;

var DiffViewer = Backbone.Model.extend({
  defaults: function() {
    return {
      sideBySide: false,
      wordWrap: false,
      numLinesToShow: 20,
    };
  },

  initialize: function(params) {
    this._super('initialize', params);
    assert(_.isBoolean(this.get('sideBySide')));
    assert(_.isBoolean(this.get('wordWrap')));
    assert(_.isInt(this.get('numLinesToShow')));
  },
});

Globals.Models.DiffViewer = DiffViewer;

})();
