/** @jsx React.DOM */

(function() {

var Models = Globals.Models;
var FileDiff = Models.FileDiff;
var RowGroup = Models.RowGroup;
var Row = Models.Row;

var assert = Globals.Utils.assert;

var FileDiffView = React.createClass({

  componentWillMount: function() {
    var fileDiff = this.props.fileDiff;
    var diffViewer = this.props.diffViewer;
    fileDiff.on('change', this.reRender, this);
    fileDiff.get('rowGroups').on('add', this.reRender, this);
    diffViewer.on('change', this.reRender, this);
  },

  componentWillUnmount: function() {
    this.props.fileDiff.off();
    this.props.diffViewer.off();
  },

  clickShowLines: function(prevRowGroup, nextRowGroup, evt, currTargetId) {
    var numLines = this.props.diffViewer.get('numLinesToShow');
    // TODO(mack): See if there's a less hacky way to get the real target.
    var $target = $('[data-reactid="' + currTargetId + '"]');
    this.props.fileDiff.fetchFile().then(function(fileLines) {
      var rangeInfo = RowGroup.getMissingRangeInfo(
        prevRowGroup, nextRowGroup, fileLines.length);

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
          deletedIdx: rangeInfo.deletedIdx + rangeInfo.length - numLines,
          insertedIdx: rangeInfo.insertedIdx + rangeInfo.length - numLines,
          length: numLines,
        };
      }

      var rowGroup = RowGroup.createRowGroup(fileLines, showRange);
      this.props.fileDiff.get('rowGroups').insertAfter(prevRowGroup, rowGroup);

    }.bind(this));

    return false;
  },

  renderShowLinesLinks: function(prevRowGroup, nextRowGroup) {

    var numLines = this.props.fileDiff.get('numLines');
    var rangeInfo = RowGroup.getMissingRangeInfo(
        prevRowGroup, nextRowGroup, numLines);

    var clickShowLines = this.clickShowLines.bind(
        this, prevRowGroup, nextRowGroup);
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

    var numLinesToShow = this.props.fileDiff.get('numLinesToShow');

    if (rangeInfo.length >= 0 &&
        rangeInfo.length < numLinesToShow * 2) {
      return links;
    }

    if (rangeInfo.position === 'last') {
      var showAboveLink = [
        <a onClick={clickShowLines}
            className="showAbove" href="#">
          ▲ Show {numLinesToShow} lines
        </a>,
        <span className="dot">•</span>
      ];
      var showBelowLink = [
        <span className="dot">•</span>,
        <a onClick={clickShowLines}
            className="showBelow" href="#">
          Show last {numLinesToShow} lines
        </a>
      ];

    } else if (rangeInfo.position === 'first') {
      var showAboveLink = [
        <a onClick={clickShowLines}
            className="showAbove" href="#">
          Show first {numLinesToShow} lines
        </a>,
        <span className="dot">•</span>
      ];
      var showBelowLink = [
        <span className="dot">•</span>,
        <a onClick={clickShowLines}
            className="showBelow" href="#">
          ▼ Show {numLinesToShow} lines
        </a>
      ];
    } else {
      var showAboveLink = [
        <a onClick={clickShowLines}
            className="showAbove" href="#">
          ▲ Show {numLinesToShow} lines
        </a>,
        <span className="dot">•</span>
      ];
      var showBelowLink = [
        <span className="dot">•</span>,
        <a onClick={clickShowLines}
            className="showBelow" href="#">
          ▼ Show {numLinesToShow} lines
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
    if (this.props.diffViewer.get('sideBySide')) {
      $('#wrapper .container').addClass('large');
    } else {
      $('#wrapper .container').removeClass('large');
    }
  },

  componentWillUpdate: function(nextProps, nextState) {
    //this.state.rows.forEach(function(row) {
    //  if (row.type !== 'comments') {
    //    return;
    //  }

    //  // The code below might be the key to getting comments working during
    //  // update()
    //  try {
    //    $(row.newView.getDOMNode());
    //    row.view = row.newView;
    //  } catch (ex) {
    //    debugger;
    //  }
    //  var $row = $(row.view.getDOMNode());

    //  var $countElement = $row.find('.comment-count').clone();
    //  $countElement.find('*').addBack().removeAttr('data-reactid');
    //  row.cells[0].$countElement = $countElement;

    //  var $commentsElement = $row.find('.line-comments').clone();
    //  $commentsElement.find('*').addBack().removeAttr('data-reactid');
    //  row.cells[0].$commentsElement = $commentsElement;
    //});
  },

  reRender: function() {
    this.setState({ random: Math.random() });
  },

  render: function() {
    if (this.props.diffViewer.get('sideBySide')) {
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
    var prevRowGroup;
    this.props.fileDiff.get('rowGroups').each(function(rowGroup) {
      var prevEndIdx = prevRowGroup ? prevRowGroup.getInsertedRange()[1] : 0;

      var currBeginIdx = rowGroup.getInsertedRange()[0];
      if (!_.isInt(currBeginIdx)) {
        currBeginIdx = prevEndIdx;
      }

      if (currBeginIdx > prevEndIdx) {
        // We have a missing range
        rowViews.push(this.inlineRenderShowLines(prevRowGroup, rowGroup));
      } else {
        assert(currBeginIdx === prevEndIdx);
      }

      var deletedRows = rowGroup.get('deletedRows');
      var insertedRows = rowGroup.get('insertedRows');
      if (rowGroup.isUnchangedType()) {
        assert(deletedRows.size() === insertedRows.size());
        var rowTuples = _.zip(deletedRows.models, insertedRows.models);
        _.each(rowTuples, function(rowTuple) {
          rowViews.pushArr(this.inlineRenderCode(rowTuple[0], rowTuple[1]));
        }.bind(this));
      } else {
        assert(rowGroup.isChangedType());
        deletedRows.each(function(row) {
          rowViews.pushArr(this.inlineRenderCode(row));
        }.bind(this));
        insertedRows.each(function(row) {
          rowViews.pushArr(this.inlineRenderCode(row));
        }.bind(this));
      }

      prevRowGroup = rowGroup;
    }.bind(this));
    if (!this.props.fileDiff.hasLastRowGroup()) {
      rowViews.push(this.inlineRenderShowLines(prevRowGroup, null));
    }

    return (
      <tbody>
        {rowViews}
      </tbody>
    );
  },

  inlineRenderShowLines: function(prevRowGroup, nextRowGroup) {
    var rangeInfo = RowGroup.getMissingRangeInfo(prevRowGroup, nextRowGroup);
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
    assert(row);
    if (row.isDeletedType()) {
      var rowClass = 'gd';
      var deletedLineNum = row.get('lineNum').toJSON();
      var insertedLineNum = {
        idx: NaN,
        htmlId: '',
        dataNum: NaN,
      };
    } else if (row.isInsertedType()) {
      var rowClass = 'gi';
      var deletedLineNum = {
        idx: NaN,
        htmlId: '',
        dataNum: NaN,
      };
      var insertedLineNum = row.get('lineNum');
    } else {
      assert(row.isUnchangedType());
      // row2 represents the right side of unchanged row, which contains
      // inserted line number.
      assert(row2);
      var rowClass = '';
      var deletedLineNum = row.get('lineNum').toJSON();
      var insertedLineNum = row2.get('lineNum').toJSON();
    }

    if (row.has('commentUrl')) {
      // TODO(mack): see if there's some way to use React to generate markup
      var commentIcon = (
        <b onClick={this.inlineClickAddComment}
            className="add-line-comment octicon octicon-comment-add"
            data-remote={row.get('commentUrl')}></b>
      );
    } else {
      var commentIcon = '';
    }

    var views = [];
    var codeView = (
      <tr className={'file-diff-line ' + rowClass}>
        <td id={deletedLineNum.htmlId}
            className={'diff-line-num linkable-line-number '
              + (_.isInt(deletedLineNum.idx) ? '' : 'empty-cell')}
            data-line-number={_.isInt(deletedLineNum.dataNum) || ''}>
          <span className="line-num-content">
            {(deletedLineNum.idx + 1) || ''}
          </span>
        </td>

        <td id={insertedLineNum.htmlId}
            className={'diff-line-num linkable-line-number '
              + (_.isInt(insertedLineNum.idx) ? '' : 'empty-cell')}
            data-line-number={_.isInt(insertedLineNum.dataNum) || ''}>
          <span className="line-num-content">
            {(insertedLineNum.idx + 1) || ''}
          </span>
        </td>

        <td className="diff-line-code" data-position={_.isInt(row.get('position')) || ''}>
          {commentIcon}
          <span dangerouslySetInnerHTML={{ __html: row.get('text') }}>
          </span>
        </td>
      </tr>
    );
    views.push(codeView);

    if (row.has('comment')) {
      var commentView = this.inlineRenderComment(row.get('comment'));
      views.push(commentView);
    }

    return views;
  },

  inlineClickAddComment: function(evt) {
    console.warn('TODO');
    return false;
  },

  /**
   * Following are side by side functions
   */
  sideBySideRender: function() {
    // TODO(mack): Remove duplication this method has with inlineRender()

    var rowViews = [];
    var prevRowGroup;
    this.props.fileDiff.get('rowGroups').each(function(rowGroup) {
      var prevEndIdx = prevRowGroup ? prevRowGroup.getInsertedRange()[1] : 0;

      var currBeginIdx = rowGroup.getInsertedRange()[0];
      if (!_.isInt(currBeginIdx)) {
        currBeginIdx = prevEndIdx;
      }

      if (_.isInt(prevEndIdx) && currBeginIdx > prevEndIdx) {
        // We have a missing range
        rowViews.push(this.sideBySideRenderShowLines(prevRowGroup, rowGroup));
      } else {
        assert(currBeginIdx === prevEndIdx);
      }

      var rowTuples = _.zip(
        rowGroup.get('deletedRows').models, rowGroup.get('insertedRows').models);
      _.each(rowTuples, function(rowTuple) {
        var deletedRow = rowTuple[0];
        var insertedRow = rowTuple[1];
        rowViews.push(this.sideBySideRenderCode(deletedRow, insertedRow));
        if (deletedRow && deletedRow.get('comment') ||
            insertedRow && insertedRow.get('comment')) {
          rowViews.push(this.sideBySideRenderComment(deletedRow, insertedRow));
        }
      }.bind(this));

      prevRowGroup = rowGroup;
    }.bind(this));
    if (!this.props.fileDiff.hasLastRowGroup()) {
      rowViews.push(this.sideBySideRenderShowLines(prevRowGroup, null));
    }

    return (
      <tbody>
        {rowViews}
      </tbody>
    );
  },

  sideBySideOnMouseDown: function(evt) {
    //var selection = window.getSelection();
    //if (selection.rangeCount > 0) {
    //  selection.removeAllRanges();
    //}

    //var $target = $(evt.target);
    //if (!$target.hasClass('diff-line-code')) {
    //  $target = $target.closest('.diff-line-code');
    //}

    //if (!$target.hasClass('diff-line-code')) {
    //  $(evt.target).closest('.file-diff')
    //    .removeClass('unselectableInsertion')
    //    .removeClass('unselectableDeletion');
    //  return;
    //}

    //if ($target.index() === 1) {
    //  $target.closest('.file-diff')
    //    .addClass('unselectableInsertion')
    //    .removeClass('unselectableDeletion');
    //} else /* index == 3 */ {
    //  $target.closest('.file-diff')
    //    .addClass('unselectableDeletion')
    //    .removeClass('unselectableInsertion');
    //}
  },

  sideBySideRenderShowLines: function(prevRowGroup, nextRowGroup) {
    var rangeInfo = RowGroup.getMissingRangeInfo(prevRowGroup, nextRowGroup);
    return (
      <tr className={'showLines ' + rangeInfo.position}>
        <td colSpan={4}>
          {this.renderShowLinesLinks(prevRowGroup, nextRowGroup)}
        </td>
      </tr>
    );
  },

  sideBySideRenderComment: function(deletedRow, insertedRow) {
    // For unchanged row, comments will always be rendered on inserted side.
    if (deletedRow && deletedRow.has('comment') &&
        !deletedRow.isDeletedType()) {
      var deletedCommentViews = this.sideBySideRenderCommentColumn(
          deletedRow.get('comment'));
    } else {
      var deletedCommentViews = this.sideBySideRenderCommentColumn(null);
    }

    if (insertedRow && insertedRow.has('comment')) {
      var insertedCommentViews = this.sideBySideRenderCommentColumn(
          insertedRow.get('comment'));
    } else {
      var insertedCommentViews = this.sideBySideRenderCommentColumn(null);
    }
    return (
      <tr className="inline-comments show"
          onMouseDown={this.sideBySideOnMouseDown}>
        {deletedCommentViews.concat(insertedCommentViews)}
      </tr>
    );
  },

  sideBySideRenderCommentColumn: function(comment) {
    if (!comment) {
      return [
        <td className="empty-cell"></td>,
        <td className="empty-line"></td>,
      ];
    } else {
      return [
        <td className="file-line-numbers comment-count" colSpan="1"
            dangerouslySetInnerHTML={{ __html: row.$count.html() }}>
        </td>,
        <td className="js-line-comments line-comments" colSpan="1"
            dangerouslySetInnerHTML={{ __html: row.$text.html() }}>
        </td>,
      ];
    }
  },

  sideBySideRenderCode: function(deletedRow, insertedRow) {
    var deletedViews = this.sideBySideRenderCodeColumn(deletedRow);
    var insertedViews = this.sideBySideRenderCodeColumn(insertedRow);

    return (
      <tr className="file-diff-line"
          onMouseDown={this.sideBySideOnMouseDown}>
        {deletedViews.concat(insertedViews)}
      </tr>
    );
  },

  sideBySideRenderCodeColumn: function(row) {
    if (!row) {
      var rowClass = 'empty-line';
      var lineNum = {};
      var text = '';
      var position = '';
      var commentIcon = '';
    } else {
      if (row.isInsertedType()) {
        var rowClass = 'gi';
      } else if (row.isDeletedType()) {
        var rowClass = 'gd';
      } else {
        assert(row.isUnchangedType());
      }
      var text = row.get('text');
      var lineNum = row.get('lineNum');
      var position = row.get('position');
      var commentIcon = (
        <b onClick={this.sideBySideClickAddComment}
          className="add-line-comment octicon octicon-comment-add"
          data-remote={row.commentUrl}></b>
      );
    }

    var views = [
      <td id={lineNum.get('htmlId')}
          className={'diff-line-num linkable-line-number '
            + (_.isInt(lineNum.get('idx')) ? '' : 'empty-cell')}
          data-line-number={lineNum.get('dataNum') || ''}>
        <span className="line-num-content">
          {(lineNum.get('idx') + 1) || ''}
        </span>
      </td>,

      <td className={'diff-line-code ' + rowClass} data-position={position}>
        {commentIcon}
        <span dangerouslySetInnerHTML={{ __html: text }}>
        </span>
      </td>
    ];
    return views;
  },

  sideBySideClickAddComment: function(evt) {
    return false;
    //$target = $(evt.target);
    //window.setTimeout(function() {
    //  var rows = this.state.rows;

    //  var $thisLine = $target.closest('.diff-line-code');
    //  var thisRowIdx = $thisLine.data('row-idx');
    //  var thisRow = rows[thisRowIdx];

    //  if (thisRow.type === 'lineInsertion') {
    //    var $otherLine = $target.closest('.diff-line-code').prev().prev();
    //  } else {
    //    var $otherLine = $target.closest('.diff-line-code').next().next();
    //  }
    //  var otherRowIdx = $otherLine.data('row-idx');
    //  var otherRow = rows[otherRowIdx];

    //  var $row = $target.closest('.file-diff-line').next();

    //  // TODO(mack): Handle side by side view where comment added to existing
    //  // list of comments which could be on wrong side
    //  var thisNextRow = rows[thisRowIdx + 1];
    //  var otherNextRow = rows[otherRowIdx + 1];
    //  if (thisNextRow && thisNextRow.type === 'comments') {
    //    $row.removeClass('show-inline-comment-form');
    //    var $element = thisNextRow.cells[0].$element;
    //    $element.addClass('show-inline-comment-form');
    //    $element.find('.js-comment-field').focus();
    //    return;
    //  } else if (otherNextRow && otherNextRow.type === 'comments') {
    //    // TODO(mack): Give focus to textarea after re-render
    //    $row.removeClass('show-inline-comment-form');
    //    $row = $row.clone();
    //    $row.addClass('show-inline-comment-form');
    //    $row.find('.comment-holder').empty();
    //    $row.find('input[name="position"]').val(thisRow.position)
    //    if (thisRow.type === 'lineInsertion') {
    //      $row.find('input[name="line"]').val(thisRow.cells[1].dataLineNum)
    //    } else {
    //      $row.find('input[name="line"]').val(thisRow.cells[0].dataLineNum)
    //    }
    //  }

    //  $row.remove();
    //  this.state.rows.splice(thisRowIdx + 1, 0, {
    //    type: 'comments',
    //    cells: [{ $element: $row }]
    //  });
    //  this.setState({ rows: this.state.rows });
    //}.bind(this), 800);
  },
});


Globals.Views.FileDiffView = FileDiffView;

})();
