(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ConfluenceMdVersion = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function parseSegment(segment) {
    var value = Number(segment);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function compareVersions(a, b) {
    var aSegments = String(a).split('.');
    var bSegments = String(b).split('.');
    var segmentCount = Math.max(aSegments.length, bSegments.length, 3);

    for (var index = 0; index < segmentCount; index += 1) {
      var aValue = parseSegment(aSegments[index]);
      var bValue = parseSegment(bSegments[index]);
      if (aValue > bValue) return 1;
      if (aValue < bValue) return -1;
    }
    return 0;
  }

  return {
    compareVersions: compareVersions
  };
}));
