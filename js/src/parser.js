(function() {

var assert = Globals.Utils.assert;
var inherit = Globals.Utils.inherit;

/**
 * Class types below here
 */


function LineNum(params) {
  this.idx = params.idx;
  this.id = params.id;
  this.dataNum = params.dataNum;
}

function Comment(params) {
  this.$text = params.$text;
  this.$count = params.$count;
}

function Row(params) {
  this.text = params.text;
  this.commentUrl = params.commentUrl;
  this.position = params.position;
  this.lineNum = params.lineNum;
}

function InsertedRow() {
  InsertedRow.parent.constructor.apply(this, arguments);
}
inherit(InsertedRow, Row, {});

function DeletedRow() {
  DeletedRow.parent.constructor.apply(this, arguments);
}
inherit(DeletedRow, Row, {});

function UnchangedRow() {
  UnchangedRow.parent.constructor.apply(this, arguments);
}
inherit(UnchangedRow, Row, {});

function RowGroup() {
  this.insertedRows = [];
  this.deletedRows = [];
  this.prev = null;
  this.next = null;
}
RowGroup.prototype.addInsertedRow = function(row) {
  this.validateRow(row);
  this.insertedRows.push(row);
};

RowGroup.prototype.addDeletedRow = function(row) {
  this.validateRow(row);
  this.deletedRows.push(row);
};

RowGroup.prototype.getDeletedRange = function() {
  if (!this.deletedRows.length) {
    return [];
  }
  return [this.deletedRows.first().lineNum.idx,
          this.deletedRows.last().lineNum.idx + 1];
};

RowGroup.prototype.getInsertedRange = function() {
  if (!this.insertedRows.length) {
    return [];
  }
  return [this.insertedRows.first().lineNum.idx,
          this.insertedRows.last().lineNum.idx + 1];
};

function ChangedRowGroup() {
  ChangedRowGroup.parent.constructor.apply(this, arguments);
}
inherit(ChangedRowGroup, RowGroup, {
  validateRow: function(row) {
    assert(row instanceof InsertedRow || row instanceof DeletedRow);
  }
});

function UnchangedRowGroup() {
  UnchangedRowGroup.parent.constructor.apply(this, arguments);
}
inherit(UnchangedRowGroup, RowGroup, {
  validateRow: function(row) {
    assert(row instanceof UnchangedRow);
  }
});

function RowGroups() {
  this.firstRowGroup = null;
  this.lastRowGroup = null;
}

RowGroups.prototype.append = function(rowGroup) {
  if (!this.firstRowGroup || !this.lastRowGroup) {
    assert(!this.firstRowGroup && !this.lastRowGroup);
    rowGroup.prev = null;
    rowGroup.next = null;
    this.firstRowGroup = rowGroup;
    this.lastRowGroup = rowGroup;
    return;
  }

  var prevRowGroup = this.lastRowGroup;
  prevRowGroup.next = rowGroup;
  rowGroup.prev = prevRowGroup;
  this.lastRowGroup = rowGroup;
};

RowGroups.prototype.insertAfter = function(prevRowGroup, rowGroup) {
  if (!prevRowGroup) {
    // Add to head of linked list
    var prevFirst = this.firstRowGroup;
    rowGroup.next = prevFirst;
    prevFirst.prev = rowGroup;
    this.firstRowGroup = rowGroup;
  } else if (prevRowGroup === this.lastRowGroup) {
    // Add to tail of linked list
    var prevLast = this.lastRowGroup;
    prevLast.next = rowGroup;
    rowGroup.prev = prevLast;
    rowGroup.next = null;
    this.lastRowGroup = rowGroup;
  } else {
    // Add to middle of linked list
    var nextRowGroup = prevRowGroup.next;
    prevRowGroup.next = rowGroup;
    nextRowGroup.prev = rowGroup;
    rowGroup.prev = prevRowGroup;
    rowGroup.next = nextRowGroup;
  }
};

RowGroups.prototype.iterator = function() {
  return new RowGroupIterator(this.firstRowGroup);
}

function FileDiff(params) {
  this.rawUrl = params.rawUrl;
  this.rowGroups = new RowGroups();
}

FileDiff.prototype.getRowGroups = function() {
  return this.rowGroups;
}

function RowGroupIterator(firstRowGroup) {
  assert(firstRowGroup);
  this.prev = null;
  this.curr = null;
  this.firstRowGroup = firstRowGroup;
}

RowGroupIterator.prototype.next = function() {
  if (!this.curr && !this.prev) {
    // Before first element
    this.curr = this.firstRowGroup;
  } else if (!this.curr && this.prev) {
    // After last element
  } else {
    this.prev = this.curr;
    this.curr = this.curr.next;
  }
  return this.curr;
};

RowGroupIterator.prototype.prev = function() {
  if (!this.curr && !this.prev) {
    // Before first element
  } else if (this.curr && !this.prev) {
    // At first element
    this.curr = this.prev;
  } else {
    this.curr = this.prev;
    this.prev = this.prev.prev;
  }
  return this.curr;
};

RowGroupIterator.prototype.hasNext = function() {
  return this.curr && this.curr.next ||
    (!this.prev && !this.curr /* this implies we're before first element */);
};

RowGroupIterator.prototype.hasPrev = function() {
  return this.prev;
};

/**
 * The output format will be something like the following:
 *
 * [ alternating UnchangedRowGroup & ChangedRowGroup ]
 *
 * Where deletions and insertions are lists of 0 or more lines
 *
 */
function parseFileDiff($fileDiff) {

  var $file = $fileDiff.closest('.file');
  var $viewFileButton = $file.find('.meta .actions .minibutton');
  var blobUrl = $viewFileButton.attr('href');
  // TODO(mack): Be careful of '/blob/' as user or repo name
  var rawUrl = blobUrl.replace(/^\/(.*?)\/blob\/(.*)$/,
      'https://github.com/$1/raw/$2');
  var fileDiff = new FileDiff({
    rawUrl: rawUrl,
  });

  var currGroup;
  var prevRow;
  $fileDiff.find('tr').each(function() {
    var $row = $(this);

    if ($row.hasClass('file-diff-line')) {
      // Ignore rows that serve as comments (i.e. the gray rows that describe
      // the diff)
      if ($row.hasClass('gc')) {
        // Unset current RowGroup, so we start new group for next row.
        currGroup = null;
        return;
      }

      if ($row.hasClass('gi')) {
        var rowStr = 'inserted';
        var rowType = InsertedRow;
        var currGroupType = ChangedRowGroup;
      } else if ($row.hasClass('gd')) {
        var rowStr = 'deleted';
        var rowType = DeletedRow;
        var currGroupType = ChangedRowGroup;
      } else {
        var rowStr = 'unchanged';
        var rowType = UnchangedRow;
        var currGroupType = UnchangedRowGroup;
      }

      if (!currGroup || !(currGroup instanceof currGroupType)) {
        currGroup = new currGroupType();
        fileDiff.getRowGroups().append(currGroup);
      }

      // var row = { cells: [] };
      var $cells = $row.find('td');
      var codeData = parseCodeCell($cells.eq(2));
      var rowText = codeData.text;
      var commentUrl = codeData.commentUrl;
      var deletedLineNum = parseLineNumberCell($cells.eq(0));
      var insertedLineNum = parseLineNumberCell($cells.eq(1));
      // Internal concept that is used to associate a comment with a row
      var rowPosition = $row.data('position');
      if (rowStr === 'deleted' || rowStr === 'unchanged') {
        var row = new rowType({
          lineNum: deletedLineNum,
          text: rowText,
          commentUrl: commentUrl,
          position: rowPosition,
        });
        currGroup.addDeletedRow(row);
      }

      if (rowStr === 'inserted' || rowStr === 'unchanged') {
        var row = new rowType({
          lineNum: insertedLineNum,
          text: rowText,
          commentUrl: commentUrl,
          position: rowPosition,
        });
        currGroup.addInsertedRow(row);
      }
    } else if ($row.hasClass('inline-comments')) {
      // TODO(mack): Consider creating JSX representing element rather than
      // cloning
      var comment = new Comment({
        $count: $row.find('.comment-count').clone(),
        $text: $row.find('.line-comments').clone(),
      });
      prevRow.comment = comment;
    } else {
      assert(false);
    }
  });

  //var $lineNumber = $fileDiff.find('.diff-line-num:first').eq(0);
  //rows.fileIndex = parseInt($lineNumber.attr('id').match(/^L(\d+)/)[1], 10);
  return fileDiff;
}

/**
 * Helper functions below
 */

function parseLineNumberCell($cell) {
  return new LineNum({
    id: $cell.attr('id'),
    dataNum: parseInt($cell.attr('data-line-number'), 10),
    idx: parseInt($cell.text(), 10) - 1,
  });
}

function parseCodeCell($cell) {
  var $clone = $cell.clone();
  $clone.find('.add-line-comment').remove();
  return {
    commentUrl: $cell.find('.add-line-comment').attr('data-remote'),
    text: $clone.html()
  };
}

Globals.Parser = {
  FileDiff: FileDiff,
  UnchangedRowGroup: UnchangedRowGroup,
  ChangedRowGroup: ChangedRowGroup,
  UnchangedRow: UnchangedRow,
  DeletedRow: DeletedRow,
  InsertedRow: InsertedRow,
  Comment: Comment,
  LineNum: LineNum,

  parseFileDiff: parseFileDiff,
};

})();
