const phrases: Record<string, string> = {
  'User Administration': 'Administração de usuários',
  'Create User': 'Criar usuário',
  'Edit User': 'Editar usuário',
  'Delete User': 'Excluir usuário',
  'Username': 'Usuário',
  'Password': 'Senha',
  'Confirm Password': 'Confirmar senha',
  'New Password': 'Nova senha',
  'Enabled': 'Ativo',
  'Disabled': 'Desativado',
  'Permissions': 'Permissões',
  'Global Permissions': 'Permissões globais',
  'Server Permissions': 'Permissões do servidor',
  'Save Changes': 'Salvar alterações',
  'Cancel': 'Cancelar',
  'Close': 'Fechar',
  'Create': 'Criar',
  'Delete': 'Excluir',
  'Rename': 'Renomear',
  'Download': 'Baixar',
  'Upload': 'Enviar',
  'Refresh': 'Atualizar',
  'Actions': 'Ações',
  'Status': 'Status',
  'Role': 'Função',
  'Administrator': 'Administrador',
  'No users found.': 'Nenhum usuário encontrado.',
  'File Manager': 'Gerenciador de arquivos',
  'New File': 'Novo arquivo',
  'New Folder': 'Nova pasta',
  'Name': 'Nome',
  'Size': 'Tamanho',
  'Modified': 'Modificado',
  'Save File': 'Salvar arquivo',
  'Backups': 'Backups',
  'Create Backup': 'Criar backup',
  'Backup Now': 'Fazer backup agora',
  'Restore': 'Restaurar',
  'Retention': 'Retenção',
  'Scheduled Tasks': 'Tarefas agendadas',
  'Create Task': 'Criar tarefa',
  'Edit Task': 'Editar tarefa',
  'Schedule': 'Agendamento',
  'Task Type': 'Tipo da tarefa',
  'Last Run': 'Última execução',
  'Next Run': 'Próxima execução',
  'Container Config': 'Configuração do contêiner',
  'Environment Variables': 'Variáveis de ambiente',
  'Resource Limits': 'Limites de recursos',
  'Memory Limit': 'Limite de memória',
  'CPU Limit': 'Limite de CPU',
  'Mounts': 'Volumes',
  'Ports': 'Portas',
  'Host Port': 'Porta do host',
  'Container Port': 'Porta do contêiner',
  'Container path': 'Caminho no contêiner',
  'Health Check': 'Verificação de saúde',
  'Terminal': 'Terminal',
  'Game Config': 'Configuração do jogo',
  'Server Settings': 'Configurações do servidor',
  'Advanced Configuration': 'Configuração avançada',
  'Open in File Manager': 'Abrir no gerenciador de arquivos',
  'Restart required': 'Reinicialização necessária',
  'Restart to apply changes.': 'Reinicie para aplicar as alterações.',
  'Wipe': 'Limpeza',
  'Soft Wipe': 'Limpeza parcial',
  'Hard Wipe': 'Limpeza completa',
  'Install': 'Instalar',
  'Installing': 'Instalando',
  'Start': 'Iniciar',
  'Stop': 'Parar',
  'Restart': 'Reiniciar',
  'Search': 'Buscar',
  'Loading…': 'Carregando…',
  'Saving…': 'Salvando…',
  'No data available.': 'Nenhum dado disponível.',
  'Are you sure?': 'Tem certeza?',
  'This action cannot be undone.': 'Esta ação não pode ser desfeita.',
  'Show password': 'Mostrar senha',
  'Hide password': 'Ocultar senha',
};

const originalText = new WeakMap<Text, string>();
const translatedAttributes = ['placeholder', 'title', 'aria-label'] as const;

function translateTextNode(node: Text, toPortuguese: boolean): void {
  const source = originalText.get(node) ?? node.nodeValue ?? '';
  if (!originalText.has(node)) originalText.set(node, source);
  const trimmed = source.trim();
  const translated = phrases[trimmed];
  node.nodeValue = toPortuguese && translated
    ? source.replace(trimmed, translated)
    : source;
}

function translateElement(element: Element, toPortuguese: boolean): void {
  for (const attribute of translatedAttributes) {
    const storageName = `data-i18n-original-${attribute.replace('aria-', 'aria')}`;
    const current = element.getAttribute(attribute);
    if (current !== null && !element.hasAttribute(storageName)) {
      element.setAttribute(storageName, current);
    }
    const source = element.getAttribute(storageName);
    if (source !== null) element.setAttribute(attribute, toPortuguese ? (phrases[source] ?? source) : source);
  }
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) translateTextNode(child as Text, toPortuguese);
  }
}

export function translateLegacyInterface(root: ParentNode, toPortuguese: boolean): void {
  if (root instanceof Element) translateElement(root, toPortuguese);
  root.querySelectorAll('*').forEach((element) => translateElement(element, toPortuguese));
}

export function watchLegacyInterface(toPortuguese: boolean): () => void {
  translateLegacyInterface(document.body, toPortuguese);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) translateLegacyInterface(node, toPortuguese);
        else if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text, toPortuguese);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
