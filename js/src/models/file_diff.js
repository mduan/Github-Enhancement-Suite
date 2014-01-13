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
      id: null,
      rawUrl: null,
      rowGroups: new RowGroups(),
    };
  },

  initialize: function(params) {
    this._super('initialize', params);
    assert(this.get('rawUrl') && _.isString(this.get('rawUrl')));
    assert(this.get('rowGroups') instanceof RowGroups);
    assert(this.get('id') && _.isString(this.get('id')));
    this.propagateChange('rowGroups');
  },

  fetchFile: function() {
    if (this.has('insertedLines')) {
      var deferred = $.Deferred();
      deferred.resolve();
      return deferred.promise();
    }

    var promise = $.get(this.get('rawUrl')).then(function(insertedData) {
      var insertedLines = insertedData.split(/\r?\n/);

      var deletedLines = this.get('deletedLines');
      var deletedData = '';
      var currLineIdx = 0;
      this.get('rowGroups').each(function(rowGroup) {
        var insertedRows = rowGroup.get('insertedRows');
        var insertedRange = insertedRows.getRange();

        for (currLineIdx; currLineIdx < insertedRange[0]; ++currLineIdx) {
          deletedData += insertedLines[currLineIdx] + '\n';
        }

        var deletedRows = rowGroup.get('deletedRows');
        var deletedRange = deletedRows.getRange();
        for (var delIdx = deletedRange[0]; delIdx < deletedRange[1]; ++delIdx) {
          deletedData += deletedLines[delIdx] + '\n';
        }

        var lineRangeSize = insertedRange[1] - insertedRange[0];
        currLineIdx += lineRangeSize;
      });

      for (currLineIdx; currLineIdx < insertedLines.length; ++currLineIdx) {
        deletedData += insertedLines[currLineIdx] + '\n';
      }
      if (deletedData) {
        deletedData = deletedData.substring(0, deletedData.length - 1);
      }

      var hlInsertedData = hljs.highlightAuto(insertedData).value;
      var hlInsertedLines = hlInsertedData.split(/\r?\n/);

      var deletedLines = deletedData.split(/\r?\n/);
      var hlDeletedData = hljs.highlightAuto(deletedData).value;
      var hlDeletedLines = hlDeletedData.split(/\r?\n/);

      assert(deletedLines.length === hlDeletedLines.length);
      assert(insertedLines.length === hlInsertedLines.length);
      this.set('deletedLines', deletedLines, { silent: true });
      this.set('insertedLines', insertedLines, { silent: true });
      this.set('hlDeletedLines', hlDeletedLines, { silent: true });
      this.set('hlInsertedLines', hlInsertedLines, { silent: true });

    }.bind(this));

    return promise;
  },

  getNumLines: function() {
    // TODO(mack): The raw text that's returned sometimes includes an extra
    // empty line. To know if it includes the extra line, we'd need to view
    // the non-raw view of the file, and see what the last row is.
    return this.get('insertedLines').length;
  },

  // Returns whether our final row group includes up to the last line of
  // the file. This is useful for determining if we need to show any more
  // show remaining lines links
  hasLastRowGroup: function() {
    assert(this.get('rowGroups').size());
    return this.getNumLines() === this.get('rowGroups').last().getPrevInsertedIdx();
  },

  hasInsertedAndDeletedRows: function() {
    var hasInserted = false;
    var hasDeleted = false;
    this.get('rowGroups').each(function(rowGroup) {
      if (rowGroup.isChangedType()) {
        if (rowGroup.get('insertedRows').size()) {
          hasInserted = true;
        }
        if (rowGroup.get('deletedRows').size()) {
          hasDeleted = true;
        }
      }
      if (hasInserted && hasDeleted) {
        return false;
      }
    });
    return hasInserted && hasDeleted;
  },

  getCode: function(params) {
    if (params.side === Row.Side.LEFT) {
      if (params.syntaxHighlight) {
        return this.get('hlDeletedLines')[params.lineIdx];
      } else {
        return this.get('deletedLines')[params.lineIdx];
      }
    } else {
      assert(params.side === Row.Side.RIGHT);
      if (params.syntaxHighlight) {
        return this.get('hlInsertedLines')[params.lineIdx];
      } else {
        return this.get('insertedLines')[params.lineIdx];
      }
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
FileDiff.createFileDiff = function($file, diffViewer) {

  var $fileDiff = $file.find('.file-diff');
  var filePath = $file.find('.meta').attr('data-path');

  var commitHash = null;
  $file.find('.button-group a').each(function() {
    var $el = $(this);
    var href = $el.attr('href');
    if (!href) {
      return;
    }

    var matches = href.match('/(.+?)/(.+?)/blob/(.+?)/' + filePath);
    if (matches) {
      commitHash = matches[3];
      return false;
    }
  });
  var rawUrl = ('https://github.com/'
    + diffViewer.get('author') + '/'
    + diffViewer.get('repo') + '/'
    + 'raw/'
    + commitHash + '/'
    + filePath);

  var extension = filePath.substring(filePath.lastIndexOf('.') + 1);
  var fileDiff = new FileDiff({
    id: $file.attr('id'),
    rawUrl: rawUrl,
    extension: extension,
    filePath: filePath,
  });
  // The deleted lines need to be stored since we only fetch the new
  // (inserted) file.
  var deletedLines = [];
  fileDiff.set('deletedLines', deletedLines, { silent: true });

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

      var $cells = $row.find('td');
      var codeData = parseCodeCell($cells.eq(2));
      if ($row.hasClass('gd')) {
        var rowType = Row.Type.DELETED;
        var groupType = RowGroup.Type.CHANGED;
      } else if ($row.hasClass('gi')) {
        var rowType = Row.Type.INSERTED;
        var groupType = RowGroup.Type.CHANGED;
      } else {
        var rowType = Row.Type.UNCHANGED;
        var groupType = RowGroup.Type.UNCHANGED;
      }

      if (!currGroup || (currGroup.get('type') !== groupType)) {
        currGroup = new RowGroup({
          type: groupType,
          fileDiff: fileDiff,
        });
        fileDiff.get('rowGroups').add(currGroup);
      }

      var commentUrl = codeData.commentUrl;
      // Internal concept that is used to associate a comment with a row
      var rowPosition = $row.data('position');

      // For unchanged rows, we insert 2 rows for it to reprsent the two sides
      // of it in a side-by-side view. The main thing that differs between the
      // two entries is the line number.
      if (rowType === Row.Type.DELETED || rowType === Row.Type.UNCHANGED) {

        var deletedLineNum = parseLineNumberCell($cells.eq(0));
        var line = $('<div/>').html(codeData.text.substring(1)).text();
        deletedLines[deletedLineNum.get('idx')] = line;

        var row = new Row({
          type: rowType,
          side: Row.Side.LEFT,
          rowGroup: currGroup,
          lineNum: deletedLineNum,
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
          side: Row.Side.RIGHT,
          rowGroup: currGroup,
          lineNum: insertedLineNum,
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
