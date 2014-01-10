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

      var $fileDiff = $file.find('.file-diff');
      if (!$fileDiff.length) {
        // It's possible for there not to be a diff for this file. For
        // example, creation of an empty file, or changes in a binary file.
        return;
      }

      var fileDiff = FileDiff.createFileDiff($file, diffViewer);
      var fileDiffView = <FileDiffView fileDiff={fileDiff} diffViewer={diffViewer} />;

      $fileDiff.empty();
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
    if (diffViewer.get('sideBySide')) {
      $('body').addClass('sideBySide');
    }
  }

  getSettings(['sideBySide', 'wordWrap']).then(function(settings) {
    var wordWrap = 'wordWrap' in settings ? settings.wordWrap : true;
    var sideBySide = 'sideBySide' in settings ? settings.sideBySide : true;
    var urlMatches = location.href.match('^.*?://github.com/(.+?)/(.+?)/');
    var diffViewer = new DiffViewer({
      sideBySide: sideBySide,
      wordWrap: wordWrap,
      syntaxHighlight: true,
      numLinesToShow: 20,
      author: urlMatches[1],
      repo: urlMatches[2],
    });
    renderPage(diffViewer);
  });
});
