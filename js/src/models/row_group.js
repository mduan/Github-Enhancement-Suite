(function() {

var LineNum = Globals.Models.LineNum;
var Row = Globals.Models.Row;
var Rows = Globals.Models.Rows;
var assert = Globals.Utils.assert;

var RowGroups = Backbone.Collection.extend({
  model: RowGroup,

  add: function(model, options) {
    // Currently not supporting adding array of models for simplicity
    assert(model instanceof RowGroup);
    if (this.size()) {
      model.set('prev', this.last(), { silent: true });
      this.last().set('next', model, { silent: true });
    }
    this._super('add', model, options);
  },

  insertAfter: function(prevRowGroup, rowGroup) {
    if (!prevRowGroup) {
      if (this.size()) {
        model.set('next', this.first(), { silent: true });
        this.first().set('prev', model, { silent: true });
      }
      this.add(rowGroup, { at: 0 });
    } else {
      var index = this.indexOf(prevRowGroup);
      assert(index >= 0);
      this.models[index].set('next', rowGroup, { silent: true });
      rowGroup.set('prev', this.models[index], { silent: true });
      if (index + 1 < this.size()) {
        // There's another row group after.
        this.models[index + 1].set('prev', rowGroup, { silent: true });
        rowGroup.set('next', this.models[index + 1], { silent: true });
      }
      this.add(rowGroup, { at: index + 1 });
    }
  },
});

var RowGroup = Backbone.Model.extend({
  defaults: function() {
    return {
      type: 0,
      deletedRows: new Rows(),
      insertedRows: new Rows(),
    };
  },

  initialize: function(params) {
    this._super('initialize', params);
    assert(this.isValidType());
    assert(this.get('deletedRows') instanceof Rows);
    assert(this.get('insertedRows') instanceof Rows);
    this.propagateChange('deletedRows');
    this.propagateChange('insertedRows');
  },

  addDeletedRow: function(row) {
    this.validateRow(row);
    this.get('deletedRows').add(row);
  },

  addInsertedRow: function(row) {
    this.validateRow(row);
    this.get('insertedRows').add(row);
  },

  getDeletedRange: function() {
    return this.get('deletedRows').getRange();
  },

  getInsertedRange: function() {
    return this.get('insertedRows').getRange();
  },

  isValidType: function() {
    return this.isUnchangedType() || this.isChangedType();
  },

  isUnchangedType: function() {
    return this.get('type') === RowGroup.Type.UNCHANGED;
  },

  isChangedType: function() {
    return this.get('type') === RowGroup.Type.CHANGED;
  },

  validateRow: function(row, mode) {
    if (this.isUnchangedType()) {
      assert(row.isUnchangedType());
    } else /* CHANGED */ {
      assert(row.isDeletedType() || row.isInsertedType());
    }
  },

  getPrevDeletedIdx: function(rowGroup) {
    var rowGroup = this;
    while (rowGroup) {
      if (rowGroup.get('deletedRows').size()) {
        return rowGroup.getDeletedRange()[1];
      }
      rowGroup = rowGroup.get('prev');
    }
    return 0;
  },

  getPrevInsertedIdx: function(rowGroup) {
    var rowGroup = this;
    while (rowGroup) {
      if (rowGroup.get('insertedRows').size()) {
        return rowGroup.getInsertedRange()[1];
      }
      rowGroup = rowGroup.get('prev');
    }
    return 0;
  },

  getNextDeletedIdx: function(rowGroup) {
    var rowGroup = this;
    while (rowGroup) {
      if (rowGroup.get('deletedRows').size()) {
        return rowGroup.getDeletedRange()[0];
      }
      rowGroup = rowGroup.get('next');
    }
    return NaN;
  },

  getNextInsertedIdx: function(rowGroup) {
    var rowGroup = this;
    while (rowGroup) {
      if (rowGroup.get('insertedRows').size()) {
        return rowGroup.getInsertedRange()[0];
      }
      rowGroup = rowGroup.get('next');
    }
    return NaN;
  },
});

RowGroup.Type = {
  UNCHANGED: 1,
  CHANGED: 2,
};


RowGroup.getMissingRangeInfo = function(prevRowGroup, nextRowGroup, numLines) {
  assert(prevRowGroup || nextRowGroup);

  if (!prevRowGroup) {
    var position = 'first';
    if (nextRowGroup.get('deletedRows').size() &&
        nextRowGroup.get('insertedRows').size()) {
      var deletedRange = nextRowGroup.getDeletedRange();
      var insertedRange = nextRowGroup.getInsertedRange();
      assert(deletedRange[0] === insertedRange[0]);
      var length = deletedRange[0];
    } else if (nextRowGroup.get('deletedRows').size()) {
      var length = deletedRange[0];
    } else {
      assert(nextRowGroup.get('insertedRows').size());
      var length = insertedRange[0];
    }
    var deletedIdx = 0;
    var insertedIdx = 0;
  } else if (!nextRowGroup) {
    var position = 'last';
    var deletedIdx = prevRowGroup.getPrevDeletedIdx();
    var insertedIdx = prevRowGroup.getPrevInsertedIdx();
    // numLines refers to number of lines in new (inserted) file, which
    // is why we take difference with insertedidx to get length of
    // the missing range.
    var length = _.isInt(numLines) ? numLines - insertedIdx : NaN;
  } else {
    position = 'middle';
    var deletedIdx = prevRowGroup.getPrevDeletedIdx();
    var insertedIdx = prevRowGroup.getPrevInsertedIdx();

    var nextDeletedIdx = nextRowGroup.getNextDeletedIdx();
    var nextInsertedIdx = nextRowGroup.getNextInsertedIdx();
    if (_.isInt(nextDeletedIdx) && _.isInt(nextInsertedIdx)) {
      assert((nextDeletedIdx - deletedIdx) ===
             (nextInsertedIdx - insertedIdx));
    }

    if (_.isInt(nextDeletedIdx)) {
      var length = nextDeletedIdx - deletedIdx;
    } else {
      assert(_.isInt(nextInsertedIdx));
      var length = nextInsertedIdx - insertedIdx;
    }
  }

  return {
    position: position,
    deletedIdx: deletedIdx,
    insertedIdx: insertedIdx,
    length: length,
  };
};

RowGroup.createRowGroup = function(fileLines, showRange) {
  var rowGroup = new RowGroup({
    type: RowGroup.Type.UNCHANGED,
  });
  for (var i = 0; i < showRange.length; ++i) {
    var currDeletedIdx = showRange.deletedIdx + i;
    var currInsertedIdx = showRange.insertedIdx + i;
    var fileLine = fileLines[currInsertedIdx];
    fileLine = $('<div/>').text(' ' + fileLine).html();
    fileLine = fileLine
      .replace(/ /g, '&nbsp;')
      .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');

    var row = new Row({
      type: Row.Type.UNCHANGED,
      lineNum: new LineNum({ idx: currDeletedIdx }),
      text: fileLine,
    });
    rowGroup.addDeletedRow(row);

    var row = new Row({
      type: Row.Type.UNCHANGED,
      lineNum: new LineNum({ idx: currInsertedIdx }),
      text: fileLine,
    });
    rowGroup.addInsertedRow(row);
  }
  return rowGroup;
};

RowGroup.hasMissingRange = function(prevRowGroup, rowGroup) {
  if (prevRowGroup) {
    if (rowGroup.get('deletedRows').size() &&
        prevRowGroup.get('deletedRows').size()) {
      var prevEndIdx = prevRowGroup.getDeletedRange()[1];
      var currBeginIdx = rowGroup.getDeletedRange()[0];
    } else {
      assert(rowGroup.get('insertedRows').size() &&
             prevRowGroup.get('insertedRows').size());
      var prevEndIdx = prevRowGroup.getInsertedRange()[1];
      var currBeginIdx = rowGroup.getInsertedRange()[0];
    }
  } else {
    var prevEndIdx = 0;
    if (rowGroup.get('deletedRows').size()) {
      var currBeginIdx = rowGroup.getDeletedRange()[0];
    } else {
      assert(rowGroup.get('insertedRows').size());
      var currBeginIdx = rowGroup.getInsertedRange()[0];
    }
  }

  if (currBeginIdx > prevEndIdx) {
    // We have a missing range
    return true;
  }

  assert(currBeginIdx === prevEndIdx);
  return false;
};


Globals.Models.RowGroups = RowGroups;
Globals.Models.RowGroup = RowGroup;


// TODO(mack): Consider keeping linked list implementation if efficiency is
// important
//RowGroups.prototype.append = function(rowGroup) {
//  if (!this.firstRowGroup || !this.lastRowGroup) {
//    assert(!this.firstRowGroup && !this.lastRowGroup);
//    rowGroup.prev = null;
//    rowGroup.next = null;
//    this.firstRowGroup = rowGroup;
//    this.lastRowGroup = rowGroup;
//    return;
//  }
//
//  var prevRowGroup = this.lastRowGroup;
//  prevRowGroup.next = rowGroup;
//  rowGroup.prev = prevRowGroup;
//  this.lastRowGroup = rowGroup;
//};
//
//RowGroups.prototype.insertAfter = function(prevRowGroup, rowGroup) {
//  if (!prevRowGroup) {
//    // Add to head of linked list
//    var prevFirst = this.firstRowGroup;
//    rowGroup.next = prevFirst;
//    prevFirst.prev = rowGroup;
//    this.firstRowGroup = rowGroup;
//  } else if (prevRowGroup === this.lastRowGroup) {
//    // Add to tail of linked list
//    var prevLast = this.lastRowGroup;
//    prevLast.next = rowGroup;
//    rowGroup.prev = prevLast;
//    rowGroup.next = null;
//    this.lastRowGroup = rowGroup;
//  } else {
//    // Add to middle of linked list
//    var nextRowGroup = prevRowGroup.next;
//    prevRowGroup.next = rowGroup;
//    nextRowGroup.prev = rowGroup;
//    rowGroup.prev = prevRowGroup;
//    rowGroup.next = nextRowGroup;
//  }
//};
//
//RowGroups.prototype.iterator = function() {
//  return new RowGroupIterator(this.firstRowGroup);
//}

//function RowGroupIterator(firstRowGroup) {
//  assert(firstRowGroup);
//  this.prev = null;
//  this.curr = null;
//  this.firstRowGroup = firstRowGroup;
//}
//
//RowGroupIterator.prototype.next = function() {
//  if (!this.curr && !this.prev) {
//    // Before first element
//    this.curr = this.firstRowGroup;
//  } else if (!this.curr && this.prev) {
//    // After last element
//  } else {
//    this.prev = this.curr;
//    this.curr = this.curr.next;
//  }
//  return this.curr;
//};
//
//RowGroupIterator.prototype.prev = function() {
//  if (!this.curr && !this.prev) {
//    // Before first element
//  } else if (this.curr && !this.prev) {
//    // At first element
//    this.curr = this.prev;
//  } else {
//    this.curr = this.prev;
//    this.prev = this.prev.prev;
//  }
//  return this.curr;
//};
//
//RowGroupIterator.prototype.hasNext = function() {
//  return this.curr && this.curr.next ||
//    (!this.prev && !this.curr /* this implies we're before first element */);
//};
//
//RowGroupIterator.prototype.hasPrev = function() {
//  return this.prev;
//};

})();
