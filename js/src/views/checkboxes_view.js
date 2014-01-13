/** @jsx React.DOM */

(function() {

var getSetting = Globals.Utils.getSetting;
var getSettings = Globals.Utils.getSettings;
var saveSetting = Globals.Utils.saveSetting;
var saveSettings = Globals.Utils.saveSettings;

var CheckboxesView = React.createClass({

  componentDidMount: function() {
    this.events = _.clone(Backbone.Events);
    this.events.listenTo(this.props.diffViewer, 'change', this.reRender);
  },

  componentWillUnmount: function() {
    this.events.stopListening();
  },

  reRender: function() {
    // TODO(mack): remove this hack
    this.setState({ random: Math.random() });
  },

  clickSideBySideCheckbox: function(evt) {
    var checked = !this.props.diffViewer.get('sideBySide');
    this.props.diffViewer.set('sideBySide', checked);
    // TODO(mack): Do this in the model
    saveSetting('sideBySide', checked);
  },

  clickWordWrapCheckbox: function(evt) {
    var checked = !this.props.diffViewer.get('wordWrap');
    this.props.diffViewer.set('wordWrap', checked);
    saveSetting('wordWrap', checked);
  },

  clickSyntaxHighlightCheckbox: function(evt) {
    var checked = !this.props.diffViewer.get('syntaxHighlight');
    this.props.diffViewer.set('syntaxHighlight', checked);
    saveSetting('syntaxHighlight', checked);
  },

  render: function() {
    return (
      <span className="settingCheckboxes">
        {this.renderSideBySideCheckbox()}
        {this.renderWordWrapCheckbox()}
        {this.renderSyntaxHighlightCheckbox()}
      </span>
    );
  },

  renderSideBySideCheckbox: function() {
    var sideBySide = this.props.diffViewer.get('sideBySide');
    if (sideBySide) {
      $('#files').addClass('sideBySide');
    } else {
      $('#files').removeClass('sideBySide');
    }

    return this.renderCheckbox({
      onClick: this.clickSideBySideCheckbox,
      id: 'sideBySide',
      checked: sideBySide,
      text: 'side by side',
    });
  },

  renderWordWrapCheckbox: function() {
    var wordWrap = this.props.diffViewer.get('wordWrap');;
    if (wordWrap) {
      $('#files').addClass('wordWrap');
    } else {
      $('#files').removeClass('wordWrap');
    }

    return this.renderCheckbox({
      onClick: this.clickWordWrapCheckbox,
      id: 'wordWrap',
      checked: wordWrap,
      text: 'word wrap',
    });
  },

  renderSyntaxHighlightCheckbox: function() {
    var syntaxHighlight = this.props.diffViewer.get('syntaxHighlight');;
    if (syntaxHighlight) {
      $('#files').addClass('hljs');
    } else {
      $('#files').removeClass('hljs');
    }

    return this.renderCheckbox({
      onClick: this.clickSyntaxHighlightCheckbox,
      id: 'syntaxHighlight',
      checked: syntaxHighlight,
      text: 'syntax highlighting',
    });
  },

  renderCheckbox: function(params) {
    var attributes = {
      onClick: params.onClick,
      type: 'checkbox',
      id: params.id,
    };
    if (params.checked) {
      attributes.checked = 'checked';
    }

    return (
      <span>
        {React.DOM.input(attributes)}
        <label id={params.id + 'Label'} htmlFor={params.id}>
          {params.text}
        </label>
      </span>
    );
  },
});

Globals.Views.CheckboxesView = CheckboxesView;


})();
