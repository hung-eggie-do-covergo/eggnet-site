---
title: 'Networking: proxy & split-horizon DNS'
description: Real HTTPS names for every service, resolved locally, private by default and public by exception.
---

Four pieces work together so every service gets a clean `https://app.example.com` address that's fast at home, reachable anywhere, and exposed to the internet only when you choose:

1. A **reverse proxy** terminates TLS and routes by hostname.
2. A **local DNS server** points those hostnames at the proxy (split-horizon).
3. A **mesh VPN** makes them reachable off-LAN, privately.
4. A **tunnel** publishes the few you want public — no port-forwarding.

## Reverse proxy

Run a proxy (this lab uses **Caddy** for its automatic TLS) that terminates HTTPS once and forwards to each backend by IP:port. One wildcard cert, one place for routing.

```caddyfile
# private — only reachable on LAN / VPN (no public tunnel)
app.example.com {
	reverse_proxy 10.0.0.20:8080
}

# public — also served over the tunnel (dual scheme)
public-app.example.com {
	reverse_proxy 10.0.0.21:3000 {
		header_up X-Forwarded-Proto https
	}
}
```

Get the wildcard cert via a **DNS-01 ACME challenge** (your DNS provider's API), so you never expose port 80/443 to get certificates. Backends are addressed by **IP**, so the proxy needs no internal name resolution.

## Split-horizon DNS

Here's the trick that makes it feel seamless: run a **local DNS server** (this lab uses **Technitium**; [Pi-hole]/[AdGuard] also work) and have `*.example.com` resolve to the **proxy's LAN IP** for anyone on your network. Same names, private path.

```
*.example.com  →  A  →  10.0.0.10   (the reverse proxy)
```

Now `app.example.com` resolves to the proxy locally and to whatever's public (or nothing) from the outside.

:::caution[The two split-horizon gotchas]
- **Don't make your local DNS *fully authoritative* for the domain** if you also use DNS-01 ACME. The proxy needs to see the real public `_acme-challenge` TXT records to get certs — a local authoritative zone hides them and cert issuance/renewal silently fails. Use a **conditional-forwarder zone with a wildcard A override**: answer `*.example.com` locally, **forward everything else** (including TXT) to public DNS. Or point just the proxy's resolver at public DNS.
- **Return `NODATA` for AAAA**, not a forwarded public IPv6 — otherwise dual-stack clients hairpin out to the public address instead of using the local A record.
:::

This also gets you **network-wide ad/tracker blocking** for free (block lists on the same resolver) and **per-device rules** (allow a smart TV's telemetry, block everything else).

## Private by default: mesh VPN

Put the box (and your devices) on a **mesh VPN** like [Tailscale]. Now every private service is reachable from your phone anywhere, with no ports open to the internet. Combined with split-horizon, `app.example.com` just works on the couch or on cellular.

Point the VPN's DNS at your local resolver so the split-horizon names resolve over the tunnel too.

## Public by exception: a tunnel

For the handful of services that must be public (a status page, something you share), use an **outbound tunnel** (e.g. Cloudflare Tunnel) instead of forwarding ports:

- The tunnel daemon dials *out* to the edge; no inbound ports, no home IP exposed.
- Map only the specific hostnames you want public to the proxy; everything else stays private.
- You get DDoS protection and a WAF in front for free.

## The mental model

```
             ┌──────────── public visitor
             │  (tunnel, selected hosts only)
   internet ─┤
             │  ┌───────── you, anywhere
             └──┤  (mesh VPN → everything, private)
                │
   LAN device ──┴─→ local DNS (*.example.com → proxy IP, + ad-block)
                        │
                        └─→ reverse proxy (TLS) ─→ backend:port
```

One domain, one proxy, one resolver. Names are identical whether you're on the couch, on cellular, or (for the chosen few) a stranger on the internet — the *path* differs, the address doesn't.

Next: [one login in front of all of it →](/guides/auth/)

[Pi-hole]: https://pi-hole.net/
[AdGuard]: https://adguard.com/
[Tailscale]: https://tailscale.com/
