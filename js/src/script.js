/** @jsx React.DOM */

(function() {

$(document).ready(function() {
  var Parser = Globals.Parser;

  var fileDiffViews = [];
  $('.file-diff').each(function() {
    var $fileDiff = $(this);
    var fileDiff = Parser.parseFileDiff($fileDiff);

    // // TODO(mack): Figure out how to do this cleanly
    // $fileDiff.empty();

    // var fileDiffView = (
    //   <FileDiffView
    //       linesToShow={20}
    //       fileDiff={fileDiff}
    //       sideBySide={true}
    //       wordWrap={true} />
    // );
    // React.renderComponent(fileDiffView, $fileDiff.get(0));
  });
});

})();
