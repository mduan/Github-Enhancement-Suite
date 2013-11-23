(function() {

var LineNum = Globals.Models.LineNum;
var Row = Globals.Models.Row;
var Rows = Globals.Models.Rows;
var assert = Globals.Utils.assert;

var RowGroups = Backbone.Collection.extend({
  model: RowGroup,

  insertAfter: function(prevRowGroup, rowGroup) {
    if (!prevRowGroup) {
      this.add(rowGroup, { at: 0 });
    } else {
      var index = this.indexOf(prevRowGroup);
      assert(index >= 0);
      this.add(rowGroup, { at: index + 1 });
    }
  }
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
});

RowGroup.Type = {
  UNCHANGED: 1,
  CHANGED: 2,
};

RowGroup.getMissingRangeInfo = function(prevRowGroup, nextRowGroup, numLines) {
  assert(prevRowGroup || nextRowGroup);

  if (!prevRowGroup) {
    var position = 'first';
    var deletedRange = nextRowGroup.getDeletedRange();
    var insertedRange = nextRowGroup.getInsertedRange();
    assert(deletedRange[0] === insertedRange[0]);

    var deletedIdx = 0;
    var insertedIdx = 0;
    var length = deletedRange[0];
  } else if (!nextRowGroup) {
    var position = 'last';
    var deletedRange = prevRowGroup.getDeletedRange();
    var insertedRange = prevRowGroup.getInsertedRange();

    var deletedIdx = deletedRange[1];
    var insertedIdx = insertedRange[1];
    var length = _.isInt(numLines) ? numLines - insertedIdx : NaN;
  } else {
    position = 'middle';
    var prevDeletedRange = prevRowGroup.getDeletedRange();
    var prevInsertedRange = prevRowGroup.getInsertedRange();
    var nextDeletedRange = nextRowGroup.getDeletedRange();
    var nextInsertedRange = nextRowGroup.getInsertedRange();
    assert((nextDeletedRange[0] - prevDeletedRange[1]) ===
           (nextInsertedRange[0] - prevInsertedRange[1]));

    var deletedIdx = prevDeletedRange[1];
    var insertedIdx = prevInsertedRange[1];
    var length = nextDeletedRange[0] - prevDeletedRange[1];
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
}


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
