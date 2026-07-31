# 🌎 Configurações ampliadas do Palworld

[English](PALWORLD_SETTINGS.md) · [Português (Brasil)](PALWORLD_SETTINGS.pt-BR.md)

O Ebyte Game Panel amplia a tela de configurações do Palworld para uma interface
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

## Servidor comunitário e crossplay

Novos servidores Palworld iniciam como servidores comunitários por padrão. A
imagem gera os argumentos abaixo, detectando o IPv4 público da máquina:

```text
-publiclobby -publicip=<IPv4 público> -publicport=8211
```

Isso permite que o servidor seja anunciado na lista comunitária usada pelo
Xbox. A porta do jogo é `8211/UDP`; `27015/UDP` permanece como porta de consulta.

Os campos ficam em **Configurações → Contêiner → Palworld**:

| Variável | Padrão | Finalidade |
|---|---|---|
| `PALWORLD_COMMUNITY_SERVER` | `true` | Ativa `-publiclobby` |
| `PALWORLD_PUBLIC_IP` | automático | Substitui a detecção do IPv4 público |
| `PALWORLD_PUBLIC_PORT` | `8211` | Define a porta pública anunciada |
| `PALWORLD_START_PARAMS` | vazio | Substitui integralmente os argumentos automáticos |

Se a detecção do IP falhar, a imagem ainda inicia com `-publiclobby` e deixa o
Palworld detectar o endereço. Em máquinas com NAT, informe manualmente o IP
público e encaminhe `8211/UDP` para o host.

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

## Projeto independente

O Ebyte Game Panel é mantido e distribuído pelo próprio repositório. O projeto
preserva os créditos e avisos de licença do trabalho original, mas atualizações
de código, catálogo e imagens são versionadas e validadas de forma independente.
