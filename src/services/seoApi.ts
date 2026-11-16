import {
  normalizePageSlug,
  type DynamicPageSeoLookupResult,
  type PageSeoConfig,
} from '../utils/seoController.ts';

export interface AdminSeoPagesResponse {
  pages: PageSeoConfig[];
}

export interface SaveAdminSeoPageResponse {
  success: boolean;
  config: PageSeoConfig;
  pages: PageSeoConfig[];
}

export interface DeleteAdminSeoPageResponse {
  success: boolean;
  deletedSlug: string;
  pages: PageSeoConfig[];
}

async function parseApiError(res: Response, fallbackMessage: string): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data.error === 'string' && data.error.trim()) {
      return data.error.trim();
    }
  } catch {
    // Ignore non-JSON error responses
  }
  return fallbackMessage;
}

export async function fetchAdminPageSeoConfigs(token: string): Promise<PageSeoConfig[]> {
  const res = await fetch('/api/admin/seo/pages', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Failed to load per-page SEO configurations.'));
  }
  const data: AdminSeoPagesResponse = await res.json();
  return Array.isArray(data.pages) ? data.pages : [];
}

export async function saveAdminPageSeoConfig(
  token: string,
  config: PageSeoConfig
): Promise<SaveAdminSeoPageResponse> {
  const res = await fetch('/api/admin/seo/pages', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Failed to save SEO configuration.'));
  }
  return res.json();
}

export async function resetAdminPageSeoConfig(
  token: string,
  slug: string
): Promise<SaveAdminSeoPageResponse> {
  const normalizedSlug = normalizePageSlug(slug);
  const res = await fetch('/api/admin/seo/pages/reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ slug: normalizedSlug }),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Failed to reset page SEO configuration.'));
  }
  return res.json();
}

export async function deleteAdminPageSeoConfig(
  token: string,
  slug: string
): Promise<DeleteAdminSeoPageResponse> {
  const normalizedSlug = normalizePageSlug(slug);
  const res = await fetch(
    `/api/admin/seo/pages?slug=${encodeURIComponent(normalizedSlug)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Failed to delete custom SEO route.'));
  }
  return res.json();
}

export async function fetchPublicPageSeoBySlug(
  slug: string = '/'
): Promise<DynamicPageSeoLookupResult> {
  const normalizedSlug = normalizePageSlug(slug);
  const res = await fetch(`/api/seo/page?slug=${encodeURIComponent(normalizedSlug)}`);
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Failed to fetch SEO metadata for route.'));
  }
  return res.json();
}
