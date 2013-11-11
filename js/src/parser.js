(function() {

var Parser = Globals.Parser = {};

var assert = Globals.Utils.assert;

/**
 * Class types below here
 */

function FileDiff(params) {
  this.rowGroups = [];
  this.rawUrl = params.rawUrl;
}
FileDiff.prototype = {
  addRowGroup: function(rowGroup) {
    this.rowGroups.push(rowGroup);
  },
};

function UnchangedRowGroup() {
  this.rows = [];
}
UnchangedRowGroup.prototype = {
  addRow: function(row) {
    assert(row instanceof UnchangedRow);
    this.rows.push(row);
  },
};

function ChangedRowGroup() {
  this.insertedRows = [];
  this.deletedRows = [];
}
ChangedRowGroup.prototype = {
  addInsertedRow: function(row) {
    assert(row instanceof ChangedRow);
    this.insertedRows.push(row);
  },

  addDeletedRow: function(row) {
    assert(row instanceof ChangedRow);
    this.deletedRows.push(row);
  },
};

function UnchangedRow(params) {
  this.text = params.text;
  this.commentUrl = params.commentUrl;
  this.position = params.position;
  this.insertedLineNum = params.insertedLineNum;
  this.deletedLineNum = params.deletedLineNum;
}

function ChangedRow(params) {
  this.text = params.text;
  this.commentUrl = params.commentUrl;
  this.position = params.position;
  this.lineNum = params.lineNum;
}

function Comment(params) {
  this.$text = params.$text;
  this.$count = params.$count;
}

function LineNum(params) {
  this.num = params.num;
  this.id = params.id;
  this.dataNum = params.dataNum;
}

function parseLineNumberCell($cell) {
  return new LineNum({
    id: $cell.attr('id'),
    dataNum: parseInt($cell.attr('data-line-number'), 10),
    num: parseInt($cell.text(), 10),
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


/**
 * The output format will be something like the following:
 *
 * [ alternating UnchangedRowGroup & ChangedRowGroup ]
 *
 * Where deletions and insertions are lists of 0 or more lines
 *
 */
Parser.parseFileDiff = function($fileDiff) {

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
        return;
      }

      var rowType;
      var currGroupType;
      if ($row.hasClass('gi')) {
        rowType = 'inserted';
        currGroupType = ChangedRowGroup;
      } else if ($row.hasClass('gd')) {
        rowType = 'deleted';
        currGroupType = ChangedRowGroup;
      } else {
        rowType = 'unchanged';
        currGroupType = UnchangedRowGroup;
      }

      if (!currGroup || !(currGroup instanceof currGroupType)) {
        currGroup = new currGroupType();
        fileDiff.addRowGroup(currGroup);
      }

      // var row = { cells: [] };
      var $cells = $row.find('td');
      var row;
      var codeData = parseCodeCell($cells.eq(2));
      var rowText = codeData.text;
      var commentUrl = codeData.commentUrl;
      var deletedLineNum = parseLineNumberCell($cells.eq(0));
      var insertedLineNum = parseLineNumberCell($cells.eq(1));
      // Internal concept that is used to associate a comment with a row
      var rowPosition = $row.data('position');
      if (rowType === 'deleted') {
        row = new ChangedRow({
          lineNum: deletedLineNum,
          text: rowText,
          commentUrl: commentUrl,
          position: rowPosition,
        });
        currGroup.addDeletedRow(row);
      } else if (rowType === 'inserted') {
        row = new ChangedRow({
          lineNum: insertedLineNum,
          text: rowText,
          commentUrl: commentUrl,
          position: rowPosition,
        });
        currGroup.addInsertedRow(row);
      } else {
        row = new UnchangedRow({
          deletedLineNum: deletedLineNum,
          insertedLineNum: insertedLineNum,
          text: rowText,
          commentUrl: commentUrl,
          position: rowPosition,
        });
        currGroup.addRow(row);
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


})();
