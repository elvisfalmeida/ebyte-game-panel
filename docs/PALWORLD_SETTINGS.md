# 🌎 Extended Palworld settings

[English](PALWORLD_SETTINGS.md) · [Português (Brasil)](PALWORLD_SETTINGS.pt-BR.md)

Ebyte Game Panel expands the Palworld settings screen from a small curated form to a
searchable interface generated from the game version installed on each server.
It currently exposes 115 settings from Palworld's
`DefaultPalWorldSettings.ini`.

## How it works

The backend reads the defaults shipped with the installed Palworld server and
combines them with the active values in:

```text
/server/Pal/Saved/Config/LinuxServer/PalWorldSettings.ini
```

Field types are inferred automatically:

| Palworld value | GUI control |
|---|---|
| `True` or `False` | Toggle |
| Whole number | Integer input |
| Decimal number | Decimal input |
| Quoted value | Text input |
| Enum or tuple such as `(Steam,Xbox,PS5,Mac)` | Raw text input |

Existing curated fields retain their friendly labels, descriptions, ranges,
and select options. Other values show a readable label derived from the
Palworld key, with the exact key available in the help text.

The screen includes search by label, key, or description and shows the number
of matching settings.

## Protected settings

The following container-managed values are intentionally not editable from the
world settings GUI:

| Key | Reason |
|---|---|
| `AdminPassword` | Managed through the panel's container configuration |
| `PublicPort` | Must match the Docker UDP port mapping |
| `RESTAPIEnabled` | Required for panel console and backup operations |
| `RESTAPIPort` | Must match the internal REST API configuration |

Changing these values directly can break panel integration. Use the server's
container configuration or port controls when an operational change is
required.

## Community server and crossplay

New Palworld servers start as community servers by default. The image detects
the host's public IPv4 address and generates:

```text
-publiclobby -publicip=<public IPv4> -publicport=8211
```

This advertises the server in the community list used by Xbox. The game port is
`8211/UDP`; `27015/UDP` remains the query port.

The controls are available under **Settings → Container → Palworld**:

| Variable | Default | Purpose |
|---|---|---|
| `PALWORLD_COMMUNITY_SERVER` | `true` | Enables `-publiclobby` |
| `PALWORLD_PUBLIC_IP` | automatic | Overrides public IPv4 detection |
| `PALWORLD_PUBLIC_PORT` | `8211` | Sets the advertised public port |
| `PALWORLD_START_PARAMS` | empty | Completely overrides automatic arguments |

If IP detection fails, the image still starts with `-publiclobby` and lets
Palworld detect the address. On NAT hosts, set the public IP manually and
forward `8211/UDP` to the host.

## Applying changes

1. Open the Palworld server in the panel.
2. Go to **Settings → Server Settings**.
3. Search for a setting by its display name or Palworld key.
4. Save the changes.
5. Restart the Palworld server when prompted.

The backend updates only the submitted keys and preserves all other entries in
`OptionSettings`.

## Settings verified on the production server

The extended form and generic save path were validated with:

```text
BuildObjectDeteriorationDamageRate=0
ItemWeightRate=0
```

These disable building deterioration and item weight respectively.

## Independent project

Ebyte Game Panel is maintained and distributed from its own repository. It
preserves the credits and license notices for the original work while code,
catalog, and container image updates are versioned and validated independently.
