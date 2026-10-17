const PATTERNS: Array<[string, RegExp]> = [
  ['ignore-instructions', /ignore (all |any |the )?(previous|prior|above|earlier) (instructions|rules)/i],
  ['override-policy', /(disregard|override|bypass|disable) (the )?(policy|rules|limits|safety)/i],
  ['send-all', /(send|transfer|move|drain) (all|everything|the entire|full balance)/i],
  ['role-hijack', /you are now|act as (an? )?(admin|root|owner)|system prompt/i],
  ['urgent-pressure', /(urgent|immediately|right now).{0,40}(send|transfer|pay)/i],
  ['no-approval', /(without|no) (asking|approval|confirmation)|do not ask/i],
  ['hidden-address', /0x[a-fA-F0-9]{40}/],
];

export function scanUntrusted(text: string): string[] {
  return PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
}

export function wrapUntrusted(text: string): string {
  return `<untrusted_document>\n${text}\n</untrusted_document>`;
}

/** Content is untrusted if the caller says so, regardless of what it contains. */
export function isTainted(attachment: string | undefined): boolean {
  return typeof attachment === 'string' && attachment.trim().length > 0;
}
