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
    var sideBySide = !this.props.diffViewer.get('sideBySide');
    this.props.diffViewer.set('sideBySide', sideBySide);
    // TODO(mack): Do this in the model
    saveSetting('sideBySide', sideBySide);
  },

  clickWordWrapCheckbox: function(evt) {
    var wordWrap = !this.props.diffViewer.get('wordWrap');
    this.props.diffViewer.set('wordWrap', wordWrap);
    saveSetting('wordWrap', wordWrap);
  },

  render: function() {
    return (
      <span className="settingCheckboxes">
        {this.renderSideBySideCheckbox()}
        {this.renderWordWrapCheckbox()}
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

    var attributes = {
      onClick: this.clickSideBySideCheckbox,
      type: 'checkbox',
      id: 'sideBySide',
    };
    if (sideBySide) {
      attributes.checked = 'checked';
    }

    return (
      <span>
        {React.DOM.input(attributes)}
        <label id="sideBySideLabel" htmlFor="sideBySide">
          <span className="mini-icon mini-icon-public-mirror"></span>
          side by side
        </label>
      </span>
    );
  },

  renderWordWrapCheckbox: function() {
    var wordWrap = this.props.diffViewer.get('wordWrap');;
    if (wordWrap) {
      $('#files').addClass('wordWrap');
    } else {
      $('#files').removeClass('wordWrap');
    }

    var attributes = {
      onClick: this.clickWordWrapCheckbox,
      type: 'checkbox',
      id: 'wordWrap',
    };
    if (wordWrap) {
      attributes.checked = 'checked';
    }

    return (
      <span>
        {React.DOM.input(attributes)}
        <label id="wordWrapLabel" htmlFor="wordWrap">
          <span className="mini-icon mini-icon-reorder"></span>
          word wrap
        </label>
      </span>
    );
  },
});

Globals.Views.CheckboxesView = CheckboxesView;


})();
