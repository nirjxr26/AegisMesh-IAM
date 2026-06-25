# AegisMesh Developer Guide

Core development patterns implemented inside the AegisMesh platform.

---

## 1. PBAC Evaluation (DENY Wins)
When checking permissions, we evaluate explicit DENY statement statements first. If any matches, the request is rejected immediately.
```js
// Evaluate DENY policies first
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

---

## 2. Step-Up Authentication
Highly sensitive actions (such as API key creation, password changes, account deletions) require a 10-minute short-lived reauthentication token.
```js
// Verification in authenticate middleware
if (payload?.sub === req.user.id && payload?.sessionId === req.user.sessionId) {
  req.reauthed = true;
  return next();
}
return res.status(403).json(buildReauthError(action, Boolean(req.user.mfaEnabled)));
```

Applied directly at the routes:
```js
router.delete('/:id',
  authorize('users:delete', 'users/*'),
  requireReauth(SENSITIVE_ACTIONS.DELETE_ACCOUNT),
  deleteUser
);
```

---

## 3. Session Revocation
We trace active sessions in Redis/PostgreSQL. Full logout terminates all active sessions. Individual session IDs can be revoked cleanly:
```js
// Revoke all other sessions, keep current active device
async function revokeAllOtherSessions(userId, currentSessionId) {
  const where = currentSessionId
    ? { userId, id: { not: currentSessionId } }
    : { userId };
  return prisma.session.deleteMany({ where });
}
```
> [!IMPORTANT]
> Session validity is verified on every request. Relying solely on stateless JWT signature verification is a security vulnerability.

---

## 4. Audit Trail
All permission checks, token generations, and admin changes must be logged programmatically via our auditing utility:
```js
const result = await permissionService.checkPermission(req.user.id, action, resource);
await auditPermission.checked(req, req.user.id, action, resource, result);

if (!result.allowed) {
  await auditPermission.denied(req, req.user.id, action, resource, result);
}
```
