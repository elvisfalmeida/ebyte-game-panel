# 📋 Histórico de alterações

[English](CHANGELOG.md) · [Português (Brasil)](CHANGELOG.pt-BR.md)

## Não lançado

### Adicionado

- **Conteúdo do painel em tempo de execução** — notícias, links da barra lateral
  e Recursos podem usar conteúdo JSON local ou fontes remotas independentes,
  sem depender do catálogo da OVHcloud.
- **Identidade Ebyte** — emblema próprio, nome e logo configuráveis, favicon,
  login, barra lateral, cabeçalho mobile e título do navegador.
- **Camada de tradução legada** — cobre configurações, administração de usuários,
  modais dinâmicos e controles de acessibilidade restantes.
- **Tradução estruturada das ferramentas do servidor** — Tarefas agendadas,
  Terminal, Backups, Gerenciador de arquivos e Configuração do contêiner agora
  usam chaves nativas em ações, estados vazios, avisos, validações, status e
  rótulos dinâmicos.
- **Tradução da administração e do catálogo** — Limpeza do servidor,
  Administração de usuários (incluindo a matriz de permissões) e Recursos agora
  usam chaves nativas em ações, validações, confirmações, filtros e estados
  vazios.
- Interface multilíngue com detecção do navegador, seletor persistente, inglês
  como fallback e português do Brasil.
- Traduções do login, navegação principal, modal de configurações e tela de
  configurações do Palworld.
- Descrições em português no ícone de informação das configurações ampliadas
  do Palworld.
- Interface pesquisável gerada a partir das 115 configurações disponibilizadas
  pela versão instalada do Palworld.
- README, documentação do Palworld e documentação de telemetria em PT-BR.

### Alterado

- **Fuso configurável nos logs** — os horários do console podem ser fixados com
  `VITE_LOG_TIME_ZONE`; a imagem do Palworld agora inclui a base IANA e aceita a
  variável padrão `TZ` por servidor.

- Instalação, atualização, rollback e backend permanecem apontados para
  `elvisfalmeida/game-panel`.

## v1.2.0 — 30/07/2026

- Suporte nativo ao Project Zomboid.
- Limpeza parcial ou completa dos servidores.
- Extração de arquivos compactados pelo gerenciador de arquivos.
- Melhor dimensionamento de memória para Minecraft e Hytale.
- Melhorias na confiabilidade de uploads.

## v1.1.0 — 10/07/2026

- Suporte nativo ao Palworld.
- Atualização opcional ao iniciar jogos baseados no SteamCMD.
- Console redimensionável e em tela cheia.
- Melhorias no acompanhamento de instalação, logs e saúde dos servidores.
- Configurações unificadas para jogos OVHcloud.

## v1.0.0 — 30/06/2026

- Modelo com provedores OVHcloud, LinuxGSM e imagens externas.
- Gerenciador de arquivos, backups, tarefas agendadas e permissões.
- Monitoramento, terminal e configuração de recursos dos contêineres.
- Atualizador integrado do painel.

## v1.0.0-beta.1 — 21/04/2026

Primeira versão beta pública, com gerenciamento de servidores LinuxGSM em
contêineres Docker.
