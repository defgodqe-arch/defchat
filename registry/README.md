# Domain registry

This directory is the source of truth for domain records.

## Current state

- `parent_domain`: `defchat.net` (proposed; ownership/control not verified here)
- `dns_provider`: `null`
- `issuance_enabled`: `false`

Naming a parent domain in this registry does not prove ownership or grant DNS authority. Do not enable issuance until the project owner has verified control of `defchat.net`, connected an authorized DNS provider, and stored provider credentials as GitHub Actions secrets.

## Record policy

A future active record should include a normalized label, destination, requester identity, creation timestamp, and verification status. Never treat a user-submitted GitHub issue as proof of ownership. Verify destination control before publishing DNS.

## Security

DNS write credentials must only be available to a protected workflow running on trusted code. Do not expose secrets to pull-request workflows or forked code. Validate every destination and restrict allowed record types and targets.
