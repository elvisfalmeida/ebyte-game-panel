# Imagens de contêiner

[Português (Brasil)](CONTAINER_IMAGES.pt-BR.md) · [English](CONTAINER_IMAGES.md)

O Ebyte Game Panel mantém suas imagens próprias no GitHub Container Registry:

```text
ghcr.io/elvisfalmeida/ebyte-game-panel-*
```

As imagens são reconstruídas a partir dos Dockerfiles deste repositório e
publicadas automaticamente pelo workflow `publish-container-images.yml`. Cada
publicação inclui:

- tag da versão do painel, como `1.2.0`;
- tag `latest`;
- tag imutável baseada no commit, como `sha-0123456789ab`;
- SBOM;
- atestação de procedência;
- metadados OCI com repositório, revisão, versão, fornecedor e licença.

A imagem Palworld `1.2.1` torna o modo comunitário o padrão e monta os
argumentos de publicação com o IPv4 público detectado. Um valor explícito em
`PALWORLD_START_PARAMS` sempre tem prioridade.

## Independência operacional

O catálogo nativo, o instalador e o atualizador apontam para o namespace Ebyte.
Imagens-base oficiais ainda são obtidas dos seus projetos originais, mas as
camadas e scripts específicos do painel são publicados no registro próprio.

Os binários dos jogos não são redistribuídos como propriedade do Ebyte. Cada
contêiner usa os canais oficiais do jogo durante a instalação e continua sujeito
à licença, EULA e autenticação do respectivo fornecedor.

## Publicação

Uma tag Git `vX.Y.Z` publica todas as famílias. Também é possível iniciar
manualmente **Publicar imagens de contêiner** em GitHub Actions, informar a
versão desejada e, opcionalmente, publicar apenas uma família da matriz.

Novas famílias de imagens devem ser incluídas na matriz do workflow e
documentadas aqui. Não publique credenciais, arquivos persistentes do servidor
ou binários proprietários de jogos dentro das imagens.
