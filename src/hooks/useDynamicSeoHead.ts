import { useEffect } from 'react';
import { fetchPublicPageSeoBySlug } from '../services/seoApi.ts';
import type { AppView } from '../utils/navigation.ts';
import {
  applyAppViewFallbackOverrides,
  applyResolvedSeoToDocument,
  buildOptimisticPageSeoFallback,
  resolveActiveSeoSlug,
  type HeadDocumentLike,
} from '../utils/seoHead.ts';

export function useDynamicSeoHead(view: AppView, pathname: string): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const headDoc = document as unknown as HeadDocumentLike;
    const activeSlug = resolveActiveSeoSlug(view, pathname);
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : undefined;

    // 1. Apply immediate route preset / fallback synchronously to eliminate title lag
    const optimistic = buildOptimisticPageSeoFallback(activeSlug, view, origin);
    applyResolvedSeoToDocument(headDoc, optimistic);

    // 2. Fetch live DB-backed per-page SEO config from Step 2 API (/api/seo/page)
    let cancelled = false;
    fetchPublicPageSeoBySlug(activeSlug)
      .then((lookup) => {
        if (cancelled) return;
        const finalResolved = applyAppViewFallbackOverrides(
          lookup.resolved,
          view,
          lookup.matchedExact
        );
        applyResolvedSeoToDocument(headDoc, finalResolved);
      })
      .catch(() => {
        // Keep optimistic fallback if network call fails cleanly
      });

    return () => {
      cancelled = true;
    };
  }, [view, pathname]);
}
