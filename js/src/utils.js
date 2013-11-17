(function() {

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

function isNum(value) {
  return !isNaN(value);
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

Globals.Utils = {
  assert: assert,
  inherit: inherit,
  isNum: isNum,
};

})();
