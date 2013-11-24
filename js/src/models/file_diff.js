(function() {

var Comment = Globals.Models.Comment;
var LineNum = Globals.Models.LineNum;
var Row = Globals.Models.Row;
var RowGroup = Globals.Models.RowGroup;
var RowGroups = Globals.Models.RowGroups;
var assert = Globals.Utils.assert;

var FileDiffs = Backbone.Collection.extend({
  model: FileDiff,
});

var FileDiff = Backbone.Model.extend({
  defaults: function() {
    return {
      rawUrl: '',
      rowGroups: new RowGroups(),
    };
  },

  initialize: function(params) {
    this._super('initialize', params);
    assert(this.get('rawUrl') && _.isString(this.get('rawUrl')));
    assert(this.get('rowGroups') instanceof RowGroups);
  },

  fetchFile: function() {
    if (this.has('filePromise')) {
      return this.get('filePromise');
    }

    var filePromise = $.get(this.get('rawUrl')).then(function(data) {
      var fileLines = data.split(/\r?\n/);
      this.set('numLines', fileLines.length, { silent: true });
      return fileLines;
    }.bind(this));
    this.set('filePromise', filePromise, { silent: true });
    return filePromise;
  },

  // Returns whether our final row group includes up to the last line of
  // the file. This is useful for determining if we need to show any more
  // show remaining lines links
  hasLastRowGroup: function() {
    if (this.get('numLines') === 0) {
      return true;
    }
    var rowGroups = this.get('rowGroups').models;
    for (var idx = rowGroups.length - 1; idx >= 0; --idx) {
      var rowGroup  = rowGroups[idx];
      var insertedRows = rowGroup.get('insertedRows');
      if (!insertedRows.size()) {
        continue;
      }
      return this.get('numLines') === insertedRows.getRange()[1];
    }
  },
});


/**
 * The output format will be something like the following:
 *
 * [ alternating UnchangedRowGroup & ChangedRowGroup ]
 *
 * Where deletions and insertions are lists of 0 or more lines
 *
 */
FileDiff.createFileDiff = function($fileDiff) {

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
  var prevRow1;
  var prevRow2;
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

      if ($row.hasClass('gd')) {
        var rowStr = 'deleted';
        var rowType = Row.Type.DELETED;
        var groupType = RowGroup.Type.CHANGED;
      } else if ($row.hasClass('gi')) {
        var rowStr = 'inserted';
        var rowType = Row.Type.INSERTED;
        var groupType = RowGroup.Type.CHANGED;
      } else {
        var rowStr = 'unchanged';
        var rowType = Row.Type.UNCHANGED;
        var groupType = RowGroup.Type.UNCHANGED;
      }

      if (!currGroup || (currGroup.get('type') !== groupType)) {
        currGroup = new RowGroup({ type: groupType });
        fileDiff.get('rowGroups').add(currGroup);
      }

      var $cells = $row.find('td');
      var codeData = parseCodeCell($cells.eq(2));
      var rowText = codeData.text;
      var commentUrl = codeData.commentUrl;
      // Internal concept that is used to associate a comment with a row
      var rowPosition = $row.data('position');

      // For unchanged rows, we insert 2 rows for it to reprsent the two sides
      // of it in a side-by-side view. The main thing that differs between the
      // two entries is the line number.
      if (rowType === Row.Type.DELETED || rowType === Row.Type.UNCHANGED) {
        var deletedLineNum = parseLineNumberCell($cells.eq(0));
        var row = new Row({
          type: rowType,
          lineNum: deletedLineNum,
          text: rowText,
          commentUrl: commentUrl,
          position: rowPosition,
        });
        currGroup.addDeletedRow(row);
        prevRow1 = row;
      } else {
        prevRow1 = null;
      }
      if (rowType === Row.Type.INSERTED || rowType === Row.Type.UNCHANGED) {
        var insertedLineNum = parseLineNumberCell($cells.eq(1));
        var row = new Row({
          type: rowType,
          lineNum: insertedLineNum,
          text: rowText,
          commentUrl: commentUrl,
          position: rowPosition,
        });
        currGroup.addInsertedRow(row);
        prevRow2 = row;
      } else {
        prevRow2 = null;
      }
    } else {
      assert($row.hasClass('inline-comments'));
      assert($row.prev().hasClass('file-diff-line'));
      // TODO(mack): Consider creating JSX representing element rather than
      // cloning
      // TODO(mack): Set the row on comment when doing row.set('comment', comment);
      if (prevRow1) {
        var comment = new Comment({
          count: parseInt($row.find('.comment-count').text(), 10),
          $text: $row.find('.line-comments').clone(),
          showForm: false,
          row: prevRow1,
        });
        prevRow1.set('comment', comment);
      }
      if (prevRow2 && !prevRow2.isUnchangedType()) {
        // For unchanged row, the comment will only be stored in the left column
        // since that is the column that will end up displaying the column.
        var comment = new Comment({
          count: parseInt($row.find('.comment-count').text(), 10),
          $text: $row.find('.line-comments').clone(),
          showForm: false,
          row: prevRow2,
        });
        prevRow2.set('comment', comment);
      }
    }
  });

  //var $lineNumber = $fileDiff.find('.diff-line-num:first').eq(0);
  //rows.fileIndex = parseInt($lineNumber.attr('id').match(/^L(\d+)/)[1], 10);
  return fileDiff;
};

/**
 * Helper functions below
 */

function parseLineNumberCell($cell) {
  return new LineNum({
    htmlId: $cell.attr('id'),
    dataNum: parseInt($cell.attr('data-line-number'), 10),
    idx: parseInt($cell.text(), 10) - 1,
  });
}

function parseCodeCell($cell) {
  return {
    commentUrl: $cell.find('.add-line-comment').attr('data-remote'),
    text: $cell.find('.diff-line-pre').html(),
  };
}


Globals.Models.FileDiff = FileDiff;
Globals.Models.FileDiffs = FileDiffs;

})();
