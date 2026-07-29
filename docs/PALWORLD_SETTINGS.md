# 🌎 Extended Palworld settings

This fork expands the Palworld settings screen from a small curated form to a
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

## Keeping the fork current

The local Git remotes should use:

```text
origin    https://github.com/elvisfalmeida/game-panel.git
upstream  https://github.com/ovh/game-panel.git
```

To bring upstream changes into a development branch:

```bash
git fetch upstream
git switch main
git merge --ff-only origin/main
git switch -c agent/sync-upstream
git merge upstream/main
```

Resolve and test any conflicts before merging the synchronization branch into
the fork's `main`. In particular, verify the Palworld settings API and frontend
production builds after upstream changes to either settings component.

New installations from this fork set `GAMEPANEL_REPOSITORY_URL` to the fork,
so the built-in updater does not silently switch the installation back to the
OVHcloud repository.
