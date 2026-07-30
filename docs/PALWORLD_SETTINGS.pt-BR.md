# 🌎 Configurações ampliadas do Palworld

[English](PALWORLD_SETTINGS.md) · [Português (Brasil)](PALWORLD_SETTINGS.pt-BR.md)

Este fork amplia a tela de configurações do Palworld para uma interface
pesquisável gerada a partir da própria versão do jogo instalada no servidor.
Atualmente são disponibilizadas 115 configurações.

## Funcionamento

O backend combina os valores padrão do jogo com os valores ativos em:

```text
/server/Pal/Saved/Config/LinuxServer/PalWorldSettings.ini
```

Os controles são escolhidos automaticamente:

| Valor do Palworld | Controle na interface |
|---|---|
| `True` ou `False` | Botão de ativação |
| Número inteiro | Campo inteiro |
| Número decimal | Campo decimal |
| Texto entre aspas | Campo de texto |
| Enumeração ou lista | Campo de texto validado |

As configurações principais preservam nomes, descrições, limites e seletores
amigáveis. As demais recebem nome legível, descrição no ícone de informação e
mantêm a chave original disponível na ajuda.

## Configurações protegidas

Alguns valores operacionais não são exibidos na tela de mundo:

| Chave | Motivo |
|---|---|
| `AdminPassword` | Administrada pela configuração do contêiner |
| `PublicPort` | Deve acompanhar o mapeamento UDP do Docker |
| `RESTAPIEnabled` | Necessária para console e backups |
| `RESTAPIPort` | Deve acompanhar a API REST interna |

Alterar esses valores diretamente pode interromper a integração com o painel.

## Como alterar

1. Abra o servidor Palworld no painel.
2. Acesse **Configurações → Configuração do jogo**.
3. Pesquise pelo nome ou pela chave do Palworld.
4. Passe o mouse ou clique no ícone de informação para ler a descrição.
5. Salve e reinicie o servidor.

O backend altera somente as chaves enviadas e preserva os outros valores de
`OptionSettings`.

## Exemplos validados

```text
BuildObjectDeteriorationDamageRate=0
ItemWeightRate=0
```

Esses valores desativam a deterioração das construções e o peso dos itens.

## Sincronização com o projeto original

O fork utiliza:

```text
origin    https://github.com/elvisfalmeida/ebyte-game-panel.git
upstream  https://github.com/ovh/game-panel.git
```

Para preparar uma atualização:

```bash
git fetch upstream
git switch main
git pull --ff-only origin main
git switch -c agent/sync-upstream
git merge upstream/main
```

Resolva conflitos e valide as compilações antes de integrar a branch na
`main`. Novas instalações deste fork mantêm
`GAMEPANEL_REPOSITORY_URL` apontando para o fork.
