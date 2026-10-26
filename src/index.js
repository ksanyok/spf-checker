import { resolveTxt as dnsResolveTxt } from 'node:dns/promises';
import { isSpf, parseSpf, lintSpf, LOOKUP_TERMS } from './parse.js';

export { isSpf, parseSpf, lintSpf } from './parse.js';

const MAX_LOOKUPS = 10;
const MAX_VOID = 2;

/** Default TXT resolver: joins multi-string TXT records as RFC 7208 §3.3 requires. */
async function defaultResolveTxt(domain) {
  const records = await dnsResolveTxt(domain);
  return records.map((chunks) => chunks.join(''));
}

function cleanDomain(input) {
  const s = String(input || '').trim().toLowerCase();
  if (!s) throw new TypeError('A domain is required');
  return s.replace(/^[a-z]+:\/\//, '').replace(/[/?#].*$/, '').replace(/\.$/, '').replace(/^www\./, '');
}

/**
 * Look up and fully evaluate the SPF policy of a domain, following include/redirect.
 * @param {string} domain
 * @param {{resolveTxt?: (d: string) => Promise<string[]>}} [options] inject a resolver for tests or custom DNS
 */
export async function checkSpf(domain, options = {}) {
  const resolveTxt = options.resolveTxt || defaultResolveTxt;
  const root = cleanDomain(domain);
  const issues = [];
  const state = { lookups: 0, voids: 0, visited: new Set() };
  const add = (level, code, message) => issues.push({ level, code, message });

  async function fetchSpf(name) {
    let txts;
    try {
      txts = await resolveTxt(name);
    } catch (err) {
      if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') return { records: [], void: true };
      throw err;
    }
    return { records: txts.filter(isSpf), void: false };
  }

  async function walk(name, depth) {
    const node = { domain: name, record: null, includes: [], lookups: 0 };
    if (state.visited.has(name)) {
      add('error', 'loop', `Include loop: ${name} is referenced more than once in the chain.`);
      return node;
    }
    state.visited.add(name);
    let res;
    try {
      res = await fetchSpf(name);
    } catch (err) {
      add('error', 'dns-error', `DNS error for ${name}: ${err.code || err.message}`);
      return node;
    }
    if (res.records.length === 0) {
      if (depth === 0) add('error', 'no-spf', `${name} has no SPF record (TXT starting with "v=spf1").`);
      else add('error', 'include-no-spf', `${name} is included but publishes no SPF record — evaluation returns "permerror".`);
      if (res.void) state.voids++;
      return node;
    }
    if (res.records.length > 1) add('error', 'multiple-spf', `${name} publishes ${res.records.length} SPF records; there must be exactly one.`);
    node.record = res.records[0];
    const parsed = parseSpf(node.record);
    node.terms = parsed.terms;
    for (const e of parsed.errors) add('error', 'syntax', `${name}: ${e}`);
    if (depth === 0) for (const w of lintSpf(node.record, parsed)) issues.push(w);
    else if (parsed.terms.some((t) => t.name === 'all' && t.qualifier === '+')) add('warning', 'include-plus-all', `${name} (included) ends with "+all".`);

    for (const t of parsed.terms) {
      if (!LOOKUP_TERMS.has(t.name)) continue;
      if (t.name === 'redirect' && parsed.terms.some((x) => x.name === 'all')) continue;
      state.lookups++;
      node.lookups++;
      if (t.name === 'include' || t.name === 'redirect') {
        const target = t.value.toLowerCase().replace(/\.$/, '');
        if (target.includes('%{')) continue; // macros cannot be expanded without a sender
        node.includes.push(await walk(target, depth + 1));
      }
    }
    return node;
  }

  const tree = await walk(root, 0);
  if (state.lookups > MAX_LOOKUPS) add('error', 'too-many-lookups', `SPF needs ${state.lookups} DNS lookups; the limit is ${MAX_LOOKUPS}. Receivers will return "permerror".`);
  else if (state.lookups >= 8) add('warning', 'near-limit', `SPF uses ${state.lookups} of ${MAX_LOOKUPS} DNS lookups — little room for another include.`);
  if (state.voids > MAX_VOID) add('error', 'void-lookups', `${state.voids} lookups returned no data; the limit is ${MAX_VOID}.`);

  return {
    domain: root,
    record: tree.record,
    lookups: state.lookups,
    voidLookups: state.voids,
    tree,
    issues,
    ok: !issues.some((i) => i.level === 'error'),
  };
}
