# Domain registry

This directory is the source of truth for domain records. The initial registry is intentionally empty and has no parent domain configured.

## Current state

- `parent_domain`: `null`
- `dns_provider`: `null`
- `issuance_enabled`: `false`

Do not enable issuance until the project has documented authorization to manage DNS for a real parent domain and has configured provider credentials as GitHub Actions secrets.

## Record policy

A future active record should include a normalized label, destination, requester identity, creation timestamp, and verification status. Never treat a user-submitted GitHub issue as proof of ownership. Verify destination control before publishing DNS.

## Security

DNS write credentials must only be available to a protected workflow running on trusted code. Do not expose secrets to pull-request workflows or forked code. Validate every destination and restrict allowed record types and targets.