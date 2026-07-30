# Audit, notifications, and Telegram

[English](AUDIT_NOTIFICATIONS.md) · [Português (Brasil)](AUDIT_NOTIFICATIONS.pt-BR.md)

The root-only **Audit and alerts** page provides a global administrative log,
an in-panel notification inbox, and optional Telegram delivery.

Recorded events include authenticated mutations, login successes and failures,
server operations, scheduler actions, affected resources, result, source IP,
and request duration. Request bodies, passwords, tokens, and environment
variables are never copied into the audit metadata.

## Telegram setup

1. Create a bot with **@BotFather** and copy its token.
2. Message the bot, or add it to a group and send a message there.
3. Obtain the destination chat ID through the bot `getUpdates` API or another
   trusted method. Group IDs commonly start with `-100`.
4. Open **Audit and alerts → Settings**.
5. Enter the token and chat ID, save, and use **Send test**.
6. Enable Telegram and select its minimum severity.

The panel inbox and Telegram use independent severity thresholds. Defaults are
**warning** for the panel and **error** for Telegram.

Bot credentials are encrypted at rest with AES-256-GCM using a key derived from
the instance `JWT_SECRET`. The API never returns stored credentials. Preserve
the instance secret together with database backups.

This first release keeps audit history without automatic expiration. Delivery
failures are recorded on the related notification and never block the original
operation.
