/** @jsx React.DOM */

$(document).ready(function() {
  var DiffViewer = Globals.Models.DiffViewer;
  var FileDiff = Globals.Models.FileDiff;
  var FileDiffView = Globals.Views.FileDiffView;
  var CheckboxesView = Globals.Views.CheckboxesView;
  var getSettings = Globals.Utils.getSettings;

  getSettings(['sideBySide', 'wordWrap']).then(function(settings) {
    var wordWrap = 'wordWrap' in settings ? settings.wordWrap : true;
    var sideBySide = 'sideBySide' in settings ? settings.sideBySide : true;

    var diffViewer = new DiffViewer({
      sideBySide: sideBySide,
      wordWrap: wordWrap,
      numLinesToShow: 20,
    });

    $('.file-diff').each(function() {
      var $fileDiff = $(this);
      var fileDiff = FileDiff.createFileDiff($fileDiff, diffViewer);

      // // TODO(mack): Figure out how to do this cleanly
      $fileDiff.empty();

      var fileDiffView = <FileDiffView fileDiff={fileDiff} diffViewer={diffViewer} />;
      React.renderComponent(fileDiffView, $fileDiff.get(0));
    });

    var checkboxesView = <CheckboxesView diffViewer={diffViewer} />
    var $checkboxesContainer = $('<span />').appendTo($('#toc .explain'));
    React.renderComponent(checkboxesView, $checkboxesContainer.get(0));
  });
});
