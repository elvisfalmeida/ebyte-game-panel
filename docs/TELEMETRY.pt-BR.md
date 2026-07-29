# 📡 Telemetria

[English](TELEMETRY.md) · [Português (Brasil)](TELEMETRY.pt-BR.md)

O OVHcloud Game Panel envia telemetria anônima por padrão. Esses dados ajudam o
projeto original a entender quais jogos e versões são mais utilizados.

## Dados enviados na instalação ou atualização

| Campo | Descrição |
|---|---|
| `instanceId` | Identificador gerado para a instalação |
| `instanceSecret` | Segredo usado para autenticar e remover duplicidades |
| `version` | Versão instalada do painel |
| `domain` | Domínio configurado |
| `eventType` | `panel.updated`, nas atualizações |
| `at` | Data e hora UTC do evento |

## Dados enviados ao instalar ou remover um jogo

| Campo | Descrição |
|---|---|
| `eventType` | `game.installed` ou `game.uninstalled` |
| `provider` | `ovhcloud`, `linuxgsm` ou `external` |
| `catalogId` | Identificador do jogo |
| `dockerImage` | Imagem informada para provedores externos |
| `at` | Data e hora UTC do evento |

## Como desativar

- Na instalação, acrescente `--telemetry-disabled`.
- Depois da instalação, defina `TELEMETRY_ENABLED=false` no arquivo `.env` e
  reinicie o painel.
