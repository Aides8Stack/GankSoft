import { contentIdentity, contentOrdinal } from './identity.ts';
import { z } from 'zod';
type Camel<S extends string> = S extends 'learning_version'
  ? 'contentVersion'
  : S extends `${infer A}_${infer B}`
    ? `${A}${Capitalize<Camel<B>>}`
    : S;
export type Wire<T> = T extends readonly (infer I)[]
  ? Wire<I>[]
  : T extends object
    ? {
        [K in keyof T as K extends string ? Camel<K> : K]: K extends
          | 'content_version'
          | 'learning_version'
          | 'card_version'
          | 'contentVersion'
          | 'currentContentVersion'
          | 'selectedVersion'
          ? null extends T[K]
            ? string | null
            : string
          : K extends 'versions'
            ? string[]
            : Wire<T[K]>;
      }
    : T;
export type Shape = {
  type: string;
  value?: string | number | boolean;
  item?: Shape;
  members?: Shape[];
  properties?: { name: string; optional: boolean; shape: Shape }[];
};
const versionKeys = new Set([
  'content_version',
  'learning_version',
  'card_version',
  'contentVersion',
  'currentContentVersion',
  'selectedVersion',
]);
const camel = (s: string) =>
  s === 'learning_version'
    ? 'contentVersion'
    : s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
function propertySchema(p: { name: string; shape: Shape }, wire: boolean): z.ZodType {
  if (wire && versionKeys.has(p.name)) {
    const nullable = p.shape.type === 'null' || p.shape.members?.some((m) => m.type === 'null');
    return nullable ? z.uuid().nullable() : z.uuid();
  }
  if (wire && p.name === 'versions') return z.array(z.uuid());
  return schema(p.shape, wire);
}
function schema(s: Shape, wire: boolean): z.ZodType {
  switch (s.type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number().finite();
    case 'null':
      return z.null();
    case 'undefined':
      return z.undefined();
    case 'literal':
      return z.literal(s.value!);
    case 'json':
      return z.json();
    case 'array':
      return z.array(schema(s.item!, wire));
    case 'record':
      return z.record(z.string(), schema(s.item!, wire));
    case 'union': {
      const members = s.members!.filter((x) => x.type !== 'undefined').map((x) => schema(x, wire));
      return members.length === 1
        ? members[0]
        : z.union(members as [z.ZodType, z.ZodType, ...z.ZodType[]]);
    }
    case 'object': {
      const fields = Object.fromEntries(
        s.properties!.map((p) => [
          wire ? camel(p.name) : p.name,
          p.optional ? propertySchema(p, wire).optional() : propertySchema(p, wire),
        ]),
      );
      return wire ? z.strictObject(fields) : z.object(fields);
    }
    default:
      throw Error('Unknown descriptor ' + s.type);
  }
}
function convert(value: unknown, s: Shape, encode: boolean, scope?: string): unknown {
  if (value === undefined || value === null) return value;
  if (s.type === 'array')
    return (value as unknown[]).map((x) => convert(x, s.item!, encode, scope));
  if (s.type === 'union') {
    const member = s.members!.find((m) => schema(m, !encode).safeParse(value).success);
    return member ? convert(value, member, encode, scope) : value;
  }
  if (s.type === 'record')
    return Object.fromEntries(
      Object.entries(value as object).map(([k, v]) => [k, convert(v, s.item!, encode, scope)]),
    );
  if (s.type === 'object') {
    const input = value as Record<string, unknown>;
    const cardId = String(
      (encode ? input.question_id : input.questionId) ??
        (encode ? input.card_id : input.cardId) ??
        input.cardId ??
        input.id ??
        scope ??
        '',
    );
    return Object.fromEntries(
      s
        .properties!.filter((p) => input[encode ? p.name : camel(p.name)] !== undefined)
        .map((p) => [
          encode ? camel(p.name) : p.name,
          versionKeys.has(p.name)
            ? input[encode ? p.name : camel(p.name)] === null
              ? null
              : encode
                ? contentIdentity(cardId, Number(input[p.name]))
                : contentOrdinal(String(input[camel(p.name)]), cardId)
            : p.name === 'versions'
              ? (input[encode ? p.name : camel(p.name)] as (string | number)[]).map((v) =>
                  encode ? contentIdentity(cardId, Number(v)) : contentOrdinal(String(v), cardId),
                )
              : convert(input[encode ? p.name : camel(p.name)], p.shape, encode, cardId),
        ]),
    );
  }
  return value;
}
/** Generated projection: persistence names are private; only camelCase DTOs cross IPC. */
export function createCodec<T>(description: Shape) {
  const model = schema(description, false) as z.ZodType<T>,
    wire = schema(description, true) as z.ZodType<Wire<T>>;
  return {
    model,
    wire,
    encode: (value: unknown): Wire<T> => wire.parse(convert(model.parse(value), description, true)),
    decode: (value: unknown): T => model.parse(convert(wire.parse(value), description, false)),
  };
}
