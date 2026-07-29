import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { watchLegacyInterface } from '../utils/legacyTranslations';

export type AppLocale = 'en' | 'pt-BR';

const STORAGE_KEY = 'gamepanel.locale';

const ptBR: Record<string, string> = {
  'language.english': 'English',
  'language.portuguese': 'Português (Brasil)',
  'language.label': 'Idioma',
  'nav.gameServers': 'Servidores',
  'nav.hostStatus': 'Status do host',
  'nav.users': 'Administração de usuários',
  'nav.resources': 'Recursos',
  'nav.followUs': 'Siga-nos',
  'user.unknown': 'Usuário desconhecido',
  'user.menu': 'Menu do usuário',
  'user.changePassword': 'Alterar senha',
  'user.logout': 'Sair',
  'theme.light': 'Usar tema claro',
  'theme.dark': 'Usar tema escuro',
  'login.username': 'Usuário',
  'login.usernamePlaceholder': 'Digite seu usuário',
  'login.password': 'Senha',
  'login.passwordPlaceholder': 'Digite sua senha',
  'login.signIn': 'Entrar',
  'login.signingIn': 'Entrando…',
  'login.tagline': 'Entre para administrar seus servidores de jogos',
  'login.incorrectTitle': 'Usuário ou senha incorretos',
  'login.incorrectMessage': 'Verifique seus dados de acesso e tente novamente.',
  'login.unable': 'Não foi possível entrar',
  'login.rights': 'Todos os direitos reservados.',
  'login.required': 'Preencha usuário e senha.',
  'login.invalid': 'Não foi possível entrar. Verifique suas credenciais.',
  'settings.title': 'Configurações do servidor',
  'settings.gameConfig': 'Configuração do jogo',
  'settings.config': 'Configuração',
  'settings.files': 'Arquivos',
  'settings.fileManager': 'Gerenciador de arquivos',
  'settings.backups': 'Backups',
  'settings.schedules': 'Agendamentos',
  'settings.scheduledTasks': 'Tarefas agendadas',
  'settings.terminal': 'Terminal',
  'settings.container': 'Contêiner',
  'settings.containerConfig': 'Configuração do contêiner',
  'settings.noAccess': 'Sem acesso a esta seção',
  'settings.noAccessDescription': 'Você não tem permissão para visualizar ou administrar esta parte das configurações.',
  'gameSettings.title': 'Configurações do servidor',
  'gameSettings.search': 'Buscar por nome ou chave…',
  'gameSettings.showing': 'Exibindo {shown} de {total}',
  'gameSettings.noMatch': 'Nenhuma configuração corresponde à busca.',
  'gameSettings.none': 'Nenhuma configuração disponível. Talvez o servidor ainda não tenha sido iniciado.',
  'gameSettings.loading': 'Carregando configurações…',
  'gameSettings.save': 'Salvar',
  'gameSettings.saving': 'Salvando…',
  'gameSettings.noChanges': 'Nenhuma alteração para salvar.',
  'gameSettings.savedRestart': 'Configurações salvas. Reinicie o servidor para aplicar as alterações.',
  'gameSettings.savedNextStart': 'Configurações salvas. Elas serão aplicadas na próxima inicialização.',
  'gameSettings.stopToEdit': 'O servidor deve estar parado para editar estas configurações.',
  'palworld.serverSettings': 'Configurações do servidor',
  'palworld.wipe': 'Limpeza',
  'palworld.adminPassword': 'Senha administrativa',
  'palworld.adminPasswordDescription': 'Usada para ações administrativas no jogo e para a API REST do servidor.',
  'palworld.updateOnStart': 'Atualizar ao iniciar',
  'palworld.updateOnStartDescription': 'Quando ativado, procura e instala atualizações pelo SteamCMD sempre que o servidor inicia.',
  'news.title': 'Notícias',
  'news.hide': 'Ocultar notícias',
  'news.show': 'Mostrar notícias',
  'news.previous': 'Notícia anterior',
  'news.next': 'Próxima notícia',
  'news.pause': 'Pausar',
  'news.resume': 'Continuar',
  'news.none': 'Nenhuma notícia publicada',
  'news.noneDescription': 'As notícias da fonte configurada aparecerão aqui.',
  'host.cpuUsage': 'Uso de CPU',
  'host.ramUsage': 'Uso de RAM',
  'host.diskUsage': 'Uso de disco',
  'host.networkIo': 'Rede E/S',
  'host.cpuHistory': 'Histórico de CPU',
  'host.ramHistory': 'Histórico de RAM',
  'host.diskHistory': 'Histórico de disco',
  'host.networkHistory': 'Histórico de rede',
  'host.incoming': 'Entrada',
  'host.outgoing': 'Saída',
  'servers.none': 'Nenhum servidor de jogo instalado.',
  'servers.noneHint': 'Use “Adicionar servidor” para instalar o primeiro.',
  'servers.add': 'Adicionar servidor',
  'servers.connection': 'Conexão',
  'servers.power': 'Energia',
  'servers.management': 'Gerenciamento',
  'servers.delete': 'Excluir',
  'servers.memory': 'Memória',
  'servers.disk': 'Disco',
  'servers.network': 'Rede',
  'servers.loading': 'Carregando',
  'servers.start': 'Iniciar',
  'servers.stop': 'Parar',
  'servers.restart': 'Reiniciar',
  'servers.serverName': 'Nome do servidor',
  'servers.game': 'Jogo',
  'servers.status': 'Status',
  'servers.metrics': 'Métricas do servidor',
  'servers.customizeMetrics': 'Personalizar métricas visíveis',
};

function resolveInitialLocale(): AppLocale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'pt-BR') return saved;
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}

type LanguageContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, fallback?: string, values?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(resolveInitialLocale);

  const setLocale = (next: AppLocale) => {
    localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  };

  useEffect(() => {
    document.documentElement.lang = locale === 'pt-BR' ? 'pt-BR' : 'en';
    return watchLegacyInterface(locale === 'pt-BR');
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale,
    t: (key, fallback = key, values = {}) => {
      let translated = locale === 'pt-BR' ? (ptBR[key] ?? fallback) : fallback;
      for (const [name, replacement] of Object.entries(values)) {
        translated = translated.split(`{${name}}`).join(String(replacement));
      }
      return translated;
    },
  }), [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
