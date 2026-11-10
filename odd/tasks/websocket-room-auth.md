# WebSocket room access enforcement
Objective: enforce production JWT authentication and room membership before accepting game WebSocket upgrades.
Branch: current user-owned branch; delivery remains local until deployment is separately authorized and checks pass. Runner: Jest + npm builds.

## Specs

### S1 — Strict production JWT verification
Authorized user direction: “valid JWT and host/registered participant only; demo tokens must not work for deployment.”
- Remove demo-token identity shortcuts from the production verifier.
- Require a valid RS256 signature, unexpired numeric `exp`, expected issuer and exact audience; reject future `nbf`.
- Checks: focused verifier spec; Activities full suite and build.

### S2 — WebSocket authorization before upgrade
Authorized user direction: “only room host or registered participant can connect”.
- Before `handleUpgrade`, require valid JWT, a non-empty room code, and identity matching host or persisted participant.
- Reject unauthorized or unresolvable rooms before the WebSocket handshake; fail closed on verifier/database errors.
- Checks: focused session/WebSocket tests; Activities full suite and build.

### S3 — Frontend credential propagation
- Forward the authenticated user's token when subscribing to a room channel so legitimate clients continue to connect.
- Checks: frontend test suite, typecheck, build; Activities endpoint integration where available.

## Tasks
- T1 (S1) inline, complete; RED observed; focused verifier spec passes; commit: 1996272.
- T2 (S2) inline, complete; RED observed; session and real WebSocket handshake tests pass, including state-hash invariance; commit: 1996272.
- T3 (S3) inline, complete; Frontend test/typecheck/build pass; token sent via subprotocol rather than URL query; commit: 1996272.

## Log
- L1: User authorized implementing valid JWT verification and rejecting unauthorized sockets before external exposure; confirmed policy is host/registered participant only and demo tokens must not work in deployment.
- L2: Existing verifier source contains demo shortcuts and omits mandatory issuer/expiration checks. WebSocket handler upgrades before auth and accepts missing identities. Frontend has a token in `useSala` but does not pass it to `ClienteSala.suscribir`.
- L3: New verifier regression tests initially observed RED. A test-fixture construction issue caused two missing-claim cases to inherit valid base claims; corrected to construct each invalid payload independently. Focused suite now passes against the already-present strict verifier edits.
- L4: Do not publish images or expose the application until all security and functional checks pass. Supabase remains the database.
- L5: WebSocket access is authorized before the HTTP upgrade: 401 for absent/invalid JWT, 403 for valid non-member or missing room, and 101 for host/registered participant. Browser credentials are carried in `Sec-WebSocket-Protocol`, not URL query parameters.
- L6: Post-normalization checks: Activities 12 suites/78 tests and build pass; Frontend 9 tests, typecheck and build pass. Independent verifier passed all S1-S3 and confirmed no mutation on rejected handshakes. No external database or deployment used.
- L7: Work-unit commit 1996272 contains T1-T3. Native RDD assessment is high-risk; preflight could not proceed because the runtime requested a provider-bound intended-untracked selection JSON schema that the CLI failure did not document. No START transaction or review authority was created; preserve as a pending review blocker.
