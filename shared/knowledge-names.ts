export function nextKnowledgeName(names: Iterable<string>): string {
  const used = new Set(names);
  let n = 1;
  while (used.has(`新知识点${n}`)) n++;
  return `新知识点${n}`;
}
