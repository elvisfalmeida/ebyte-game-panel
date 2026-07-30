# Conteúdo do painel

[Português (Brasil)](PANEL_CONTENT.pt-BR.md) · [English](PANEL_CONTENT.md)

## Editor visual

O usuário root pode abrir **Conteúdo do painel** na barra lateral para editar e
publicar notícias, links sociais, recursos e tutoriais. A tela segue os mesmos
cards, botões, campos, cores e comportamento responsivo das demais áreas
administrativas.

O editor permite alternar fontes locais e remotas, adicionar e remover itens,
configurar o banner e publicar as alterações sem acessar o servidor. O backend
valida URLs, limites e campos obrigatórios antes de gravar. A substituição é
atômica quando o armazenamento permite; em bind mounts do Docker, o conteúdo
completo já validado é gravado diretamente por limitação do sistema de arquivos.

O Ebyte Game Panel lê notícias, links sociais e Recursos de:

```text
/opt/gamepanel/deploy/panel-content.json
```

O arquivo é montado como leitura no frontend e como leitura/gravação no backend,
com acesso de edição restrito ao usuário root. Ele é preservado pelas
atualizações e não exige recompilar o frontend.

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

Ainda é possível editar o arquivo manualmente. Mantenha-o como JSON válido;
conteúdo inválido ou indisponível usa um fallback seguro e registra o erro no
console do navegador.
