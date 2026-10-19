import { ProtocolError } from './data.ts';

export const transitions = Object.freeze({
  created: ['validating'],
  validating: ['ready', 'rejected'],
  ready: ['executing', 'replayed', 'rejected', 'unknown'],
  executing: ['outputValidated', 'rollingBack', 'rejected'],
  outputValidated: ['committing', 'succeeded', 'rollingBack'],
  committing: ['succeeded', 'rollingBack', 'unknown'],
  rollingBack: ['rejected', 'unknown'],
  replayed: [],
  succeeded: [],
  rejected: [],
  unknown: [],
} satisfies Record<string, readonly string[]>);
export type CallState = keyof typeof transitions;
export interface CallTransition {
  from: CallState;
  to: CallState;
  requestId: string | null;
}
export function callLifecycle(observe: (event: CallTransition) => void = () => {}) {
  let current: CallState = 'created',
    requestId: string | null = null;
  return {
    get state() {
      return current;
    },
    identify(id: string) {
      requestId = id;
    },
    move(next: CallState) {
      if (!(transitions[current] as readonly string[]).includes(next))
        throw new ProtocolError('INVALID_CALL_STATE', `非法调用状态转换 ${current} → ${next}`);
      const event = { from: current, to: next, requestId };
      current = next;
      // Telemetry must never change transaction or business outcomes.
      try {
        observe(event);
      } catch {}
    },
  };
}

export type StudyState = 'answer' | 'reveal' | 'result' | 'finished';
export type StudyEvent = 'reveal' | 'commit' | 'next' | 'finish' | 'restart';
/** Guarded by the backend. A failed request is not a study event. */
export function studyTransition(state: StudyState, event: StudyEvent): StudyState {
  if (state === 'answer' && event === 'reveal') return 'reveal';
  if (state === 'reveal' && event === 'commit') return 'result';
  if (state === 'result' && event === 'next') return 'answer';
  if (state === 'result' && event === 'finish') return 'finished';
  if (state === 'reveal' && event === 'restart') return 'answer';
  throw new ProtocolError('INVALID_STUDY_STATE', '当前学习阶段不允许此操作');
}
