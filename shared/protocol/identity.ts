import { z } from 'zod';
/** UUIDv8 content identity: a card namespace plus its monotonic content ordinal.
 * Storage ordinals stay private to reused domain rules; wire contracts use UUIDs.
 */
export function contentIdentity(cardId: string, ordinal: number): string {
  if (
    !z.uuid().safeParse(cardId).success ||
    !Number.isSafeInteger(ordinal) ||
    ordinal < 0 ||
    ordinal > 0xffffffffffff
  )
    throw new Error('内容版本身份不合法');
  const base = cardId.replaceAll('-', '').toLowerCase();
  const token =
    base.slice(0, 8) +
    '-' +
    base.slice(8, 12) +
    '-8' +
    base.slice(13, 16) +
    '-a' +
    base.slice(17, 20) +
    '-' +
    (BigInt('0x' + base.slice(-12)) ^ BigInt(ordinal)).toString(16).padStart(12, '0');
  return z.uuid().parse(token);
}
export function contentOrdinal(token: string, cardId?: string): number {
  if (!cardId) throw new Error('内容版本必须携带卡片身份');
  const uuid = z.uuid().parse(token),
    ordinal = Number(
      BigInt('0x' + uuid.slice(-12)) ^ BigInt('0x' + cardId.replaceAll('-', '').slice(-12)),
    );
  if (uuid[14] !== '8' || uuid[19] !== 'a' || (cardId && contentIdentity(cardId, ordinal) !== uuid))
    throw new Error('内容版本不属于此卡片');
  return ordinal;
}
