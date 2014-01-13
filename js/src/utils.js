(function() {

// Additions to underscore

_.isInt = function(n) {
  return typeof n === 'number' && n % 1 === 0;
};

_.isFloat = function(n) {
  return typeof n === 'number' && n % 1 !== 0;
}

_.deferBy = function(func, millis) {
  var restArgs = _.rest(arguments, 2);
  setTimeout(function() {
    func.apply(null, restArgs);
  }, millis);
};

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

// TODO(mack): Chrome's syncing internally runs the callback in an exception
// handler, causing the stack ot be lost. For now, queue the callback to run
// in different context avoid this, but should really find a better solution.
// Also, doing the same thing in saveSettings().
function getSettings(keys) {
  var deferred = new $.Deferred();
  chrome.storage.sync.get(keys,
    _.defer.bind(null, function(settings) {
      deferred.resolve(settings);
    })
  );
  return deferred.promise();
}

function saveSetting(key, value) {
  var settings = {};
  settings[key] = value;
  return saveSettings(settings);
}

function saveSettings(settings) {
  var deferred = new $.Deferred();
  chrome.storage.sync.set(settings,
    _.defer.bind(null, function() {
      deferred.resolve();
    })
  );
  return deferred.promise();
}


/**
 *
 * Delay jobs to make the page remain responsive during expensive jobs.
 *
 */
var WorkQueue = (function() {
  var running = false;
  var queue = [];
  var INTERJOB_DELAY_MS = 15;

  var runNextJob = function() {
    if (queue.length === 0) {
      running = false;
      return;
    }

    var job = queue.shift();

    job.fn.apply(job.context);

    setTimeout(function() {
      runNextJob();
    }, INTERJOB_DELAY_MS);
  };

  var start = function() {
    if (running) return;
    running = true;
    runNextJob();
  };

  return {
    add: function(fn, context) {
      queue.push({
        fn: fn,
        context: context
      });

      setTimeout(start, INTERJOB_DELAY_MS);
    }
  }
})();


Globals.Utils = {
  assert: assert,
  inherit: inherit,
  getSetting: getSetting,
  getSettings: getSettings,
  saveSetting: saveSetting,
  saveSettings: saveSettings,
  WorkQueue: WorkQueue,
};

})();
