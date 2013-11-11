/** @jsx React.DOM */

$(document).ready(function() {
  var fileDiffViews = [];
  $('.file-diff').each(function() {
    var $fileDiff = $(this);
    var sampleSpan = (
      <span>Sample text</span>
    );
    React.renderComponent(sampleSpan, $fileDiff.get(0));
  });
});
console.log('here!');

