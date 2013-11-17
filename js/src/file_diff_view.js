/** @jsx React.DOM */

(function() {

var Parser = Globals.Parser;
var FileDiff = Parser.FileDiff;
var UnchangedRowGroup = Parser.UnchangedRowGroup;
var ChangedRowGroup = Parser.ChangedRowGroup;
var UnchangedRow = Parser.UnchangedRow;
var ChangedRow = Parser.ChangedRow;
var InsertedRow = Parser.InsertedRow;
var DeletedRow = Parser.DeletedRow;
var Comment = Parser.Comment;
var LineNum = Parser.LineNum;

var assert = Globals.Utils.assert;
var isNum = Globals.Utils.isNum;

function getMissingRangeInfo(prevRowGroup, nextRowGroup, totalLines) {
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
    var length = isNum(totalLines) ? totalLines - insertedIdx : -1;
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
}

function getShowRowGroup(fileLines, showRange) {
  var rowGroup = new UnchangedRowGroup();
  for (var i = 0; i < showRange.length; ++i) {
    var fileLine = fileLines[showRange.insertedIdx + i];
    fileLine = $('<div/>').text(' ' + fileLine).html();
    fileLine = fileLine
      .replace(/ /g, '&nbsp;')
      .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');

    var row = new UnchangedRow({
      lineNum: new LineNum({ idx: showRange.deletedIdx }),
      text: fileLine,
      commentUrl: '',
      position: '',
    });
    rowGroup.addDeletedRow(row);

    var row = new UnchangedRow({
      lineNum: new LineNum({ idx: showRange.insertedIdx }),
      text: fileLine,
      commentUrl: '',
      position: '',
    });
    rowGroup.addInsertedRow(row);
  }
  return rowGroup;
}

var FileDiffView = React.createClass({

  getInitialState: function() {
    // Props initially has member fileDiff that is a FileDiff object
    var fileDiff = this.props.fileDiff;
    return {
      rawUrl: fileDiff.rawUrl,
      fileDiff: fileDiff,
    };
  },

  fetchFile: function() {
    if (this.state.fileDataPromise) {
      return this.state.fileDataPromise;
    }

    var self = this;
    this.state.fileDataPromise = $.get(this.state.rawUrl).then(function(data) {
      // TODO(mack): Create class in Parser namespace to store this.
      var fileLines = data.split(/\r?\n/);
      self.totalLines = fileLines.length;
      return fileLines;
    });
    return this.state.fileDataPromise;
  },

  clickShowLines: function(prevRowGroup, nextRowGroup, evt, currTargetId) {
    var numLines = this.state.numLinesToShow;
    var $target = $(document.getElementById(currTargetId));
    this.fetchFile().then(function(fileLines) {
      var rangeInfo = getMissingRangeInfo(prevRowGroup, nextRowGroup, fileLines.length);

      if ($target.hasClass('showAll') || rangeInfo.length <= numLines) {
        var showRange = {
          deletedIdx: rangeInfo.deletedIdx,
          insertedIdx: rangeInfo.insertedIdx,
          length: rangeInfo.length,
        };
      } else if ($target.hasClass('showAbove')) {
        var showRange = {
          deletedIdx: rangeInfo.deletedIdx,
          insertedIdx: rangeInfo.insertedIdx,
          length: numLines,
        };
      } else {
        assert($target.hasClass('showBelow'));
        var showRange = {
          new: rangeInfo.insertedIdx + rangeInfo.length - numLines,
          old: rangeInfo.deletedIdx + rangeInfo.length - numLines,
          length: numLines,
        };
      }

      var rowGroup = getShowRowGroup(fileLines, showRange);
      this.fileDiff.insertAfter(prevRowGroup, rowGroup);
      this.setState({ rows: this.state.fileDiff })

    }.bind(this));

    return false;
  },

  renderShowLinesLinks: function(prevRowGroup, nextRowGroup) {

    var totalLines = this.state.totalLines;
    var rangeInfo = getMissingRangeInfo(prevRowGroup, nextRowGroup, totalLines);

    var clickShowLines = this.clickShowLines.bind(this, prevRowGroup, nextRowGroup);
    var links = [];
    if (rangeInfo.position === 'last' && rangeInfo.length < 0) {
      var showAllLink = (
        <a onClick={clickShowLines}
            className="showAll" href="#">
          Show all remaining lines
        </a>
      );
    } else {
      var showAllLink = (
        <a onClick={clickShowLines}
            className="showAll" href="#">
          Show all {rangeInfo.length} remaining lines
        </a>
      );
    }

    links.push(showAllLink);

    if (rangeInfo.length >= 0 &&
        rangeInfo.length < this.state.numLinesToShow * 2) {
      return links;
    }

    if (rangeInfo.position === 'last') {
      var showAboveLink = [
        <a onClick={clickShowLines}
            className="showAbove" href="#">
          ▲ Show {this.state.numLinesToShow} lines
        </a>,
        <span className="dot">•</span>
      ];
      var showBelowLink = [
        <span className="dot">•</span>,
        <a onClick={clickShowLines}
            className="showBelow" href="#">
          Show last {this.state.numLinesToShow} lines
        </a>
      ];

    } else if (rangeInfo.position === 'first') {
      var showAboveLink = [
        <a onClick={clickShowLines}
            className="showAbove" href="#">
          Show first {this.state.numLinesToShow} lines
        </a>,
        <span className="dot">•</span>
      ];
      var showBelowLink = [
        <span className="dot">•</span>,
        <a onClick={clickShowLines}
            className="showBelow" href="#">
          ▼ Show {this.state.numLinesToShow} lines
        </a>
      ];
    } else {
      var showAboveLink = [
        <a onClick={clickShowLines}
            className="showAbove" href="#">
          ▲ Show {this.state.numLinesToShow} lines
        </a>,
        <span className="dot">•</span>
      ];
      var showBelowLink = [
        <span className="dot">•</span>,
        <a onClick={clickShowLines}
            className="showBelow" href="#">
          ▼ Show {this.state.numLinesToShow} lines
        </a>
      ];
    }

    links = showAboveLink.concat(links);
    links = links.concat(showBelowLink);

    return links;
  },

  /**
   * Following are functions that dispatch to inline or side by side
   */

  componentDidMount: function(rootNode) {
    if (this.state.sideBySide) {
      $('#wrapper .container').addClass('large');
    } else {
      $('#wrapper .container').removeClass('large');
    }
  },

  componentWillUpdate: function(nextProps, nextState) {
    this.state.rows.forEach(function(row) {
      if (row.type !== 'comments') {
        return;
      }

      try {
        $(row.newView.getDOMNode());
        row.view = row.newView;
      } catch (ex) {
        debugger;
      }
      var $row = $(row.view.getDOMNode());

      var $countElement = $row.find('.comment-count').clone();
      $countElement.find('*').addBack().removeAttr('data-reactid');
      row.cells[0].$countElement = $countElement;

      var $commentsElement = $row.find('.line-comments').clone();
      $commentsElement.find('*').addBack().removeAttr('data-reactid');
      row.cells[0].$commentsElement = $commentsElement;
    });
  },

  render: function() {
    if (this.state.sideBySide) {
      return this.sideBySideRender();
    } else {
      return this.inlineRender();
    }
  },


  /**
   * Following are inline function
   */

  inlineRender: function() {
    var rowViews = [];
    var fileDiff = this.props.fileDiff;
    var iter = fileDiff.getRowGroups().iterator();
    var prevRowGroup;
    while (iter.hasNext()) {
      var rowGroup = iter.next();

      if (prevRowGroup) {
        var prevEndIdx = prevRowGroup.getInsertedRange()[1];
      } else {
        var prevEndIdx = 0;
      }

      var currBeginIdx = rowGroup.getInsertedRange()[0];
      if (!isNum(currBeginIdx)) {
        currBeginIdx = prevEndIdx;
      }

      if (currBeginIdx > prevEndIdx) {
        // We have a missing range
        rowViews.push(this.inlineRenderShowLines(prevRowGroup, rowGroup));
      } else {
        assert(currBeginIdx === prevEndIdx);
      }

      var deletedRows = rowGroup.deletedRows;
      var insertedRows = rowGroup.insertedRows;
      if (rowGroup instanceof UnchangedRowGroup) {
        assert(deletedRows.length === insertedRows.length);
        for (var rowIdx = 0; rowIdx < deletedRows.length; ++rowIdx) {
          rowViews.pushArr(
            this.inlineRenderCode(
                deletedRows[rowIdx],
                insertedRows[rowIdx])
          );
        }
      } else {
        assert(rowGroup instanceof ChangedRowGroup);
        for (var rowIdx = 0; rowIdx < deletedRows.length; ++rowIdx) {
          rowViews.pushArr(this.inlineRenderCode(deletedRows[rowIdx]));
        }
        for (var rowIdx = 0; rowIdx < insertedRows.length; ++rowIdx) {
          rowViews.pushArr(this.inlineRenderCode(insertedRows[rowIdx]));
        }
      }

      prevRowGroup = rowGroup;
      rowGroup = null;
    }
    rowViews.push(this.inlineRenderShowLines(prevRowGroup, null));

    return (
      <tbody>
        {rowViews}
      </tbody>
    );
  },

  inlineRenderShowLines: function(prevRowGroup, nextRowGroup) {
    var rangeInfo = getMissingRangeInfo(prevRowGroup, nextRowGroup);
    return (
      <tr className={'showLines ' + rangeInfo.position}>
        <td colSpan={3}>
          {this.renderShowLinesLinks(prevRowGroup, nextRowGroup)}
        </td>
      </tr>
    );
  },

  inlineRenderComment: function(comment) {
    var commentsView = (
      <tr className="inline-comments show">
        <td className="file-line-numbers comment-count" colSpan="2"
            dangerouslySetInnerHTML={{ __html: comment.$count.html() }}>
        </td>
        <td className="js-line-comments line-comments" colSpan="1"
            dangerouslySetInnerHTML={{ __html: comment.$text.html() }}>
        </td>
      </tr>
    );
    return commentsView;
  },

  inlineRenderCode: function(row, row2) {
    if (row instanceof DeletedRow) {
      var rowClass = 'gd';
      var deletedLineNum = row.lineNum;
      var insertedLineNum = {};
    } else if (row instanceof InsertedRow) {
      var rowClass = 'gi';
      var deletedLineNum = {};
      var insertedLineNum = row.lineNum;
    } else if (row instanceof UnchangedRow) {
      assert(row2);
      var rowClass = '';
      var deletedLineNum = row.lineNum;
      var insertedLineNum = row2.lineNum;
    } else {
      assert(false, 'Unexpected row type: ' + row.type);
    }

    if (row.commentUrl) {
      // TODO(mack): see if there's some way to use React to generate markup
      var commentIcon = (
        <b onClick={this.inlineClickAddComment}
            className="add-line-comment octicon octicon-comment-add"
            data-remote={row.commentUrl}></b>
      );
    } else {
      var commentIcon = '';
    }

    var views = [];
    var codeView = (
      <tr className={'file-diff-line ' + rowClass}>
        <td id={deletedLineNum.id || ''}
            className={'diff-line-num linkable-line-number '
              + (isNum(deletedLineNum.idx) ? '' : 'empty-cell')}
            data-line-number={deletedLineNum.dataNum || ''}>
          <span className="line-num-content">
            {(deletedLineNum.idx + 1) || ''}
          </span>
        </td>

        <td id={insertedLineNum.id || ''}
            className={'diff-line-num linkable-line-number '
              + (isNum(insertedLineNum.idx) ? '' : 'empty-cell')}
            data-line-number={insertedLineNum.dataNum || ''}>
          <span className="line-num-content">
            {(insertedLineNum.idx + 1) || ''}
          </span>
        </td>

        <td className="diff-line-code" data-position={row.position}>
          {commentIcon}
          <span dangerouslySetInnerHTML={{ __html: row.text }}>
          </span>
        </td>
      </tr>
    );
    views.push(codeView);

    if (row.comment) {
      var commentView = this.inlineRenderComment(row.comment);
      views.push(commentView);
    }

    return views;
  },

  inlineClickAddComment: function(evt) {
    console.warn('TODO');
    return false;
  },

  ///**
  // * Following are side by side functions
  // */
  //sideBySideRender: function() {
  //  // TODO(mack): Remove duplication this method has with inlineRender()

  //  var rowViews = [];
  //  var rowGroups = this.state.rowGroups;
  //  var prevRowGroup;
  //  for (var rowGroupIdx = 0; rowGroupIdx < rowGroups.length; ++rowGroupIdx) {

  //    var rowGroup = rowGroups[rowGroupIdx];

  //    if (prevRowGroup) {
  //      var prevEndIdx = prevRowGroup.getInsertedRange()[1];
  //    }

  //    var currBeginIdx = rowGroup.getInsertedRange()[0];
  //    if (!isNum(currBeginIdx)) {
  //      currBeginIdx = prevEndIdx;
  //    }

  //    if (isNum(prevEndIdx) && currBeginIdx > prevEndIdx) {
  //      // We have a missing range
  //      var rowView = this.sideBySideRenderShowLines(prevRowGroup, rowGroup);
  //      rowViews.push(rowView);
  //    } else {
  //      assert(currBeginIdx === prevEndIdx);
  //    }

  //    var maxLength = Math.max(rowGroup.deleteRows.length, rowGroup.insertedRows.length);
  //    for (var rowIdx = 0; rowIdx < maxLength; ++rowIdx) {
  //      var deletedRow = rowGroup.deletedRows[rowIdx];
  //      var insertedRow = rowGroup.insertedRows[rowIdx];
  //      var rowView = this.sideBySideRenderCode(deletedRow, insertedRow);
  //      rowViews.push(rowView);

  //      if (deletedRow && deletedRow.comment ||
  //          insertedRow && insertedRow.comment) {
  //        var rowView = this.sideBySideRenderComment(deletedRow, insertedRow);
  //        rowViews.push(rowView);
  //      }
  //    }

  //    prevRowGroup = rowGroup;
  //  }

  //  return (
  //    <tbody>
  //      {rowViews}
  //    </tbody>
  //  );
  //},

  //sideBySideOnMouseDown: function(evt) {
  //  var selection = window.getSelection();
  //  if (selection.rangeCount > 0) {
  //    selection.removeAllRanges();
  //  }

  //  var $target = $(evt.target);
  //  if (!$target.hasClass('diff-line-code')) {
  //    $target = $target.closest('.diff-line-code');
  //  }

  //  if (!$target.hasClass('diff-line-code')) {
  //    $(evt.target).closest('.file-diff')
  //      .removeClass('unselectableInsertion')
  //      .removeClass('unselectableDeletion');
  //    return;
  //  }

  //  if ($target.index() === 1) {
  //    $target.closest('.file-diff')
  //      .addClass('unselectableInsertion')
  //      .removeClass('unselectableDeletion');
  //  } else /* index == 3 */ {
  //    $target.closest('.file-diff')
  //      .addClass('unselectableDeletion')
  //      .removeClass('unselectableInsertion');
  //  }
  //},

  //sideBySideRenderShowLines: function(prevRowGroup, nextRowGroup) {
  //  var rangeInfo = getMissingRangeInfo(prevRowGroup, nextRowGroup);
  //  return (
  //    <tr className={'showLines ' + rangeInfo.position}>
  //      <td colSpan={4}>
  //        {this.renderShowLinesLinks(prevRowGroup, nextRowGroup)}
  //      </td>
  //    </tr>
  //  );
  //},

  //sideBySideRenderComment: function(deletedRow, insertedRow) {
  //  // For unchanged row, comments will always be rendered on inserted side.
  //  if (deletedRow && deletedRow.comment && !(deletedRow instanceof UnchangedRow)) {
  //    var deletedCommentViews = this.sideBySideRenderCommentColumn(deletedRow.comment);
  //  } else {
  //    var deletedCommentViews = this.sideBySideRenderCommentColumn(null);
  //  }

  //  if (insertedRow && insertedRow.comment) {
  //    var insertedCommentViews = this.sideBySideRenderCommentColumn(insertedRow.comment);
  //  } else {
  //    var insertedCommentViews = this.sideBySideRenderCommentColumn(null);
  //  }
  //  return (
  //    <tr className="inline-comments show"
  //        onMouseDown={this.sideBySideOnMouseDown}>
  //      {deletedCommentViews.concat(insertedCommentViews)}
  //    </tr>
  //  );
  //},

  //sideBySideRenderCommentColumn: function(comment) {
  //  if (!comment) {
  //    return [
  //      <td className="empty-cell"></td>,
  //      <td className="empty-line"></td>,
  //    ];
  //  } else {
  //    return [
  //      <td className="file-line-numbers comment-count" colSpan="1"
  //          dangerouslySetInnerHTML={{ __html: row.$count.html() }}>
  //      </td>,
  //      <td className="js-line-comments line-comments" colSpan="1"
  //          dangerouslySetInnerHTML={{ __html: row.$text.html() }}>
  //      </td>,
  //    ];
  //  }
  //},

  //sideBySideRenderCode: function(deletedRow, insertedRow) {

  //  var deletedViews = this.sideBySideRenderCodeColumn(deletedRow);
  //  var insertedViews = this.sideBySideRenderCodeColumn(insertedRow);

  //  return (
  //    <tr className="file-diff-line"
  //        onMouseDown={this.sideBySideOnMouseDown}>
  //      {deletedViews.concat(insertedViews)}
  //    </tr>
  //  );
  //},

  //sideBySideRenderCodeColumn: function(row) {
  //  if (!row) {
  //    var rowClass = 'empty-line';
  //    var lineNum = {};
  //    var text = '';
  //    var commentIcon = '';
  //  } else {
  //    if (row instanceof InsertedRow) {
  //      var rowClass = 'gi';
  //    } else if (row instanceof DeletedRow) {
  //      var rowClass = 'gd';
  //    } else {
  //      assert(row instanceof UnchangedRow);
  //    }
  //    var text = row.text;
  //    var lineNum = row.lineNum;
  //    var commentIcon = (
  //      <b onClick={this.sideBySideClickAddComment}
  //        className="add-line-comment octicon octicon-comment-add"
  //        data-remote={row.commentUrl}></b>
  //    );
  //  }

  //  var views = [
  //    <td id={lineNum.id}
  //        className={'diff-line-num linkable-line-number '
  //          + (isNum(lineNum.idx) ? '' : 'empty-cell')}
  //        data-line-number={lineNum.dataNum || ''}>
  //      <span className="line-num-content">
  //        {(lineNum.idx + 1) || ''}
  //      </span>
  //    </td>,

  //    <td className={'diff-line-code ' + rowClass} data-position={row.position}>
  //      {commentIcon}
  //      <span dangerouslySetInnerHTML={{ __html: text }}>
  //      </span>
  //    </td>
  //  ];
  //  return views;
  //},

  //sideBySideClickAddComment: function(evt) {
  //  return false;
  //  //$target = $(evt.target);
  //  //window.setTimeout(function() {
  //  //  var rows = this.state.rows;

  //  //  var $thisLine = $target.closest('.diff-line-code');
  //  //  var thisRowIdx = $thisLine.data('row-idx');
  //  //  var thisRow = rows[thisRowIdx];

  //  //  if (thisRow.type === 'lineInsertion') {
  //  //    var $otherLine = $target.closest('.diff-line-code').prev().prev();
  //  //  } else {
  //  //    var $otherLine = $target.closest('.diff-line-code').next().next();
  //  //  }
  //  //  var otherRowIdx = $otherLine.data('row-idx');
  //  //  var otherRow = rows[otherRowIdx];

  //  //  var $row = $target.closest('.file-diff-line').next();

  //  //  // TODO(mack): Handle side by side view where comment added to existing
  //  //  // list of comments which could be on wrong side
  //  //  var thisNextRow = rows[thisRowIdx + 1];
  //  //  var otherNextRow = rows[otherRowIdx + 1];
  //  //  if (thisNextRow && thisNextRow.type === 'comments') {
  //  //    $row.removeClass('show-inline-comment-form');
  //  //    var $element = thisNextRow.cells[0].$element;
  //  //    $element.addClass('show-inline-comment-form');
  //  //    $element.find('.js-comment-field').focus();
  //  //    return;
  //  //  } else if (otherNextRow && otherNextRow.type === 'comments') {
  //  //    // TODO(mack): Give focus to textarea after re-render
  //  //    $row.removeClass('show-inline-comment-form');
  //  //    $row = $row.clone();
  //  //    $row.addClass('show-inline-comment-form');
  //  //    $row.find('.comment-holder').empty();
  //  //    $row.find('input[name="position"]').val(thisRow.position)
  //  //    if (thisRow.type === 'lineInsertion') {
  //  //      $row.find('input[name="line"]').val(thisRow.cells[1].dataLineNum)
  //  //    } else {
  //  //      $row.find('input[name="line"]').val(thisRow.cells[0].dataLineNum)
  //  //    }
  //  //  }

  //  //  $row.remove();
  //  //  this.state.rows.splice(thisRowIdx + 1, 0, {
  //  //    type: 'comments',
  //  //    cells: [{ $element: $row }]
  //  //  });
  //  //  this.setState({ rows: this.state.rows });
  //  //}.bind(this), 800);
  //},
});

Globals.FileDiffView = FileDiffView;

})();
