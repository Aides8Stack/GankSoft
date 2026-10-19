/** Human-readable titles never include storage identifiers. */
export function automaticQuestionTitle(stem: string): string {
  const text = stem.replace(/\s+/g, " ").trim();
  return text
    ? [...text].slice(0, 36).join("") + ([...text].length > 36 ? "…" : "")
    : "图片题";
}
export function isLegacyQuestionTitle(
  title: string,
  deckId: string,
  stem: string,
): boolean {
  return (
    /^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(deckId) &&
    title === `${deckId} · ${stem.slice(0, 24) || "图片题"}`
  );
}
