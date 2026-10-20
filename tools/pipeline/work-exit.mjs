// Remote CI/build/publication statuses are deliberately not dependencies of Work exit.
export function canExitWork(state) {
 return state.implementationComplete===true && state.localRequiredTestsPass===true && state.remoteCheckpointVerified===true && state.handoffSavedAndVerified===true;
}
