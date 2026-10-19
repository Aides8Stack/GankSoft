import { z } from 'zod';
import { assertWireValue, PROTOCOL, ProtocolError } from './data.ts';
import { registry, RequestSchema, type Handlers, type Method, type Response } from './registry.ts';
import { callLifecycle, type CallTransition } from './lifecycle.ts';

export interface Receipt {
  method: string;
  digest: string;
  response: Response;
}
export interface ProtocolStore {
  epoch(): string;
  revision(): number;
  atomic<T>(action: () => T): T;
  getReceipt(id: string): Receipt | null;
  putReceipt(id: string, receipt: Receipt): void;
  bumpRevision(): number;
}
export function canonical(value: unknown): string {
  assertWireValue(value);
  function sorted(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(sorted);
    if (v !== null && typeof v === 'object')
      return Object.fromEntries(
        Object.entries(v)
          .sort(([a], [b]) => a.localeCompare(b, 'en'))
          .map(([k, x]) => [k, sorted(x)]),
      );
    return v;
  }
  return JSON.stringify(sorted(value));
}
function invalid(error: z.ZodError, code = 'VALIDATION_ERROR'): ProtocolError {
  return new ProtocolError(
    code,
    '数据不符合内部协议',
    'rejected',
    false,
    error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  );
}
/** One boundary for in-process and IPC callers. All writes have one atomic owner. */
export function createHost(
  store: ProtocolStore,
  handlers: Handlers,
  hash: (value: string) => string,
  translate: (error: unknown) => ProtocolError = () =>
    new ProtocolError('INTERNAL_ERROR', '内部操作失败'),
  guard: () => void = () => {},
  observe: (event: CallTransition) => void = () => {},
) {
  const supportedMethods = [
    'app.capabilities',
    ...Object.keys(handlers).filter((k) => k !== 'app.capabilities'),
  ].sort();
  return {
    execute(raw: unknown): Response {
      let requestId: string | null = null;
      const lifecycle = callLifecycle(observe);
      lifecycle.move('validating');
      try {
        assertWireValue(raw);
        const base = RequestSchema.safeParse(raw);
        if (!base.success) throw invalid(base.error);
        const req = base.data;
        requestId = req.requestId;
        lifecycle.identify(requestId);
        guard();
        if (req.protocol.major !== PROTOCOL.major || req.protocol.minor !== PROTOCOL.minor)
          throw new ProtocolError('CONTRACT_UNSUPPORTED', '不支持的内部协议版本');
        if (!Object.hasOwn(registry, req.method))
          throw new ProtocolError('METHOD_UNSUPPORTED', '未定义的方法');
        const method = req.method as Method,
          definition = registry[method];
        if (method !== 'app.capabilities' && req.dataEpoch !== store.epoch())
          throw new ProtocolError('DATA_EPOCH_CHANGED', '数据代次已变化，请重新载入');
        const parsed = definition.input.safeParse(req.payload);
        if (!parsed.success) throw invalid(parsed.error);
        if (!supportedMethods.includes(method))
          throw new ProtocolError('METHOD_UNAVAILABLE', '此方法尚未接入当前应用');
        const digest = hash(canonical({ method, payload: parsed.data }));
        lifecycle.move('ready');
        const invoke = (): Response => {
          if (definition.effect !== 'query') {
            const old = store.getReceipt(req.requestId);
            if (old) {
              if (old.method !== method || old.digest !== digest)
                throw new ProtocolError('IDEMPOTENCY_CONFLICT', '请求编号已用于其他操作');
              // The read-only replay path does not change the revision or data.
              return old.response;
            }
          }
          lifecycle.move('executing');
          const value =
            method === 'app.capabilities'
              ? {
                  protocol: PROTOCOL,
                  dataEpoch: store.epoch(),
                  supportedMethods,
                  definedMethods: Object.keys(registry).sort(),
                  maxRequestBytes: 2_000_000 as const,
                }
              : (
                  handlers[method] as (
                    p: unknown,
                    c: { requestId: string; dataEpoch: string },
                  ) => unknown
                )(parsed.data, { requestId: req.requestId, dataEpoch: store.epoch() });
          if (value instanceof Promise)
            throw new ProtocolError('ASYNC_HANDLER_REJECTED', '事务内禁止异步处理器');
          assertWireValue(value);
          const checked = definition.output.safeParse(value);
          if (!checked.success) throw invalid(checked.error, 'OUTPUT_INVALID');
          const data = z.json().parse(checked.data);
          lifecycle.move('outputValidated');
          const revision = definition.effect === 'query' ? store.revision() : store.bumpRevision();
          const response: Response = {
            ok: true,
            requestId: req.requestId,
            dataEpoch: store.epoch(),
            dataRevision: revision,
            data,
          };
          if (definition.effect !== 'query')
            store.putReceipt(req.requestId, { method, digest, response });
          return response;
        };
        if (definition.effect === 'query') {
          const response = invoke();
          lifecycle.move('succeeded');
          return response;
        }
        const response = store.atomic(() => {
          const result = invoke();
          if (lifecycle.state === 'outputValidated') lifecycle.move('committing');
          return result;
        });
        lifecycle.move(lifecycle.state === 'ready' ? 'replayed' : 'succeeded');
        return response;
      } catch (error) {
        const failure = error instanceof ProtocolError ? error : translate(error);
        if (
          lifecycle.state === 'executing' ||
          lifecycle.state === 'outputValidated' ||
          lifecycle.state === 'committing'
        )
          lifecycle.move('rollingBack');
        lifecycle.move(
          failure.outcome === 'unknown' && ['rollingBack', 'ready'].includes(lifecycle.state)
            ? 'unknown'
            : 'rejected',
        );
        return {
          ok: false,
          requestId,
          dataEpoch: store.epoch(),
          error: {
            code: failure.code,
            message: failure.message,
            outcome: failure.outcome,
            retryable: failure.retryable,
            fieldErrors: failure.fieldErrors,
          },
        };
      }
    },
  };
}
