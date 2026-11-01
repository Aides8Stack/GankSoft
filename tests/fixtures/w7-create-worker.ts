import {parentPort,workerData} from 'node:worker_threads';
import {DatabaseSync} from 'node:sqlite';
import {openReviewSession} from '../../electron/modules/cards-unified/review-session.ts';
import {OpenReviewSession} from '../../shared/protocol/unified-review.ts';
const db=new DatabaseSync(workerData.path);
db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000');
const gate=new Int32Array(workerData.gate);parentPort!.postMessage({ready:true});
for(;;){const state=Atomics.load(gate,0);if(state===3)break;if(Atomics.wait(gate,0,state,10000)==='timed-out')throw Error('worker start timeout');}
try{const s=openReviewSession({db,dataDir:'',now:()=>new Date(workerData.clock)},OpenReviewSession.parse({deckId:workerData.deckId,mode:'scheduled'}));parentPort!.postMessage({sessionId:s.sessionId});}finally{db.close();}
