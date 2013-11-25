(function() {

var assert = Globals.Utils.assert;

var LineNum = Backbone.Model.extend({
  defaults: function() {
    return {
      idx: NaN,
      htmlId: '',
      dataNum: NaN,
    };
  },

  initialize: function(params) {
    this._super('initialize', params);
    assert(_.isInt(this.get('idx')));
    assert(_.isString(this.get('htmlId')));
    assert(_.isInt(this.get('dataNum')) || _.isNaN(this.get('dataNum')));
  },
});

var Comment = Backbone.Model.extend({
  defaults: function() {
    return {
      $text: null,
      count: NaN,
      showForm: false,
      row: null,
    };
  },

  initialize: function(params) {
    this._super('initialize', params);
    assert(this.get('$text') instanceof jQuery);
    assert(_.isInt(this.get('count')));
    assert(_.isBoolean(this.get('showForm')));
    assert(this.get('row') instanceof Row);
  },
});

var Row = Backbone.Model.extend({
  defaults: function() {
    return {
      type: 0,
      text: '',
      position: NaN,
      commentUrl: null,
      comment: null,
      lineNum: null,
    };
  },

  initialize: function(params) {
    this._super('initialize', params);
    assert(this.isValidType());
    assert(_.isString(this.get('text')));
    assert(_.isInt(this.get('position')) || _.isNaN(this.get('position')));
    assert(!this.has('commentUrl') || _.isString(this.get('commentUrl')));
    assert(!this.has('comment') || this.get('comment') instanceof Comment);
    assert(this.get('lineNum') instanceof LineNum);

    this.propagateChange('comment');
    this.propagateChange('lineNum');
  },

  isValidType: function() {
    return this.isUnchangedType() || this.isDeletedType() || this.isInsertedType();
  },

  isUnchangedType: function() {
    return this.get('type') === Row.Type.UNCHANGED;
  },

  isDeletedType: function() {
    return this.get('type') === Row.Type.DELETED;
  },

  isInsertedType: function() {
    return this.get('type') === Row.Type.INSERTED;
  },

  getLineIdx: function() {
    return this.get('lineNum').get('idx');
  },
});

Row.Type = {
  UNCHANGED: 1,
  DELETED: 2,
  INSERTED: 3,
};

var Rows = Backbone.Collection.extend({
  model: Row,

  getRange: function() {
    if (!this.size()) {
      return [];
    }
    return [this.models.first().getLineIdx(),
            this.models.last().getLineIdx() + 1];
  }
});

Globals.Models.LineNum = LineNum;
Globals.Models.Comment = Comment;
Globals.Models.Row = Row;
Globals.Models.Rows = Rows;

})();
