// Original six definitions retained exclusively in the isolated test contract.
import {z} from 'zod';
import * as d from '../../shared/protocol/data.ts';
import * as append from '../../shared/protocol/external-append.ts';
import {ExternalScanSummary,ExternalDeckPage} from '../../shared/protocol/external-scan.ts';
import {registry as publicRegistry} from '../../shared/protocol/registry.ts';
export {Envelope,RequestSchema,type Response} from '../../shared/protocol/registry.ts';
const define=<I extends z.ZodType,O extends z.ZodType>(module:string,effect:string,input:I,output:O)=>({module,effect,input,output});
export const registry={...publicRegistry,
  "storage.append.open": define("maintenance","query",d.Empty,ExternalScanSummary.nullable()),
  "storage.append.decks": define("maintenance","query",z.strictObject({scanId:z.uuid(),limit:z.number().int().min(1).max(100),cursor:z.string().nullable()}),ExternalDeckPage),
  "storage.append.preview": define("maintenance","query",append.AppendSelection,append.AppendPlan),
  "storage.append.cancel": define("maintenance","query",z.strictObject({scanId:z.uuid()}),z.literal(true)),
  "storage.append.confirm": define("maintenance","maintenance",append.AppendConfirmation,append.AppendResult),
  "storage.append.status": define("maintenance","query",z.strictObject({operationId:z.uuid()}),append.AppendStatus.nullable()),
};
export type Method=keyof typeof registry;
export type Input<M extends Method>=z.input<(typeof registry)[M]['input']>;
export type Output<M extends Method>=z.output<(typeof registry)[M]['output']>;
export interface Request<M extends Method>{protocol:typeof d.PROTOCOL;requestId:string;dataEpoch:string|null;method:M;payload:Input<M>;}
