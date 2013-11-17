/** @jsx React.DOM */

(function() {

$(document).ready(function() {
  var Parser = Globals.Parser;
  var FileDiffView = Globals.FileDiffView;

  var fileDiffViews = [];
  $('.file-diff').each(function() {
    var $fileDiff = $(this);
    var fileDiff = Parser.parseFileDiff($fileDiff);

    // // TODO(mack): Figure out how to do this cleanly
    $fileDiff.empty();

    var fileDiffView = (
      <FileDiffView
          numLinesToShow={20}
          fileDiff={fileDiff}
          sideBySide={true}
          wordWrap={true} />
    );
    React.renderComponent(fileDiffView, $fileDiff.get(0));
  });
});

})();
