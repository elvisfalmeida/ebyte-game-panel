# Conteúdo do painel

[English](PANEL_CONTENT.md) · [Português (Brasil)](PANEL_CONTENT.pt-BR.md)

O Ebyte Game Panel lê notícias, links sociais e Recursos de:

```text
/opt/gamepanel/deploy/panel-content.json
```

O arquivo é montado como somente leitura no contêiner do frontend e preservado
pelas atualizações. Depois de editá-lo, basta recarregar o navegador; não é
necessário recompilar o frontend.

## Banner de notícias

`news.enabled` controla o banner. Com `source: "local"`, os itens vêm de
`news.items`. Com `source: "remote"`, o painel consulta `/news` em
`news.remoteUrl`. `rotationSeconds` controla a rotação automática.

Os valores aceitos em `iconKey` são `server`, `restart`, `warning`, `news`,
`update`, `maintenance`, `security`, `event`, `info` e `success`.

## Links da barra lateral

`social.enabled` controla a seção. `social.title` e todos os objetos de
`social.links` são configuráveis. Os ícones disponíveis são `github`, `discord`,
`youtube`, `instagram`, `linkedin` e `website`.

## Recursos e tutoriais

`resources.source` aceita `local` ou `remote`. Os itens locais vêm de
`resources.items`; o modo remoto consulta `/resources` em `remoteUrl`. Cada item
aceita título, descrição, URL, categoria, tipo de mídia e chave de jogo opcional.

Mantenha o arquivo como JSON válido. Conteúdo inválido ou indisponível usa um
fallback seguro e registra o erro no console do navegador.
