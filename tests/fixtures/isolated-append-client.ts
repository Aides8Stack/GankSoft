// Retained protocol client for the internal S8.b contract only.
import { PROTOCOL, assertWireValue, ProtocolError } from '../../shared/protocol/data.ts';
import {
  Envelope,
  registry,
  type Input,
  type Method,
  type Output,
  type Request,
} from './isolated-append-registry.ts';

export type Transport = (request: unknown) => Promise<unknown>;
export class CallFailure extends ProtocolError {
  request: unknown;
  constructor(error: ProtocolError, request: unknown) {
    super(error.code, error.message, error.outcome, error.retryable, error.fieldErrors);
    this.request = request;
  }
}
export function createClient(
  transport: Transport,
  newId: () => string = () => crypto.randomUUID(),
) {
  let epoch: string | null = null;
  async function send<M extends Method>(request: Request<M>): Promise<Output<M>> {
    let raw: unknown;
    try {
      raw = await transport(request);
    } catch {
      throw new CallFailure(
        new ProtocolError(
          'TRANSPORT_UNKNOWN',
          '提交结果未知，请用原请求查询或重试',
          'unknown',
          true,
        ),
        request,
      );
    }
    try {
      assertWireValue(raw);
      const parsed = Envelope.safeParse(raw);
      if (!parsed.success || parsed.data.requestId !== request.requestId)
        throw new ProtocolError('RESPONSE_INVALID', '返回信封或请求编号不合法', 'unknown');
      const res = parsed.data;
      if (!res.ok) {
        if (res.error.code === 'DATA_EPOCH_CHANGED') epoch = null;
        throw new ProtocolError(
          res.error.code,
          res.error.message,
          res.error.outcome,
          res.error.retryable,
          res.error.fieldErrors,
        );
      }
      if (
        request.method !== 'app.capabilities' &&
        request.method !== 'maintenance.restore' &&
        request.method !== 'storage.restore.confirm' &&
        request.method !== 'storage.append.confirm' &&
        request.method !== 'storage.relocate.confirm' &&
        res.dataEpoch !== request.dataEpoch
      )
        throw new ProtocolError('DATA_EPOCH_CHANGED', '返回数据代次不匹配', 'unknown');
      const output = registry[request.method].output.safeParse(res.data);
      if (!output.success)
        throw new ProtocolError('RESPONSE_INVALID', '返回数据不符合方法协议', 'unknown');
      if (request.method === 'app.capabilities' || request.method === 'maintenance.restore' || request.method === 'storage.restore.confirm' || request.method === 'storage.append.confirm' || request.method === 'storage.relocate.confirm')
        epoch = res.dataEpoch;
      return output.data as Output<M>;
    } catch (error) {
      throw new CallFailure(
        error instanceof ProtocolError
          ? error
          : new ProtocolError('RESPONSE_INVALID', '返回数据不合法', 'unknown'),
        request,
      );
    }
  }
  return {
    prepare<M extends Method>(method: M, payload: Input<M>, requestId = newId()): Request<M> {
      if (method !== 'app.capabilities' && epoch === null)
        throw new ProtocolError('HANDSHAKE_REQUIRED', '请先读取应用能力');
      assertWireValue(payload);
      const data = registry[method].input.parse(payload) as Input<M>;
      return { protocol: PROTOCOL, requestId, dataEpoch: epoch, method, payload: data };
    },
    send,
    async call<M extends Method>(method: M, payload: Input<M>): Promise<Output<M>> {
      return send(this.prepare(method, payload));
    },
  };
}
