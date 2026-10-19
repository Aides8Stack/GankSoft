/** Page identity ignores selection order; partially overlapping sets remain separate pages. */
export function queueIdentity(deckId: string, ids: string[]): string {
  return JSON.stringify([deckId, [...new Set(ids)].sort()]);
}
export function formatStudyTime(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 3600)
    .toString()
    .padStart(2, '0')}:${Math.floor((value % 3600) / 60)
    .toString()
    .padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
}
