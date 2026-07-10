---
id: security-review
name: "Security Review"
format_version: 1
phase: implement
roles: [developer, qa, architect]
trigger: manual
priority: 4
context_profile: null
tags: [engineering, security]
builtin: false
---

# Security Review

## Summary

A practical security checklist for changes that touch authentication, user
input, secrets, external integrations, or sensitive data. Stack-agnostic —
maps to the OWASP Top 10 without being tied to any framework.

## When to Use

- Implementing authentication or authorization
- Handling user input, file uploads, or untrusted data
- Adding or changing API endpoints
- Working with secrets, credentials, or tokens
- Storing or transmitting sensitive/personal data
- Integrating a third-party API or service

## Checklist

### Secrets management

- [ ] No hardcoded keys, tokens, or passwords in source
- [ ] Secrets read from environment/secret store; verified present at startup
- [ ] Secret files (e.g. `.env`) are git-ignored and absent from history

### Input validation

- [ ] All external input validated against an explicit schema (allow-list)
- [ ] Uploads restricted by size, type, and extension
- [ ] User input never interpolated directly into queries or commands
- [ ] Error messages do not leak internal details or sensitive data

### Injection prevention

- [ ] Database access uses parameterized queries / an ORM — no string-built SQL
- [ ] Shell/OS calls avoid unsanitized input; prefer argument arrays over shells
- [ ] Template/HTML output is escaped or sanitized

### AuthN / AuthZ

- [ ] Authorization is checked **before** every sensitive operation
- [ ] Session tokens stored securely (HTTP-only, secure, same-site cookies; not
      in client-readable storage)
- [ ] Least-privilege access; role/ownership checks enforced server-side

### Transport & headers

- [ ] HTTPS enforced in production
- [ ] Security headers set (CSP without `unsafe-inline`/`unsafe-eval` where
      possible, no-sniff, frame protections)
- [ ] CORS configured to an explicit allow-list, not `*` for credentialed calls

### Rate limiting & abuse

- [ ] Rate limiting on public and expensive endpoints
- [ ] CSRF protection on state-changing requests

### Data exposure & logging

- [ ] No secrets, tokens, or full PII in logs
- [ ] User-facing errors are generic; full context only in server logs
- [ ] No stack traces returned to clients

### Dependencies

- [ ] Dependency audit is clean (no known high/critical vulnerabilities)
- [ ] Lock files committed; reproducible installs in CI

## Review Discipline

- Report a finding only when confident it is real and exploitable; state the
  concrete scenario that breaks and where (file + location).
- Prefer fixing the class of issue (validate all input) over patching one
  instance.
- When in doubt, fail closed — deny by default, allow explicitly.

---

<!-- Adapted from Everything Claude Code (ECC, skills/security-review +
     the-security-guide) by Affaan Mustafa. MIT License. Rewritten for L1DDER:
     neutral, cross-stack, no framework specifics. -->
