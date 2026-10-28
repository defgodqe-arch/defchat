# Domain registry

This directory is the source of truth for defchat's free subdomain service.

## Selected suffix

- Public hostname format: `name.de5.net`
- Provider: DNSHE
- Provider information: https://github.com/dnshe/DNSHE-FreeDomains
- API documentation: https://github.com/dnshe/DNSHE-FreeDomains/blob/main/docs/api.md
- `issuance_enabled`: `false` until the maintainer configures and tests credentials

This is a free subdomain suffix that ends in `.net`; it is **not** a standalone `.net` domain. The repository maintainer must confirm that the DNSHE account can register names under `de5.net` and review the provider's current rules, quotas, and availability.

## Turn on protected registration

1. Create/sign in to a DNSHE account at https://my.dnshe.com.
2. In the DNSHE console, create an API key and secret with the least privileges available. Never put these credentials in frontend files or commit them.
3. In GitHub, open **Settings → Secrets and variables → Actions** for this repository and add:
   - `DNSHE_API_KEY`
   - `DNSHE_API_SECRET`
4. Test the workflow using a harmless request and verify the API response and quota.
5. Requests arrive as GitHub issues. Review the requested label and purpose, then apply the `domain-approved` label to authorize registration. Do not enable unattended approval for public submissions.

The workflow registers the hostname under DNSHE's `de5.net` suffix after approval. A registered hostname is not automatically pointed at the optional website destination in the issue; DNS records and HTTPS behavior must be configured and verified separately.

## Record policy

Never treat a user-submitted GitHub issue as proof of destination ownership. Check provider availability and quotas, reject reserved names, and review requests for abuse before approval. Maintain an audit trail for successful registrations and failed attempts.

## Security

DNS write credentials are available only to the protected issue-label workflow, not pull-request workflows. Issue contents are untrusted input and must be validated. Do not log secrets. If credentials are exposed, revoke and rotate them immediately.
