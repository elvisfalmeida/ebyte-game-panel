<div align="center">

[Português (Brasil)](README.md) · [English](README.en.md)

# 🎮 Ebyte Game Panel

### Implante e administre seus servidores de jogos em uma interface web moderna.

[![Licença](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
![Plataforma](https://img.shields.io/badge/Platform-Linux-1793D1)

<img src="frontend/public/ebyte-logo.png" alt="Ebyte Game Panel" width="220">

</div>

O Ebyte Game Panel é um painel de controle **open source e auto-hospedado**
para implantar, executar e monitorar servidores de jogos. Ele permite administrar
arquivos, backups, jogadores, desempenho e o ciclo de vida dos servidores sem
depender do terminal.

O produto acrescenta uma interface pesquisável para praticamente todas as
configurações disponibilizadas pela versão instalada do Palworld e uma base de
internacionalização com inglês e português do Brasil.

## ✨ Recursos

- Controle completo de inicialização, parada e reinicialização.
- Status, logs, métricas e progresso de instalação em tempo real.
- Console interativo pelo navegador.
- Gerenciador de arquivos integrado.
- Backups, restauração e tarefas agendadas.
- Configuração avançada dos contêineres.
- Permissões detalhadas por usuário.
- Monitoramento do host e terminal do contêiner.
- Atualizador integrado apontando para o repositório oficial do Ebyte Game Panel.
- Editor visual de notícias, links sociais, recursos e tutoriais.
- Interface multilíngue com idioma persistente.
- 115 configurações do Palworld editáveis e pesquisáveis.

## 🕹️ Jogos suportados

- Minecraft Java, Paper, Fabric, NeoForge e Bedrock
- Counter-Strike 2
- Hytale
- Palworld
- Project Zomboid
- Catálogo adicional do LinuxGSM
- Imagens Docker externas

## 🚀 Instalação

### Requisitos

- Debian 12/13 ou Ubuntu 22.04/24.04/25.10/26.04;
- domínio apontando para o IP público;
- acesso administrativo ao servidor.

```bash
sudo apt install git
git clone https://github.com/elvisfalmeida/ebyte-game-panel.git
cd ebyte-game-panel
sudo bash ./deploy/install.sh
```

O instalador solicita domínio, usuário administrador, senha e e-mail do
Let's Encrypt. Ao terminar, o painel estará disponível em
`https://<seu-dominio>`.

Para desativar a telemetria:

```bash
sudo bash ./deploy/install.sh --telemetry-disabled
```

## 🌐 Idiomas

O painel detecta o idioma do navegador na primeira visita. O usuário pode
alternar entre **English** e **Português (Brasil)** no seletor localizado na
barra lateral. A escolha fica salva no navegador.

Inglês é sempre usado como fallback quando uma tradução ainda não existe.
As principais telas de gerenciamento do servidor usam chaves estruturadas de
tradução. A camada de compatibilidade permanece apenas para trechos legados e
conteúdo inserido dinamicamente. A cobertura inclui Limpeza, tarefas agendadas,
terminal, backups, arquivos, contêiner, Administração de usuários, permissões e
Recursos.

## 🏗️ Arquitetura

- `frontend/` — React, TypeScript e Vite.
- `backend/` — Node.js, Express, WebSocket e SQLite.
- `docker-images/` — imagens dos servidores de jogos.
- `deploy/` — instalação, atualização e rollback.

## 📚 Documentação

- [Conteúdo do painel](docs/PANEL_CONTENT.pt-BR.md)
- [Fusos horários](docs/TIMEZONE.pt-BR.md)
- [Configurações ampliadas do Palworld](docs/PALWORLD_SETTINGS.pt-BR.md)
- [Telemetria](docs/TELEMETRY.pt-BR.md)
- [Personalização de marca](docs/BRANDING.pt-BR.md)
- [Imagens de contêiner próprias](docs/CONTAINER_IMAGES.pt-BR.md)
- [Auditoria, notificações e Telegram](docs/AUDIT_NOTIFICATIONS.pt-BR.md)
- [Changelog em português](CHANGELOG.pt-BR.md)

## 📄 Licença

Licenciado sob a Apache License 2.0. Consulte [LICENSE](LICENSE).

## Créditos

O Ebyte Game Panel deriva do
[OVHcloud Game Panel](https://github.com/ovh/game-panel), distribuído sob a
licença Apache 2.0. OVHcloud e LinuxGSM permanecem creditados pelo projeto
original, integrações de provedores e trabalhos upstream relacionados. A marca
Ebyte e estas personalizações não indicam endosso da OVHcloud.
