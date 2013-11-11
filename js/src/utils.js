(function() {

var Utils = Globals.Utils = {};

Utils.assert = function assert(condition, message) {
  if (!condition) {
    throw (message || 'Assertion failed');
  }
};

})();
