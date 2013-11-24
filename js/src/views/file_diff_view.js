/** @jsx React.DOM */

(function() {

var Models = Globals.Models;
var FileDiff = Models.FileDiff;
var RowGroup = Models.RowGroup;
var Row = Models.Row;
var Comment = Models.Comment;

var assert = Globals.Utils.assert;

// Should add to prototype of all React views
function keyComponentArr(arr) {
  assert(_.isArray(arr));
  _.each(arr, function(component, idx) {
    component.props.key = idx;
  });
  return arr;
}

var FileDiffView = React.createClass({

  componentDidMount: function() {
    var events = this.props.events = _.clone(Backbone.Events);
    events.listenTo(this.props.fileDiff, 'change', this.reRender);
    events.listenTo(this.props.fileDiff.get('rowGroups'), 'add', this.reRender);
    events.listenTo(this.props.diffViewer, 'change', this.reRender);

    // TODO(mack): Think of a cleaner way to do this.
    $(this.getDOMNode()).on(
      'click', '.js-inline-comment-form button[type=submit]',
      _.deferBy.bind(null, this.onClickComment, 1000));

    $(this.getDOMNode()).on(
      'click', '.js-show-inline-comment-form', this.onClickShowForm);

    $(this.getDOMNode()).on(
      'click', '.js-hide-inline-comment-form', this.onClickHideForm);
  },

  componentWillUnmount: function() {
    this.props.events.stopListening();
    $(this.getDOMNode()).off();
  },

  onClickComment: function(evt) {
    var $lineComments = $(evt.target).closest('.line-comments');
    var commentCid = $lineComments.data('cid');
    if (_.isString(commentCid)) {
      // This is a reply to existing comment thread.
      var comment = Comment.lookup(commentCid);
      assert(comment instanceof Comment);
      comment.set({
        // TODO(mack): Validate before incrementing count
        count: comment.get('count') + 1,
        // Removing attributes should not be strictly necessary, since
        // we're just taking children of element when doing .html() in
        // render
        $text: $lineComments.clone(),
      });
    } else {
      var $inlineComments = $lineComments.closest('.inline-comments');
      if (this.props.diffViewer.get('sideBySide')) {
        // This is a new comment thread.
        var index = $lineComments.index();
        var $associatedRow = $inlineComments.prev().children().eq(index);
      } else {
        var $associatedRow = $inlineComments.prev().children().eq(2);
      }
      var rowCid = $associatedRow.data('cid');
      assert(_.isString(rowCid));
      var row = Row.lookup(rowCid);
      assert(row instanceof Row);
      assert(!row.has('comment'));
      row.set('comment', new Comment({
        count: 1, // TODO(mack): Maybe actually fetch count from element
        $text: $lineComments.clone(),
      }));
    }
    // TODO(mack): Should propagate model changes to event fires, rather than
    // manually triggering re-render
    this.reRender();
  },

  onClickShowForm: function(evt) {
    var $lineComments = $(evt.target).closest('.line-comments');
    var cid = $lineComments.data('cid');
    assert(cid);
    var comment = Comment.lookup(cid);
    assert(comment instanceof Comment);
    comment.set('showForm', true);
    this.props.fileDiff.trigger('change');
  },

  onClickHideForm: function(evt) {
    var $lineComments = $(evt.target).closest('.line-comments');
    var cid = $lineComments.data('cid');
    assert(cid);
    var comment = Comment.lookup(cid);
    assert(comment instanceof Comment);
    assert(_.isInt(comment.get('count')));
    if (!comment.get('count')) {
      assert(comment.get('row').get('comment') === comment);
      comment.get('row').unset('comment');
    } else {
      comment.set('showForm', false);
    }
    this.props.fileDiff.trigger('change');
  },

  onClickShowLines: function(prevRowGroup, nextRowGroup, evt, currTargetId) {
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

    evt.preventDefault();
  },

  renderShowLinesLinks: function(prevRowGroup, nextRowGroup) {

    var numLines = this.props.fileDiff.get('numLines');
    var rangeInfo = RowGroup.getMissingRangeInfo(
        prevRowGroup, nextRowGroup, numLines);
    var pos = rangeInfo.position;

    // TODO(mack): Store prev/next row groups cids in DOM
    var clickShowLines = this.onClickShowLines.bind(
        this, prevRowGroup, nextRowGroup);
    var links = [];

    if (pos === 'last') {
      var lengthKnown = _.isInt(rangeInfo.length);
      assert(lengthKnown === _.isInt(numLines));
    }
    var showAllLink = (
      <a onClick={clickShowLines}
          className="showAll" href="#">
        Show all {(pos === 'last' && !lengthKnown) ? '' : rangeInfo.length}remaining lines
      </a>
    );
    links.push(showAllLink);

    var numLinesToShow = this.props.diffViewer.get('numLinesToShow');

    if (rangeInfo.length >= 0 &&
        rangeInfo.length < numLinesToShow * 2) {
      return links;
    }

    var showAboveLink = [
      <a onClick={clickShowLines}
          className="showAbove" href="#">
        {((pos === 'first') ? 'Show first' :  '▲ Show') +
          ' numLinesToShow} lines'}
      </a>,
      <span className="dot">•</span>
    ];
    var showBelowLink = [
      <span className="dot">•</span>,
      <a onClick={clickShowLines}
          className="showBelow" href="#">
        {((pos === 'last') ? 'Show last' : '▼ Show')  +
          ' {numLinesToShow} lines'}
      </a>
    ];

    links = showAboveLink.concat(links);
    links = links.concat(showBelowLink);
    return links;
  },

  renderLineNumberCell: function(lineNum) {
    return (
      <td id={lineNum.htmlId}
          className={'diff-line-num linkable-line-number '
            + (_.isInt(lineNum.idx) ? '' : 'empty-cell')}
          data-line-number={_.isInt(lineNum.dataNum) || ''}>
        <span className="line-num-content">
          {(lineNum.idx + 1) || ''}
        </span>
      </td>
    );
  },

  reRender: function() {
    // TODO(mack): Properly have the view update rather than using this hack.
    // It's necessary for now to get around bug (likely w/ react.js) where
    // when switching from side-by-side to inline, the text portion of some
    // of the comments disappear.
    var $parent = $(this.getDOMNode()).parent();
    React.unmountComponentAtNode($parent.get(0));
    var fileDiffView = <FileDiffView fileDiff={this.props.fileDiff} diffViewer={this.props.diffViewer} />;
    React.renderComponent(fileDiffView, $parent.get(0));
    //this.setState({ random: Math.random() });
  },

  render: function() {
    if (this.props.diffViewer.get('sideBySide')) {
      $('.wrapper .container').addClass('large');
      return this.sideBySideRender();
    } else {
      $('.wrapper .container').removeClass('large');
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
        {keyComponentArr(rowViews)}
      </tbody>
    );
  },

  inlineRenderShowLines: function(prevRowGroup, nextRowGroup) {
    var rangeInfo = RowGroup.getMissingRangeInfo(prevRowGroup, nextRowGroup);
    var lineLinks = this.renderShowLinesLinks(prevRowGroup, nextRowGroup);
    return (
      <tr className={'showLines ' + rangeInfo.position}>
        <td colSpan={3}>
          {keyComponentArr(lineLinks)}
        </td>
      </tr>
    );
  },

  inlineRenderComment: function(comment) {
    var commentsView = (
      <tr className="inline-comments show">
        <td className="file-line-numbers comment-count" colSpan="2">
          <span className="octicon octicon-comment"></span>
          {' ' + comment.get('count') + ' '}
        </td>
        <td className={'js-line-comments line-comments' +
            ((comment.get('showForm') ? ' show-form' : ''))}
            colSpan="1" data-cid={comment.cid}
            dangerouslySetInnerHTML={{ __html: comment.get('$text').html() }}>
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
        <b onClick={this.inlineOnClickAddComment}
            className="add-line-comment octicon octicon-comment-add"
            data-remote={row.get('commentUrl')}></b>
      );
    } else {
      var commentIcon = '';
    }

    var views = [];
    var codeView = (
      <tr className={'file-diff-line ' + rowClass}>
        {this.renderLineNumberCell(deletedLineNum)}
        {this.renderLineNumberCell(insertedLineNum)}
        {
        /* For an unchanged row, we are using cid of the left column. This is
         * important, because this is the column that will need to be accessed
         * to store an added comment.
         */
        }
        <td className="diff-line-code" data-cid={row.cid}
            data-position={_.isInt(row.get('position')) || ''}>
          {commentIcon}
          <pre className="diff-line-pre" dangerouslySetInnerHTML={{ __html: row.get('text') }}>
          </pre>
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

  inlineOnClickAddComment: function(evt) {
    var $target = $(evt.target);
    setTimeout(function() {
      var $clickedCell = $target.closest('.diff-line-code');
      var $inlineComments = $clickedCell.closest(
        '.file-diff-line').next().find('.line-comments')
      assert($inlineComments.length);

      var commentCid = $inlineComments.data('cid');
      if (commentCid) {
        assert(commentCid);
        var comment = Comment.lookup(commentCid);
        assert(comment instanceof Comment);
        row.get('comment').set({
          showForm: true,
        });
      } else {
        var rowCid = $clickedCell.data('cid');
        assert(rowCid);
        var row = Row.lookup(rowCid);
        assert(row instanceof Row);
        row.set('comment', new Comment({
          count: 0,
          $text: $inlineComments.clone(),
          showForm: true,
          row: row,
        }));
      }
      this.props.fileDiff.trigger('change');

      //$commentRow.find('.line-comments textarea').focus();
    }.bind(this), 800);
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
        {keyComponentArr(rowViews)}
      </tbody>
    );
  },

  sideBySideOnMouseDown: function(evt) {
    var selection = window.getSelection();
    if (selection.rangeCount > 0) {
      selection.removeAllRanges();
    }

    var $target = $(evt.target);
    if (!$target.hasClass('diff-line-code')) {
      $target = $target.closest('.diff-line-code');
    }

    if (!$target.hasClass('diff-line-code')) {
      $(evt.target).closest('.file-diff')
        .removeClass('unselectableInsertion')
        .removeClass('unselectableDeletion');
      return;
    }

    if ($target.index() === 1) {
      $target.closest('.file-diff')
        .addClass('unselectableInsertion')
        .removeClass('unselectableDeletion');
    } else /* index == 3 */ {
      $target.closest('.file-diff')
        .addClass('unselectableDeletion')
        .removeClass('unselectableInsertion');
    }
  },

  sideBySideRenderShowLines: function(prevRowGroup, nextRowGroup) {
    var rangeInfo = RowGroup.getMissingRangeInfo(prevRowGroup, nextRowGroup);
    return (
      <tr className={'showLines ' + rangeInfo.position}>
        <td colSpan={4}>
          {keyComponentArr(this.renderShowLinesLinks(prevRowGroup, nextRowGroup))}
        </td>
      </tr>
    );
  },

  sideBySideRenderComment: function(deletedRow, insertedRow) {
    assert(deletedRow || insertedRow);

    if (deletedRow && deletedRow.has('comment')) {
      var deletedCommentViews = this.sideBySideRenderCommentColumn(
          deletedRow.get('comment'));
    } else {
      var deletedCommentViews = this.sideBySideRenderCommentColumn(null);
    }

    if (insertedRow && insertedRow.has('comment')) {
      assert(!insertedRow.isUnchangedType());
      var insertedCommentViews = this.sideBySideRenderCommentColumn(
          insertedRow.get('comment'));
    } else {
      var insertedCommentViews = this.sideBySideRenderCommentColumn(null);
    }
    return (
      <tr className="inline-comments show"
          onMouseDown={this.sideBySideOnMouseDown}>
        {keyComponentArr(deletedCommentViews.concat(insertedCommentViews))}
      </tr>
    );
  },

  sideBySideRenderCommentColumn: function(comment) {
    if (!comment) {
      return [
        <td className="empty-cell" colSpan="1"></td>,
        <td className="empty-line" colSpan="1"></td>,
      ];
    } else {
      return [
        <td className="file-line-numbers comment-count" colSpan="1">
          <span className="octicon octicon-comment"></span>
          {' ' + comment.get('count') + ' '}
        </td>,
        <td className={'js-line-comments line-comments' +
            ((comment.get('showForm') ? ' show-form' : ''))}
            colSpan="1" data-cid={comment.cid}
            dangerouslySetInnerHTML={{ __html: comment.get('$text').html() }}>
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
        {keyComponentArr(deletedViews.concat(insertedViews))}
      </tr>
    );
  },

  sideBySideRenderCodeColumn: function(row) {
    if (!row) {
      var rowCid = '';
      var rowClass = 'empty-line';
      var lineNum = {};
      var text = '';
      var position = '';
      var commentIcon = '';
    } else {
      var rowCid = row.cid;
      if (row.isInsertedType()) {
        var rowClass = 'gi';
      } else if (row.isDeletedType()) {
        var rowClass = 'gd';
      } else {
        var rowClass = '';
        assert(row.isUnchangedType());
      }
      var text = row.get('text');
      var lineNum = row.get('lineNum').toJSON();
      var position = row.get('position');

      if (row.has('commentUrl')) {
        var commentIcon = (
          <b onClick={this.sideBySideOnClickAddComment}
              className="add-line-comment octicon octicon-comment-add"
              data-remote={row.get('commentUrl')}></b>
        );
      } else {
        var commentIcon = '';
      }
    }

    var views = [
      this.renderLineNumberCell(lineNum),
      <td className={'diff-line-code ' + rowClass} data-cid={rowCid} data-position={position}>
        {commentIcon}
        <pre className="diff-line-pre" dangerouslySetInnerHTML={{ __html: text }}>
        </pre>
      </td>
    ];
    return views;
  },

  // TODO(mack): Need to add onClickCloseCommentForm that will clear
  // showForm flag on Comment model.
  sideBySideOnClickAddComment: function(evt) {
    $target = $(evt.target);
    setTimeout(function() {
      var $clickedCell = $target.closest('.diff-line-code');
      var $commentRow = $clickedCell.closest('.file-diff-line').next();
      assert($commentRow.hasClass('inline-comments'));

      // TODO(mack): Don't use same show-inline-comment-form class for both
      // left and right comment views
      var clickedIndex = $clickedCell.index();
      assert(clickedIndex === 1 || clickedIndex == 3);

      var rowCid = $clickedCell.data('cid');
      assert(_.isString(rowCid));
      var row = Row.lookup(rowCid);
      assert(row instanceof Row);

      if (clickedIndex === 1) {
        var otherRowCid = $clickedCell.next().next().data('cid');
      } else {
        var otherRowCid = $clickedCell.prev().prev().data('cid');
      }
      if (otherRowCid && _.isString(otherRowCid)) {
        var otherRow = Row.lookup(otherRowCid);
        assert(otherRow instanceof Row);
      }
      if (row.isUnchangedType()) {
        assert(otherRow);
      }

      if ($commentRow.find('.line-comments').length > 1) {
        assert($commentRow.find('.line-comments').length === 2);
        assert(row.has('comment'));
        row.get('comment').set('showForm', true);

        this.props.fileDiff.trigger('change');
        return;
      }

      if ($commentRow.find('.empty-line').length) {
        assert($commentRow.find('.line-comments').length === 1);

        if (row.isUnchangedType()) {
          assert(otherRow);
          if (clickedIndex === 1) {
            row.get('comment').set('showForm', true);
          } else {
            otherRow.get('comment').set('showForm', true);
          }
          this.props.fileDiff.trigger('change');
          return;
        }

        // Clicked on add comment icon for a row that already has comment
        // form showing.
        var commentIndex = $commentRow.find('.line-comments').index();
        assert(commentIndex === 1 || commentIndex == 3);

        if (commentIndex === clickedIndex) {
          this.props.fileDiff.trigger('change');
          return;
        }

        // Both rows should exist in this case, and github automatically
        // added the comment form to the existing comment box, but this
        // is the wrong column.
        row.set('comment', new Comment({
          $text: $commentRow.find('.line-comments').clone().removeAttr('data-reactid'),
          count: 0,
          showForm: true,
          row: row,
        }));

        this.props.fileDiff.trigger('change');

        return;
      }

      // First time clicking add comment on this row.
      if (row.isUnchangedType() && clickedIndex === 3) {
        assert(!otherRow.has('comment'));
        otherRow.set('comment', new Comment({
          $text: $commentRow.find('.line-comments').clone().removeAttr('data-reactid'),
          count: 0,
          showForm: true,
          row: otherRow,
        }));
        this.props.fileDiff.trigger('change');
        return;
      }

      assert(!row.has('comment'));
      row.set('comment', new Comment({
        $text: $commentRow.find('.line-comments').clone().removeAttr('data-reactid'),
        count: 0,
        showForm: true,
        row: row,
      }));

      this.props.fileDiff.trigger('change');
    }.bind(this), 800);
  },
});


Globals.Views.FileDiffView = FileDiffView;

})();
