/** Lower-case, drop punctuation (Edge adds full stops) and squash spaces. */
export function normalizePhrase(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
