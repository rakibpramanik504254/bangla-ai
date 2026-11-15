export interface ScrollableLike {
  scrollTop: number;
  scrollLeft?: number;
}

export interface ScrollTargetWindow {
  scrollTo: {
    (options?: ScrollToOptions): void;
    (x: number, y: number): void;
  };
}

export interface ScrollTargetDocument {
  documentElement?: ScrollableLike | null;
  body?: ScrollableLike | null;
  querySelectorAll?: (selectors: string) => Iterable<ScrollableLike>;
}

/**
 * Immediately jumps window, document root, body, and any scrollable layout
 * containers to (0, 0) without smooth-scroll lag.
 */
export function resetScrollPosition(
  win: ScrollTargetWindow | undefined = typeof window !== 'undefined' ? window : undefined,
  doc: ScrollTargetDocument | undefined = typeof document !== 'undefined' ? document : undefined
): void {
  if (win && typeof win.scrollTo === 'function') {
    try {
      win.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    } catch {
      win.scrollTo(0, 0);
    }
  }

  if (!doc) return;

  if (doc.documentElement) {
    doc.documentElement.scrollTop = 0;
    if (typeof doc.documentElement.scrollLeft === 'number') {
      doc.documentElement.scrollLeft = 0;
    }
  }

  if (doc.body) {
    doc.body.scrollTop = 0;
    if (typeof doc.body.scrollLeft === 'number') {
      doc.body.scrollLeft = 0;
    }
  }

  if (typeof doc.querySelectorAll === 'function') {
    const containers = doc.querySelectorAll('.overflow-y-auto, [data-scroll-container]');
    for (const el of containers) {
      el.scrollTop = 0;
    }
  }
}
