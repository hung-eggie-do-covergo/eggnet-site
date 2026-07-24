---
title: Single sign-on with OIDC
description: One self-hosted identity provider in front of every app, with group-based access.
---

Per-app passwords don't scale past about three apps. The fix is a self-hosted **identity provider (IdP)** speaking **OpenID Connect (OIDC)**: log in once, and every app trusts that login. Add or remove a person in one place; groups decide who sees what.

This lab uses [Pocket ID] (small, passkey-first, OIDC-only). [Authentik] and [Keycloak] are heavier alternatives with more features.

## How it fits together

```
you → app → "log in with <IdP>" → IdP (one login) → back to app, authenticated
```

Each app is registered as an **OIDC client** in the IdP with:

- a **client ID + secret** (the app proves who it is),
- one or more **callback/redirect URLs** (where the IdP returns the user),
- optional **allowed groups** (who may use it).

## Two integration styles

**1. App has native OIDC.** Best case — configure the client directly in the app:

```bash
# typical env for an app with built-in OIDC
OIDC_ISSUER_URL=https://id.example.com
OIDC_CLIENT_ID=<client-id>
OIDC_CLIENT_SECRET=<from your secrets manager>
OIDC_REDIRECT_URI=https://app.example.com/oauth/callback
```

**2. App has no auth (or weak auth).** Put a **forward-auth gateway** (e.g. [tinyauth], oauth2-proxy) in front of it at the reverse proxy — the proxy checks with the gateway before passing the request through. One integration protects any number of dumb apps.

## Groups, not accounts

Model access with **groups**, not per-user grants. Create groups like `family`, `admins`, `media`; put people in them; restrict each app's client to the groups that should reach it. Onboarding someone becomes "add to these groups," and their app launcher fills in automatically.

Some platforms (like Proxmox itself) can **map an IdP group to an internal role** — so membership in an `infra-admins` group grants admin without a separate local password.

## Gotchas worth knowing up front

:::caution
- **Callback URLs must match exactly.** A trailing-slash or `http`-vs-`https` mismatch is the #1 cause of "login worked but redirect failed." Copy the *exact* redirect URL the app documents.
- **Split-horizon + server-side OIDC.** If your IdP's hostname resolves to a private IP (it does, via [split-horizon DNS](/guides/networking/)), some apps' anti-SSRF guards refuse to fetch the OIDC discovery document. Look for an "allow local/private issuer" flag.
- **SSO into the host shell is special.** Hypervisor web-shells often only auto-login the built-in local admin; an IdP user gets a plain login prompt needing a *local* account. Create a matching local user if you want that convenience.
- **SSO is sometimes a paid tier.** Some apps gate OIDC/SAML behind an enterprise license. Check before you plan around it.
:::

## Keep the IdP isolated

The identity provider is a **crown-jewel** and part of the **recovery plane** — give it its own container, and *don't* make it depend on the very things it authenticates (don't source its own secrets from a secrets manager that requires login, etc.). If the IdP is down, you still want a way in. See [where things run](/guides/services/).

Next: [getting secrets out of your config files →](/guides/secrets/)

[Pocket ID]: https://pocket-id.org/
[Authentik]: https://goauthentik.io/
[Keycloak]: https://www.keycloak.org/
[tinyauth]: https://tinyauth.app/
