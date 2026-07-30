# Panel content

[English](PANEL_CONTENT.md) · [Português (Brasil)](PANEL_CONTENT.pt-BR.md)

Ebyte Game Panel reads news, social links, and Resources from:

```text
/opt/gamepanel/deploy/panel-content.json
```

The file is mounted read-only into the frontend container and is preserved by
panel updates. After editing it, reload the browser; no frontend rebuild is
required.

## News banner

`news.enabled` controls the banner. With `source: "local"`, items come from
`news.items`. With `source: "remote"`, the panel requests `/news` from
`news.remoteUrl`. `rotationSeconds` controls automatic rotation.

Supported `iconKey` values are `server`, `restart`, `warning`, `news`, `update`,
`maintenance`, `security`, `event`, `info`, and `success`.

## Sidebar links

`social.enabled` controls the section. `social.title` and every object in
`social.links` are configurable. Supported icons are `github`, `discord`,
`youtube`, `instagram`, `linkedin`, and `website`.

## Resources and tutorials

`resources.source` accepts `local` or `remote`. Local entries come from
`resources.items`; remote mode requests `/resources` from `remoteUrl`. Items
support title, description, URL, category, media type, and an optional game key.

Keep the file valid JSON. Invalid or unavailable content falls back safely and
records the error in the browser console.
