import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSpf, lintSpf, checkSpf } from '../src/index.js';

const codes = (list) => list.map((i) => i.code);

// Fake DNS: map of domain -> array of TXT strings.
const resolver = (zone) => async (name) => {
  if (!(name in zone)) throw Object.assign(new Error('not found'), { code: 'ENOTFOUND' });
  return zone[name];
};

test('parses mechanisms, qualifiers and modifiers', () => {
  const { terms, errors } = parseSpf('v=spf1 ip4:192.0.2.0/24 -ip6:2001:db8::/32 include:_spf.example.net ~all');
  assert.deepEqual(errors, []);
  assert.deepEqual(terms.map((t) => t.name), ['ip4', 'ip6', 'include', 'all']);
  assert.equal(terms[1].result, 'fail');
  assert.equal(terms[3].result, 'softfail');
});

test('reports syntax errors', () => {
  const { errors } = parseSpf('v=spf1 ip4:300.1.1.1 include: foo:bar all:x');
  assert.equal(errors.length, 4);
  assert.ok(parseSpf('spf1 -all').errors[0].includes('v=spf1'));
});

test('lint catches +all, ptr and missing all', () => {
  assert.ok(codes(lintSpf('v=spf1 +all')).includes('plus-all'));
  assert.ok(codes(lintSpf('v=spf1 ptr -all')).includes('ptr'));
  assert.ok(codes(lintSpf('v=spf1 ip4:192.0.2.1')).includes('no-all'));
  assert.ok(codes(lintSpf('v=spf1 -all ip4:192.0.2.1')).includes('after-all'));
  assert.deepEqual(lintSpf('v=spf1 mx -all'), []);
});

test('follows includes and counts DNS lookups', async () => {
  const zone = {
    'example.com': ['google-site-verification=abc', 'v=spf1 mx include:a.example include:b.example -all'],
    'a.example': ['v=spf1 ip4:192.0.2.1 include:c.example -all'],
    'b.example': ['v=spf1 a -all'],
    'c.example': ['v=spf1 ip4:198.51.100.0/24 -all'],
  };
  const r = await checkSpf('https://www.example.com/', { resolveTxt: resolver(zone) });
  assert.equal(r.domain, 'example.com');
  assert.equal(r.lookups, 5); // mx, include a, include b, include c, a
  assert.equal(r.ok, true);
  assert.equal(r.tree.includes.length, 2);
  assert.equal(r.tree.includes[0].includes[0].domain, 'c.example');
});

test('flags more than 10 lookups', async () => {
  const zone = { 'big.example': [`v=spf1 ${Array.from({ length: 11 }, (_, i) => `include:i${i}.example`).join(' ')} -all`] };
  for (let i = 0; i < 11; i++) zone[`i${i}.example`] = ['v=spf1 ip4:192.0.2.1 -all'];
  const r = await checkSpf('big.example', { resolveTxt: resolver(zone) });
  assert.equal(r.lookups, 11);
  assert.ok(codes(r.issues).includes('too-many-lookups'));
  assert.equal(r.ok, false);
});

test('flags multiple SPF records, missing SPF and broken includes', async () => {
  const zone = {
    'dup.example': ['v=spf1 -all', 'v=spf1 mx -all'],
    'nospf.example': ['hello'],
    'broken.example': ['v=spf1 include:gone.example -all'],
  };
  assert.ok(codes((await checkSpf('dup.example', { resolveTxt: resolver(zone) })).issues).includes('multiple-spf'));
  assert.ok(codes((await checkSpf('nospf.example', { resolveTxt: resolver(zone) })).issues).includes('no-spf'));
  assert.ok(codes((await checkSpf('broken.example', { resolveTxt: resolver(zone) })).issues).includes('include-no-spf'));
});

test('detects include loops', async () => {
  const zone = { 'x.example': ['v=spf1 include:y.example -all'], 'y.example': ['v=spf1 include:x.example -all'] };
  const r = await checkSpf('x.example', { resolveTxt: resolver(zone) });
  assert.ok(codes(r.issues).includes('loop'));
});
