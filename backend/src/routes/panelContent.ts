import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Router, type Response } from 'express';
import { getConfig } from '../config.js';
import { rootOnly, type AuthenticatedRequest } from '../middleware/auth.js';
import { sendRouteError } from '../utils/routeErrors.js';

type JsonObject = Record<string, unknown>;

const router = Router();
const MAX_ITEMS = 200;
const MAX_TEXT = 4_000;

function object(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value as JsonObject;
}

function text(value: unknown, label: string, required = true): string | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || (required && !value.trim()) || value.length > MAX_TEXT) {
    throw new TypeError(`${label} must be a valid string`);
  }
  return value.trim();
}

function url(value: unknown, label: string, required = true): string | undefined {
  const result = text(value, label, required);
  if (!result) return result;
  const parsed = new URL(result);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new TypeError(`${label} must use HTTP or HTTPS`);
  return result;
}

function items(value: unknown, label: string): JsonObject[] {
  if (!Array.isArray(value) || value.length > MAX_ITEMS) {
    throw new TypeError(`${label} must be an array with at most ${MAX_ITEMS} items`);
  }
  return value.map((item, index) => object(item, `${label}[${index}]`));
}

function normalizePanelContent(value: unknown): JsonObject {
  const root = object(value, 'content');
  const news = object(root.news, 'news');
  const social = object(root.social, 'social');
  const resources = object(root.resources, 'resources');
  const newsSource = news.source === 'remote' ? 'remote' : 'local';
  const resourcesSource = resources.source === 'remote' ? 'remote' : 'local';

  return {
    news: {
      enabled: news.enabled !== false,
      source: newsSource,
      ...(newsSource === 'remote' ? { remoteUrl: url(news.remoteUrl, 'news.remoteUrl') } : {}),
      rotationSeconds: Math.min(3600, Math.max(5, Number(news.rotationSeconds) || 15)),
      items: items(news.items ?? [], 'news.items').map((item, index) => ({
        id: Number(item.id) || index + 1,
        title: text(item.title, `news.items[${index}].title`),
        description: text(item.description, `news.items[${index}].description`),
        date: Number(item.date) || Date.now(),
        type: typeof item.type === 'string' ? item.type : 'announcement',
        iconKey: typeof item.iconKey === 'string' ? item.iconKey : 'news',
        position: Number(item.position) || index + 1,
      })),
    },
    social: {
      enabled: social.enabled !== false,
      title: text(social.title, 'social.title', false) || '',
      links: items(social.links ?? [], 'social.links').map((item, index) => ({
        label: text(item.label, `social.links[${index}].label`),
        url: url(item.url, `social.links[${index}].url`),
        icon: typeof item.icon === 'string' ? item.icon : 'website',
      })),
    },
    resources: {
      source: resourcesSource,
      ...(resourcesSource === 'remote' ? { remoteUrl: url(resources.remoteUrl, 'resources.remoteUrl') } : {}),
      items: items(resources.items ?? [], 'resources.items').map((item, index) => ({
        id: Number(item.id) || index + 1,
        title: text(item.title, `resources.items[${index}].title`),
        description: text(item.description, `resources.items[${index}].description`),
        url: url(item.url, `resources.items[${index}].url`),
        category: text(item.category, `resources.items[${index}].category`),
        mediaType: typeof item.mediaType === 'string' ? item.mediaType : 'article',
        gameKey: typeof item.gameKey === 'string' && item.gameKey.trim() ? item.gameKey.trim() : null,
      })),
    },
  };
}

router.use(rootOnly);

router.get('/', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const raw = await fs.readFile(getConfig().panelContentFile, 'utf8');
    return res.json(normalizePanelContent(JSON.parse(raw)));
  } catch (error) {
    return sendRouteError(res, error, {
      route: 'ROUTE:PANEL_CONTENT:READ',
      fallbackMessage: 'Failed to read panel content',
    });
  }
});

router.put('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const content = normalizePanelContent(req.body);
    const target = getConfig().panelContentFile;
    const temporary = `${target}.${process.pid}.tmp`;
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(temporary, `${JSON.stringify(content, null, 2)}\n`, { mode: 0o660 });
    await fs.rename(temporary, target);
    return res.json({ success: true, content });
  } catch (error) {
    if (error instanceof TypeError || error instanceof SyntaxError) {
      return res.status(400).json({ error: error.message });
    }
    return sendRouteError(res, error, {
      route: 'ROUTE:PANEL_CONTENT:WRITE',
      fallbackMessage: 'Failed to save panel content',
    });
  }
});

export default router;
