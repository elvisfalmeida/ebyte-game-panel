# Auditoria, notificações e Telegram

[English](AUDIT_NOTIFICATIONS.md) · [Português (Brasil)](AUDIT_NOTIFICATIONS.pt-BR.md)

O Ebyte Game Panel mantém um registro administrativo independente do histórico
resumido de cada servidor. A página **Auditoria e alertas**, disponível para o
usuário root, reúne:

- operações mutáveis feitas pelo painel, com usuário, IP, resultado, duração e
  recurso afetado;
- logins bem-sucedidos, credenciais inválidas, contas desativadas e bloqueios
  por excesso de tentativas;
- ações operacionais dos servidores e falhas produzidas por tarefas;
- notificações internas com estado lido/não lido;
- envio opcional de alertas para o Telegram.

Senhas, tokens, variáveis de ambiente e corpos de requisições não são gravados
nos eventos. O token do bot e o ID da conversa são cifrados com AES-256-GCM
antes de serem armazenados no SQLite. A chave é derivada do `JWT_SECRET` da
instalação; portanto, esse segredo deve continuar protegido e ser preservado em
backups.

## Configurar o Telegram

1. No Telegram, abra o **@BotFather**, execute `/newbot` e copie o token.
2. Envie uma mensagem ao bot. Para grupos, adicione o bot ao grupo e envie uma
   mensagem nele.
3. Descubra o ID da conversa usando a API `getUpdates` do bot ou um utilitário
   confiável. IDs de grupos normalmente começam com `-100`.
4. No painel, abra **Auditoria e alertas → Configurações**.
5. Informe o token, o ID da conversa e salve.
6. Use **Enviar teste** e confirme o recebimento no Telegram.
7. Ative o canal e escolha a severidade mínima.

O painel e o Telegram possuem limiares independentes:

- **Informativo** inclui todas as ocorrências;
- **Atenção** inclui avisos, erros e eventos críticos;
- **Erro** inclui erros e eventos críticos;
- **Crítico** envia apenas incidentes críticos.

Por padrão, a central interna recebe eventos a partir de **Atenção** e o
Telegram, quando ativado, recebe eventos a partir de **Erro**.

## Segurança e operação

- Somente o usuário root acessa eventos, notificações e configuração do canal.
- A API nunca devolve o token ou o ID armazenado; informa apenas se o Telegram
  está configurado.
- Informar os campos novamente substitui as credenciais. Deixá-los vazios
  preserva os valores existentes.
- Falhas de entrega ficam visíveis na notificação, mas não interrompem a
  operação que gerou o alerta.
- As datas são armazenadas em UTC e apresentadas pela interface em
  `America/Sao_Paulo`.
- Inclua `game-panel.db` e o segredo da instância na política de backups.

Esta primeira versão mantém o histórico no banco sem expiração automática.
Retenção configurável, exportação CSV/JSON, reenvio manual e regras compostas
podem ser acrescentados sem alterar o formato dos eventos existentes.
