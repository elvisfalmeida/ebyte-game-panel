import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CatalogNewsItem, CatalogResourceItem } from '../utils/api';

export interface SocialLink {
  label: string;
  url: string;
  icon?: 'github' | 'discord' | 'youtube' | 'instagram' | 'linkedin' | 'website';
}

export interface PanelContent {
  news: {
    enabled: boolean;
    source: 'local' | 'remote';
    remoteUrl?: string;
    rotationSeconds: number;
    items: CatalogNewsItem[];
  };
  social: {
    enabled: boolean;
    title?: string;
    links: SocialLink[];
  };
  resources: {
    source: 'local' | 'remote';
    remoteUrl?: string;
    items: CatalogResourceItem[];
  };
}

const DEFAULT_CONTENT: PanelContent = {
  news: { enabled: true, source: 'local', rotationSeconds: 15, items: [] },
  social: { enabled: false, links: [] },
  resources: { source: 'local', items: [] },
};

const PanelContentContext = createContext<PanelContent>(DEFAULT_CONTENT);

function normalizeContent(value: Partial<PanelContent> | null | undefined): PanelContent {
  return {
    news: {
      ...DEFAULT_CONTENT.news,
      ...(value?.news ?? {}),
      items: Array.isArray(value?.news?.items) ? value.news.items : [],
    },
    social: {
      ...DEFAULT_CONTENT.social,
      ...(value?.social ?? {}),
      links: Array.isArray(value?.social?.links) ? value.social.links : [],
    },
    resources: {
      ...DEFAULT_CONTENT.resources,
      ...(value?.resources ?? {}),
      items: Array.isArray(value?.resources?.items) ? value.resources.items : [],
    },
  };
}

export function PanelContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState(DEFAULT_CONTENT);

  useEffect(() => {
    let cancelled = false;
    const configuredUrl = import.meta.env.VITE_PANEL_CONTENT_URL?.trim();
    const url = configuredUrl || '/panel-content.json';

    fetch(url, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`Content configuration returned ${response.status}`);
        return response.json();
      })
      .then((value) => {
        if (!cancelled) setContent(normalizeContent(value));
      })
      .catch((error) => {
        console.error('Failed to load panel content configuration:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <PanelContentContext.Provider value={content}>{children}</PanelContentContext.Provider>;
}

export function usePanelContent(): PanelContent {
  return useContext(PanelContentContext);
}
