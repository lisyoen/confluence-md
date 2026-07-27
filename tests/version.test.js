'use strict';

const assert = require('assert');
const { compareVersions } = require('../src/version');

const checks = [
  ['same version', '1.0.0', '1.0.0', 0],
  ['greater major', '2.0.0', '1.9.9', 1],
  ['lower major', '1.9.9', '2.0.0', -1],
  ['greater minor', '1.2.0', '1.1.9', 1],
  ['lower minor', '1.1.9', '1.2.0', -1],
  ['greater patch', '1.0.2', '1.0.1', 1],
  ['lower patch', '1.0.1', '1.0.2', -1],
  ['numeric digit length', '1.10.0', '1.9.0', 1],
  ['invalid segment is zero', '1.invalid.1', '1.0.0', 1],
  ['invalid strings are zero', 'invalid', 'also-invalid', 0]
];

for (const [name, a, b, expected] of checks) {
  assert.strictEqual(compareVersions(a, b), expected);
  console.log(`PASS ${name}`);
}
console.log(`PASS all ${checks.length} version checks`);
