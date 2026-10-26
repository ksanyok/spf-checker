// SPF record parser (RFC 7208). Pure functions, no network.

const MECHANISMS = ['all', 'include', 'a', 'mx', 'ptr', 'ip4', 'ip6', 'exists'];
const MODIFIERS = ['redirect', 'exp'];
const QUALIFIERS = { '+': 'pass', '-': 'fail', '~': 'softfail', '?': 'neutral' };
// Mechanisms and modifiers that cost a DNS lookup (RFC 7208 §4.6.4).
export const LOOKUP_TERMS = new Set(['include', 'a', 'mx', 'ptr', 'exists', 'redirect']);

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export function isSpf(txt) {
  return /^v=spf1(\s|$)/i.test(txt.trim());
}

function validIp4(value) {
  const [ip, cidr, extra] = value.split('/');
  if (extra !== undefined || !IPV4.test(ip)) return false;
  return cidr === undefined || (/^\d+$/.test(cidr) && Number(cidr) <= 32);
}

function validIp6(value) {
  const [ip, cidr, extra] = value.split('/');
  if (extra !== undefined || !/^[0-9a-f:.]+$/i.test(ip) || !ip.includes(':')) return false;
  if ((ip.match(/::/g) || []).length > 1) return false;
  return cidr === undefined || (/^\d+$/.test(cidr) && Number(cidr) <= 128);
}

/**
 * Parse an SPF record into terms and syntax problems.
 * @param {string} record e.g. "v=spf1 include:_spf.google.com ~all"
 */
export function parseSpf(record) {
  const errors = [];
  const terms = [];
  const parts = record.trim().split(/\s+/);
  if (!parts.length || parts[0].toLowerCase() !== 'v=spf1') {
    errors.push('Record must start with "v=spf1".');
    return { terms, errors };
  }
  for (const raw of parts.slice(1)) {
    const mod = raw.match(/^([a-z][a-z0-9_.-]*)=(.*)$/i);
    if (mod) {
      const name = mod[1].toLowerCase();
      if (!MODIFIERS.includes(name)) errors.push(`Unknown modifier "${raw}".`);
      if (!mod[2]) errors.push(`Modifier "${name}" needs a value.`);
      terms.push({ type: 'modifier', name, value: mod[2], raw });
      continue;
    }
    let qualifier = '+';
    let body = raw;
    if (QUALIFIERS[raw[0]]) { qualifier = raw[0]; body = raw.slice(1); }
    const m = body.match(/^([a-z0-9]+)(?:([:/])(.*))?$/i);
    const name = m ? m[1].toLowerCase() : body;
    if (!m || !MECHANISMS.includes(name)) {
      errors.push(`Unknown mechanism "${raw}".`);
      continue;
    }
    const value = m[2] === '/' ? `/${m[3]}` : m[3] || '';
    const term = { type: 'mechanism', name, qualifier, result: QUALIFIERS[qualifier], value, raw };
    if (name === 'ip4' && !validIp4(value)) errors.push(`Invalid IPv4 address or range in "${raw}".`);
    if (name === 'ip6' && !validIp6(value)) errors.push(`Invalid IPv6 address or range in "${raw}".`);
    if ((name === 'include' || name === 'exists') && !value) errors.push(`"${name}" requires a domain, e.g. ${name}:example.com.`);
    if (name === 'all' && value) errors.push(`"all" takes no argument: "${raw}".`);
    terms.push(term);
  }
  const redirects = terms.filter((t) => t.name === 'redirect').length;
  if (redirects > 1) errors.push('Only one "redirect=" modifier is allowed.');
  if (terms.filter((t) => t.name === 'exp').length > 1) errors.push('Only one "exp=" modifier is allowed.');
  return { terms, errors };
}

/** Local (non-recursive) lints for a parsed record. */
export function lintSpf(record, parsed = parseSpf(record)) {
  const warnings = [];
  const { terms } = parsed;
  const allIdx = terms.findIndex((t) => t.name === 'all');
  const all = terms[allIdx];
  if (all && all.qualifier === '+') warnings.push({ level: 'error', code: 'plus-all', message: '"+all" allows any server on the internet to send mail as this domain.' });
  if (all && all.qualifier === '?') warnings.push({ level: 'warning', code: 'neutral-all', message: '"?all" gives no protection; use "~all" or "-all".' });
  if (!all && !terms.some((t) => t.name === 'redirect')) warnings.push({ level: 'warning', code: 'no-all', message: 'No "all" mechanism: unmatched senders get "neutral". End the record with "~all" or "-all".' });
  if (all && allIdx < terms.length - 1 && terms.slice(allIdx + 1).some((t) => t.type === 'mechanism')) {
    warnings.push({ level: 'warning', code: 'after-all', message: 'Mechanisms after "all" are never evaluated.' });
  }
  if (all && terms.some((t) => t.name === 'redirect')) warnings.push({ level: 'info', code: 'redirect-ignored', message: '"redirect=" is ignored because the record contains "all".' });
  if (terms.some((t) => t.name === 'ptr')) warnings.push({ level: 'warning', code: 'ptr', message: '"ptr" is deprecated (RFC 7208 §5.5) and slow; replace it with ip4/ip6 or include.' });
  const seen = new Set();
  for (const t of terms) {
    const key = `${t.name}:${(t.value || '').toLowerCase()}`;
    if (t.type === 'mechanism' && seen.has(key)) warnings.push({ level: 'info', code: 'duplicate', message: `Duplicate term "${t.raw}".` });
    seen.add(key);
  }
  if (record.length > 450) warnings.push({ level: 'warning', code: 'long-record', message: `Record is ${record.length} characters; responses over 512 bytes may fall back to TCP or be truncated.` });
  return warnings;
}
