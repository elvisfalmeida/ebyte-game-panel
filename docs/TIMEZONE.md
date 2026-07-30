# Time zones

[English](TIMEZONE.md) · [Português (Brasil)](TIMEZONE.pt-BR.md)

The timestamps rendered by the server console can be pinned to an IANA time
zone at frontend build time:

```env
VITE_LOG_TIME_ZONE=America/Sao_Paulo
```

When the variable is empty, the browser time zone is used. Invalid values also
fall back safely to the browser time zone.

Game-generated timestamps depend on the server container. Images that include
the IANA database, such as the Palworld image, accept a standard `TZ` server
environment variable:

```env
TZ=America/Sao_Paulo
```

Changing a server environment variable recreates its container and restarts a
running server. Persistent game data remains in its mounted volume.
