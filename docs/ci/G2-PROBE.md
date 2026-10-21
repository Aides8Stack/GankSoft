# G2 harmless normal-path platform probe

DO NOT MERGE. Documentation-only probe created with owner authorization.
Base: c8db715d33265bdf8e2edd05f0f14a35b97de8ac. Audited PR #4 remains b5a6d5a8cdc670afe19732fd2b80933801f93572.
This branch executes no added code, reads no Secrets, and changes no workflow.
Expected: automatic pr-trust success. Missing pr-gate before v4 deployment is a deployment-order dependency, never an authorization substitute.
After the initial exact-SHA success is recorded in a later session, append a harmless control-path file to this PR to verify that the old success does not authorize its new SHA. Never manually authorize the control probe. Do not merge this PR.
