/** @jsx React.DOM */

$(document).ready(function() {
  var DiffViewer = Globals.Models.DiffViewer;
  var FileDiff = Globals.Models.FileDiff;
  var FileDiffView = Globals.Views.FileDiffView;
  var CheckboxesView = Globals.Views.CheckboxesView;
  var getSettings = Globals.Utils.getSettings;

  function renderFileDiffs(diffViewer) {
    $('.file').each(function() {
      var $file = $(this);
      var fileDiff = FileDiff.createFileDiff($file);

      var $fileDiff = $file.find('.file-diff');
      $fileDiff.empty();
      var fileDiffView = <FileDiffView fileDiff={fileDiff} diffViewer={diffViewer} />;
      React.renderComponent(fileDiffView, $fileDiff.get(0));
    });
  }

  function renderCheckboxes(diffViewer) {
    var checkboxesView = <CheckboxesView diffViewer={diffViewer} />
    var $checkboxesContainer = $('<span id="settingCheckboxesContainer"/>').
        appendTo($('#toc .explain'));
    React.renderComponent(checkboxesView, $checkboxesContainer.get(0));
  }

  function renderPage(diffViewer) {
    renderFileDiffs(diffViewer);
    renderCheckboxes(diffViewer);
  }

  getSettings(['sideBySide', 'wordWrap']).then(function(settings) {
    var wordWrap = 'wordWrap' in settings ? settings.wordWrap : true;
    var sideBySide = 'sideBySide' in settings ? settings.sideBySide : true;
    var diffViewer = new DiffViewer({
      sideBySide: sideBySide,
      wordWrap: wordWrap,
      numLinesToShow: 20,
    });
    renderPage(diffViewer);
  });
});
