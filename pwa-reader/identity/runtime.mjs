// Runtime adaptation only. The five frozen v0 modules alongside this file are
// unchanged. No POS model, benchmark, dictionary enrichment, or persisted keys.
import { resolveOccurrence } from './identity-resolver.mjs';
import { tokenize, normalize } from './resolver.mjs';
import { lexicalCandidates } from './identity-lexicon.mjs';

const titles = /\b(?:mr|mrs|ms|miss|dr|doctor|professor|captain|sir|lady|lord|reverend)$/i;
const MAX_CONTEXT_TOKENS = 96;

function resolveBounded(capture) {
  if (!capture || capture.sentence.length > 4096
      || tokenize(capture.sentence).length > MAX_CONTEXT_TOKENS) return null;
  return resolveOccurrence({ sentence: capture.sentence, targetOffset: capture.targetOffset });
}

export function captureOccurrence(text, start, end) {
  if (typeof text !== 'string' || !Number.isInteger(start) || !Number.isInteger(end)
      || start < 0 || end <= start || end > text.length) return null;
  // Keep line breaks in context: frozen name evidence permits Dr\nLight.
  const boundary = i => /[!?;]/u.test(text[i])
    || (text[i] === '.' && !titles.test(text.slice(Math.max(0, i - 12), i)));
  let from = start;
  let to = end;
  while (from > 0 && !boundary(from - 1)) {
    if (end - from > 4096) return null;
    from--;
  }
  while (to < text.length && !boundary(to)) {
    if (to - from > 4096) return null;
    to++;
  }
  if (to < text.length) to++;
  return { sentence: text.slice(from, to), targetOffset: start - from, targetEnd: end - from };
}

export function resolveCapture(capture) {
  try {
    const { sentence, targetOffset, targetEnd } = capture || {};
    // Optional assistance must remain bounded on pathological imported text.
    // Abstention here does not change the frozen resolver's API or decisions.
    if (typeof sentence !== 'string'
        || !Number.isInteger(targetEnd) || targetEnd <= targetOffset || targetEnd > sentence.length) return null;
    const local = captureOccurrence(sentence, targetOffset, targetEnd);
    const result = resolveBounded(local);
    if (!result) return null;
    if (result.status !== 'resolved') return result;
    const segments = result.phraseMatch?.segments;
    const token = segments ? null : tokenize(local.sentence).find(t => t.start === local.targetOffset);
    const start = segments ? segments[0].start : token?.start;
    const end = segments ? segments.at(-1).end : token?.end;
    // A selected substring or arbitrary multiword selection is not the resolved
    // occurrence. In particular, never save only a phrase's head as the phrase.
    return start === local.targetOffset && end === local.targetEnd ? result : null;
  } catch {
    return null;
  }
}

export function addOccurrenceForms(text, items) {
  const aliases = new Map();
  const heads = new Set(items.map(item => normalize(item.term).split(' ')[0]));
  for (const token of tokenize(text || '')) {
    if (!lexicalCandidates(token.word).some(candidate => heads.has(candidate.term))) continue;
    const capture = captureOccurrence(text, token.start, token.end);
    const result = resolveBounded(capture);
    if (result?.status !== 'resolved' || result.phraseMatch?.separable) continue;
    const forms = aliases.get(result.canonicalTerm) || new Set();
    forms.add(result.surfaceForm);
    aliases.set(result.canonicalTerm, forms);
  }
  return items.map(item => ({ ...item, matchTerms: [...new Set([item.term, ...(aliases.get(normalize(item.term)) || [])])] }));
}
