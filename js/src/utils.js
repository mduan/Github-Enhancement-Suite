(function() {

// Additions to underscore

_.isInt = function(n) {
  return typeof n === 'number' && n % 1 === 0;
};

_.isFloat = function(n) {
  return typeof n === 'number' && n % 1 !== 0;
}

// Other stuff...

Array.prototype.first = function() {
  return this[0];
}

Array.prototype.last = function() {
  return this[this.length-1];
}

Array.prototype.pushArr = function(arr) {
  Array.prototype.push.apply(this, arr);
}

function assert(condition, message) {
  if (!condition) {
    throw (message || 'Assertion failed');
  }
};

function inherit(Child, Parent, prototype) {
  function Proto() {
  }
  Proto.prototype = Parent.prototype;
  Child.prototype = new Proto();
  for (var key in prototype) {
    Child.prototype[key] = prototype[key];
  }
  Child.prototype.constructor = Child;
  Child.parent = Parent.prototype;
  return Child;
};

function getSetting(key) {
  return getSettings([key]).then(function(settings) {
    return settings[key];
  });
}

function getSettings(keys) {
  var deferred = new $.Deferred();
  chrome.storage.sync.get(keys, function(settings) {
    deferred.resolve(settings);
  });
  return deferred.promise();
}

function saveSetting(key, value) {
  var settings = {};
  settings[key] = value;
  return saveSettings(settings);
}

function saveSettings(settings) {
  var deferred = new $.Deferred();
  chrome.storage.sync.set(settings, function() {
    deferred.resolve();
  });
  return deferred.promise();
}

Globals.Utils = {
  assert: assert,
  inherit: inherit,
  getSetting: getSetting,
  getSettings: getSettings,
  saveSetting: saveSetting,
  saveSettings: saveSettings,
};

})();
