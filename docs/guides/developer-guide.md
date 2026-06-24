<div align="center">
  <h1>AegisMesh</h1>
	<p>Patterns I implemented while building a multi-tenant IAM platform. Node/Express/Prisma, but the concepts apply anywhere.
</p>
</div>

---

## DENY always overrides ALLOW

When a user has permissions from multiple sources (direct role, group membership, attached policy), conflicts happen. The naive approach merges everything and takes the most permissive result. That's wrong for IAM.

Evaluate DENY policies first. If any match, return immediately — ALLOW never gets to run.

```js
for (const policy of denyPolicies) {
  if (matchesPolicy(policy)) {
    return { allowed: false, reason: `Denied by policy: ${policy.name}` };
  }
}

// Only reaches here if no DENY matched
for (const policy of allowPolicies) {
  if (matchesPolicy(policy)) matchedAllowPolicies.push(policy);
}
```

Watch out for: policy sources you haven't accounted for yet (org-level overrides, inherited group policies). Add them to the same evaluation chain, not a separate check downstream.


## Step-up auth for sensitive operations

Being logged in isn't strong enough assurance for password changes, account deletion, or privileged token creation. A stolen long-lived session can do real damage if there's no additional gate.

Issue a short-lived reauth token (10 min window) after the user re-proves identity. Validate it in middleware before any sensitive route — tied to both user ID and session ID so it can't be replayed across sessions.

```js
if (payload?.sub === req.user.id && payload?.sessionId === req.user.sessionId) {
  req.reauthed = true;
  return next();
}
return res.status(403).json(buildReauthError(action, Boolean(req.user.mfaEnabled)));
```

Applied at the route level:

```js
router.delete('/:id',
  authorize('users:delete', 'users/*'),
  requireReauth(SENSITIVE_ACTIONS.DELETE_ACCOUNT),
  deleteUser
);
```

Watch out for: the reauth token needs to be separate from the access token. Don't reuse JWTs for this — the window and binding requirements are different.


## Per-session revocation

Full logout kills all sessions. That's too blunt for incident response — if one device is compromised, you want to kill that session without disrupting everything else.

Expose two controls: revoke a single session by ID, and revoke all sessions except the current one. Both need ownership checks so users can only touch their own sessions.

```js
// Revoke all other sessions, keep current
async function revokeAllOtherSessions(userId, currentSessionId) {
  const where = currentSessionId
    ? { userId, id: { not: currentSessionId } }
    : { userId };
  return prisma.session.deleteMany({ where });
}
```

Watch out for: make sure revoked sessions are checked on every authenticated request, not just at login. If you only validate the JWT signature and expiry, a revoked session token still works until it expires.


## Audit logging as a first-class concern

IAM without an audit trail is hard to trust and harder to debug. If you can't answer "who changed this permission and when," you can't do incident response.

Centralize audit writes into a single utility so every caller gets consistent structure — user ID, session ID, action, resource, result, IP, user agent. Wrap permission checks so both grants and denials are logged automatically, not left to individual route handlers.

```js
// Every permission check logs, not just failures
const result = await permissionService.checkPermission(req.user.id, action, resource);
await auditPermission.checked(req, req.user.id, action, resource, result);

if (!result.allowed) {
  await auditPermission.denied(req, req.user.id, action, resource, result);
}
```

Watch out for: logging at the route level instead of the middleware level means some checks will get missed. Put it in the middleware once and it's everywhere.
