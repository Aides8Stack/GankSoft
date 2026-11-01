import { PROTOCOL, assertWireValue, ProtocolError } from './data.ts';
import {
  Envelope,
  registry,
  type Input,
  type Method,
  type Output,
  type Request,
} from './registry.ts';

export type DataStamp = Readonly<{dataEpoch:string;dataRevision:number}>;
export type ReplyMeta = DataStamp & {method:Method;requestId:string;payload:unknown};
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
  let revision = -1, generation = 0;
  const metadata = new WeakMap<object,ReplyMeta>();
  const listeners = new Set<(meta:ReplyMeta)=>void>();
  function accept<M extends Method>(request:Request<M>,raw:unknown,started=generation):Output<M> {
    assertWireValue(raw);
    const res=Envelope.parse(raw);
    if(res.requestId!==request.requestId)throw new ProtocolError('RESPONSE_INVALID','返回请求编号不合法','unknown');
    if(!res.ok){if(res.error.code==='DATA_EPOCH_CHANGED'){epoch=null;revision=-1;generation++;}throw new ProtocolError(res.error.code,res.error.message,res.error.outcome,res.error.retryable,res.error.fieldErrors);}
    if(started!==generation&&res.dataEpoch!==epoch)throw new ProtocolError('DATA_EPOCH_CHANGED','旧数据库请求已失效','unknown');
    const replaces=['app.capabilities','maintenance.restore','storage.restore.confirm','storage.merge.confirm','storage.relocate.confirm'].includes(request.method);
    if(!replaces&&res.dataEpoch!==request.dataEpoch)throw new ProtocolError('DATA_EPOCH_CHANGED','返回数据代次不匹配','unknown');
    const output=registry[request.method].output.parse(res.data) as Output<M>;
    if(epoch!==res.dataEpoch){epoch=res.dataEpoch;revision=-1;generation++;}
    revision=Math.max(revision,res.dataRevision);
    const meta:ReplyMeta={dataEpoch:res.dataEpoch,dataRevision:res.dataRevision,method:request.method,requestId:request.requestId,payload:request.payload};
    if(output!==null&&typeof output==='object')metadata.set(output,meta);
    for(const listener of listeners)listener(meta);
    if(registry[request.method].effect==='query'&&res.dataRevision<revision)
      throw new ProtocolError('DATA_REVISION_CHANGED','数据已更新，请重新读取');
    return output;
  }
  async function send<M extends Method>(request: Request<M>): Promise<Output<M>> {
    const started=generation;
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
      return accept(request,raw,started);
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
    snapshot:():DataStamp|null=>epoch===null?null:{dataEpoch:epoch,dataRevision:revision},
    metadata:(value:object)=>metadata.get(value),
    subscribe(listener:(meta:ReplyMeta)=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},
    // Validate an operation.status receipt through exactly the same codec/metadata path.
    acceptReceipt:accept,
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
