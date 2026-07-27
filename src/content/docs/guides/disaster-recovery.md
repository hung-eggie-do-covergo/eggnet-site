---
title: Disaster recovery that actually works
description: Rebuild the setup from git, restore the secrets from an encrypted bundle, monitor it, and prove it restores — before you need it.
---

Most homelab "backups" are a folder someone copied once and never restored. This is the opposite: a
recovery plan split into three parts, automated, monitored, and **test-restored**. It's what turns
"I think I'm backed up" into "I pulled it from the cloud last night and it decrypted clean."

## The split that makes it tractable

The mistake is treating everything as one backup. Three different things, three different homes:

- **Config is code** — topology, reverse-proxy rules, compose files. Declarative, non-secret. → **git**.
- **Data is backups** — photos, media, databases. Bulk, can't be "declared." → **backup drives / cloud**.
- **Secrets are neither** — `.env` files, keys, tokens, the password vault. Small, sensitive. → **encrypted bundle, off-box**.

Keep them separate. Config in git rebuilds the *shape*; the secrets bundle is the *restore key*; the data
backup is the *bulk*. Mixing them is how secrets end up in a git history and how a 200 GB "backup" never
gets made because it's too big to automate.

## 1. Config as code

A private git repo of the **non-secret** configs: your VM/container definitions, the reverse-proxy config,
the compose files. Two rules:

- **Env values are references, not literals** — `PASSWORD=${DB_PASSWORD}`, never the real string. The
  values live in the secrets bundle and get injected at runtime.
- **A `.gitignore` that blocks `*.env`, `*.db`, `*token*`** — belt and suspenders, plus a scan for
  secret-shaped strings before the first commit.

This repo is the **map**. It reconstructs what runs where — not the data, not the credentials.

## 2. Secrets: encrypted, off-box, automated

Bundle every secret-bearing file plus database dumps into **one archive, encrypted before it leaves the
box**, and push it to cloud storage on a schedule.

```bash
# nightly, roughly:
tar czf - <secret files, db dumps> | gpg -c --passphrase-file /root/.key > bundle-$(date +%F).tar.gz.gpg
rclone copy bundle-*.tar.gz.gpg remote:backups/   # object storage / Drive
# then rotate: keep a few, drop the old
```

- **Encrypt first.** Never upload plaintext secrets — cloud is someone else's computer.
- **Include the keys that decrypt your dumps.** If your secrets manager encrypts its database at rest,
  its `encryption_key` must be in the bundle too — otherwise the database dump is undecryptable ballast.
- **Object storage over consumer sync.** Backends like S3/B2/Drive have real, unattended CLIs. iCloud and
  friends have no reliable headless API — wrong tool for a cron.

## 3. The bootstrap problem: where's the key?

The passphrase that decrypts the bundle **cannot live in the password manager that's inside the bundle.**
That's circular — you'd need the backup to open the backup.

Store it **out-of-band**:

- a **second, independent** manager (your OS keychain — different trust domain than your self-hosted vault),
- **plus a paper copy** with your important documents.

Two copies, at least one offline, neither dependent on the lab. It's one short string that rarely changes —
paper is genuinely fine.

## 4. Monitor it — silent failure is the default

A cron job that fails quietly leaves you *believing* you're covered. Have the job **ping a monitor on
success**; if the ping doesn't arrive in the expected window, the monitor alerts (a "dead-man's switch").

:::caution[A monitor on the same box can't report the box's death]
Self-hosted monitoring catches *script* failures but goes down *with* the host — so it can't tell you the
one thing you most need to hear: "the machine is gone." For backup monitoring specifically, an **external**
dead-man's-switch covers that blind spot. Pick self-hosted only if you accept it.
:::

And a monitor only helps if a **notification is attached** to it. A red dashboard nobody gets paged about is
decoration.

## 5. Prove it — a backup you haven't restored is a hypothesis

This is the step everyone skips and it's the one that matters. **Do a restore drill:**

1. Pull the bundle **from the cloud copy** — not the local one. This proves the off-box copy is retrievable.
2. **Decrypt it** with the stored passphrase — proves the key works.
3. **Check database integrity** on the restored files (`PRAGMA integrity_check`, `pg_restore --list`).
4. Ideally, stand one service back up from it end to end.

Version skew, a half-written database copied mid-flush, a path that silently didn't get included — every one
of these hides until the day you restore for real. Find them on a Tuesday, not during a fire.

## What this does *not* cover

Config + secrets restore the **setup**. They do not restore the **bulk data** — your photos and media are a
separate backup on their own media. Restoring the database gets you the app's *knowledge* of your photos
(albums, dates, faces); the actual image files come from the data backup. Don't confuse "the database
restored" with "my photos are safe."

## The whole thing in one line

**Config as code, data as backups, secrets encrypted off-box, the key out-of-band — and restore-tested
before you trust it.** Everything else is detail.
