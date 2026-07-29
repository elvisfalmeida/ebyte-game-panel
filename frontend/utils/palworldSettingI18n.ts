import type { AppLocale } from '../contexts/LanguageContext';
import type { GameSettingField } from '../components/serverSettings/GameSettingsSection';

const ptDescriptions: Record<string, string> = {
  Difficulty: 'Define a dificuldade geral usada pelo mundo.',
  RandomizerType: 'Define o modo de randomização de Pals e áreas do mundo.',
  RandomizerSeed: 'Semente usada para reproduzir a mesma randomização.',
  DayTimeSpeedRate: 'Multiplicador da velocidade de passagem do tempo durante o dia.',
  NightTimeSpeedRate: 'Multiplicador da velocidade de passagem do tempo durante a noite.',
  ExpRate: 'Multiplicador da experiência recebida por jogadores e Pals.',
  PalCaptureRate: 'Multiplicador da chance de captura dos Pals.',
  PalSpawnNumRate: 'Multiplicador da quantidade de Pals que aparecem no mundo.',
  PalDamageRateAttack: 'Multiplicador do dano causado pelos Pals.',
  PalDamageRateDefense: 'Multiplicador do dano recebido pelos Pals.',
  PlayerDamageRateAttack: 'Multiplicador do dano causado pelos jogadores.',
  PlayerDamageRateDefense: 'Multiplicador do dano recebido pelos jogadores.',
  PlayerStomachDecreaceRate: 'Multiplicador da velocidade com que a fome do jogador diminui.',
  PlayerStaminaDecreaceRate: 'Multiplicador do consumo de stamina dos jogadores.',
  PlayerAutoHPRegeneRate: 'Multiplicador da regeneração automática de vida dos jogadores.',
  PlayerAutoHpRegeneRateInSleep: 'Multiplicador da regeneração de vida do jogador enquanto dorme.',
  PalStomachDecreaceRate: 'Multiplicador da velocidade com que a fome dos Pals diminui.',
  PalStaminaDecreaceRate: 'Multiplicador do consumo de stamina dos Pals.',
  PalAutoHPRegeneRate: 'Multiplicador da regeneração automática de vida dos Pals.',
  PalAutoHpRegeneRateInSleep: 'Multiplicador da regeneração de vida dos Pals enquanto descansam.',
  BuildObjectHpRate: 'Multiplicador da vida máxima das construções.',
  BuildObjectDamageRate: 'Multiplicador do dano recebido pelas construções.',
  BuildObjectDeteriorationDamageRate: 'Taxa de deterioração das construções fora da área da base. Use 0 para desativar.',
  CollectionDropRate: 'Multiplicador da quantidade obtida ao coletar recursos.',
  CollectionObjectHpRate: 'Multiplicador da resistência de árvores, minérios e outros recursos.',
  CollectionObjectRespawnSpeedRate: 'Multiplicador da velocidade de reaparecimento dos recursos.',
  EnemyDropItemRate: 'Multiplicador da quantidade de itens derrubados por inimigos.',
  DeathPenalty: 'Define o que o jogador perde quando morre.',
  DropItemMaxNum: 'Quantidade máxima de itens largados simultaneamente no mundo.',
  PhysicsActiveDropItemMaxNum: 'Quantidade máxima de itens largados com física ativa.',
  BaseCampMaxNum: 'Quantidade máxima de bases existentes no servidor.',
  BaseCampWorkerMaxNum: 'Quantidade máxima de Pals trabalhando em cada base.',
  DropItemAliveMaxHours: 'Tempo, em horas, antes de itens largados desaparecerem.',
  AutoResetGuildTimeNoOnlinePlayers: 'Tempo sem jogadores online antes da remoção automática de uma guilda.',
  GuildPlayerMaxNum: 'Quantidade máxima de jogadores em cada guilda.',
  BaseCampMaxNumInGuild: 'Quantidade máxima de bases permitidas para cada guilda.',
  PalEggDefaultHatchingTime: 'Tempo base, em horas, para chocar um ovo grande.',
  WorkSpeedRate: 'Multiplicador da velocidade de trabalho dos Pals.',
  AutoSaveSpan: 'Intervalo, em segundos, entre salvamentos automáticos.',
  ItemWeightRate: 'Multiplicador do peso dos itens. Use 0 para remover o peso.',
  CoopPlayerMaxNum: 'Quantidade máxima de participantes em uma sessão cooperativa.',
  ServerPlayerMaxNum: 'Quantidade máxima de jogadores conectados ao servidor.',
  ServerName: 'Nome exibido para o servidor na lista da comunidade.',
  ServerDescription: 'Descrição exibida junto ao nome do servidor.',
  ServerPassword: 'Senha exigida para entrar. Deixe vazia para acesso público.',
  RCONPort: 'Porta TCP utilizada pelo protocolo RCON.',
  Region: 'Região informada na listagem pública do servidor.',
  BanListURL: 'Endereço da lista externa de jogadores banidos.',
  ChatPostLimitPerMinute: 'Quantidade máxima de mensagens de chat por minuto.',
  CrossplayPlatforms: 'Plataformas autorizadas no crossplay, no formato (Steam,Xbox,PS5,Mac).',
  SupplyDropSpan: 'Intervalo, em minutos, entre caixas de suprimentos.',
  MaxBuildingLimitNum: 'Limite global de objetos de construção; 0 usa o padrão do jogo.',
  ServerReplicatePawnCullDistance: 'Distância máxima de replicação de personagens e criaturas.',
  EquipmentDurabilityDamageRate: 'Multiplicador da perda de durabilidade dos equipamentos.',
  ItemCorruptionMultiplier: 'Multiplicador da velocidade de deterioração de alimentos e itens perecíveis.',
  MonsterFarmActionSpeedRate: 'Multiplicador da velocidade de produção dos Pals no rancho.',
  GuildRejoinCooldownMinutes: 'Tempo de espera, em minutos, para entrar novamente em uma guilda.',
  BlockRespawnTime: 'Tempo de bloqueio antes de um jogador poder reaparecer.',
  RespawnPenaltyDurationThreshold: 'Limite de duração usado para aplicar penalidade de respawn.',
  RespawnPenaltyTimeScale: 'Multiplicador do tempo da penalidade de respawn.',
  VoiceChatMaxVolumeDistance: 'Distância em que o chat de voz permanece no volume máximo.',
  VoiceChatZeroVolumeDistance: 'Distância após a qual o chat de voz deixa de ser audível.',
  BuildingNameDisplayCacheTTLSeconds: 'Tempo de cache, em segundos, para exibição dos nomes das construções.',
};

function readablePtLabel(key: string): string {
  return key
    .replace(/^b(?=[A-Z])/, '')
    .split('_').join(' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

function inferredPtDescription(field: GameSettingField): string {
  const label = readablePtLabel(field.key);
  if (field.type === 'boolean') return `Ativa ou desativa a opção “${label}”.`;
  if (/Rate$/.test(field.key)) return `Define o multiplicador aplicado a “${label}”.`;
  if (/MaxNum|Max$|Limit/.test(field.key)) return `Define o limite usado por “${label}”.`;
  if (/Time|Span|Interval|Seconds|Minutes|Hours/.test(field.key)) return `Define o tempo ou intervalo usado por “${label}”.`;
  return `Configuração avançada do Palworld correspondente à chave ${field.key}.`;
}

export function localizePalworldSetting(field: GameSettingField, locale: AppLocale): GameSettingField {
  if (locale !== 'pt-BR') return field;
  return {
    ...field,
    label: readablePtLabel(field.key),
    description: ptDescriptions[field.key] ?? inferredPtDescription(field),
  };
}
