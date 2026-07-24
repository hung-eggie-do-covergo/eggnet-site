---
title: Storage & backups
description: Snapshots, a real backup, and an offsite copy — and why RAID is none of those.
---

This is the guide people skip until the day they desperately need it. Do it early.

## RAID is not a backup

Say it again: **RAID is not a backup.** A mirror keeps you running when a *disk* dies — that's all. It does nothing against the things that actually lose data:

- an accidental delete or overwrite,
- a bad update corrupting an app's database,
- ransomware,
- a fat-fingered `zpool destroy`,
- the PSU frying every drive at once,
- theft or fire.

Most data loss is **not** disk failure. So redundancy is the *last* layer, not the first.

## The three real layers

Build them in this order. If you only do one, do the backup.

### 1. Snapshots — free, local, instant

ZFS snapshots are near-free and instantaneous. They're your undo button for "I deleted the wrong thing" and "that update broke it." Automate them:

```bash
# hourly/daily/weekly with automatic pruning (via sanoid, or zfs-auto-snapshot)
# keep: 24 hourly, 7 daily, 4 weekly
```

Snapshots live on the same pool, so they do **not** protect against pool loss — that's the next layer.

### 2. A backup on separate media

Back up to a **different drive** — the copy has to survive the primary dying. A cheap external USB drive is genuinely enough:

- Format it plainly (ext4/XFS) — **don't** run ZFS-over-USB (resets → corruption).
- Point [Proxmox Backup Server] (dedup + incremental) or `vzdump` at it.
- Automate it, and **keep it plugged in.** "I'll plug it in occasionally" is how backups go stale — the failure mode is human, not hardware.

Back up the **critical set** — configs, databases, photos, documents, the identity provider, secrets — and **skip replaceable bulk** (a re-downloadable media library). That keeps the backup small and fast.

### 3. An offsite copy

Fire and theft take your primary *and* your local backup at once. Beat that with an offsite copy:

- The cheapest version: a **second USB drive you rotate** to a family member's house on visits.
- The automated version: replicate (`zfs send` / PBS) to a **small box offsite** over a VPN, nightly. Offsite backup is the *perfect* job for a slow, remote link — it's sequential and runs overnight.

:::tip[Seed offsite backups locally]
The first full backup over a home upload link can take days. Do it locally, then physically move the drive/box offsite and run only incrementals after.
:::

## "Can the old drive be my offsite copy after I upgrade?"

Sometimes. If you upgraded the backup drive for **headroom** (the old one still fits the data), yes — it makes a great offsite copy. If you upgraded because the data genuinely **outgrew** it, the old drive can only hold a frozen point-in-time copy. But note: an **offsite copy can run thinner retention** (just the latest, not full history), so it's often much smaller than your primary backup — and the old drive frequently still fits it. Plan for two drives on staggered upgrade cycles.

## When RAID *is* worth it

After the three layers exist, a **mirror** earns its place for two things: **uptime** (survive a disk death without a restore) and **bit-rot protection** (ZFS self-heals silent corruption with a redundant copy). Both are real — just not substitutes for backups. See [Hardware](/guides/hardware/).

## Do the one thing everyone forgets

**Test a restore.** An untested backup is a hope, not a backup. Restore something, confirm it works, then trust it.

Next: [knowing it broke before someone tells you →](/guides/monitoring/)

[Proxmox Backup Server]: https://www.proxmox.com/en/proxmox-backup-server
