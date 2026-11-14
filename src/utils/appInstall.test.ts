import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  detectInstallPlatform,
  resolveInstallAction,
} from './appInstall.ts';

test('detectInstallPlatform identifies iPhone, iPadOS, Android, and Desktop accurately', () => {
  assert.equal(
    detectInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15', 5),
    'ios'
  );
  assert.equal(
    detectInstallPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 5),
    'ios'
  );
  assert.equal(
    detectInstallPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36', 5),
    'android'
  );
  assert.equal(
    detectInstallPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0', 0),
    'desktop'
  );
});

test('resolveInstallAction selects native prompt, iOS guide, desktop fallback guide, or hidden when installed', () => {
  assert.equal(
    resolveInstallAction({ isInstalled: true, hasNativePrompt: true, platform: 'android' }),
    'hidden'
  );
  assert.equal(
    resolveInstallAction({ isInstalled: false, hasNativePrompt: true, platform: 'android' }),
    'native_prompt'
  );
  assert.equal(
    resolveInstallAction({ isInstalled: false, hasNativePrompt: true, platform: 'desktop' }),
    'native_prompt'
  );
  assert.equal(
    resolveInstallAction({ isInstalled: false, hasNativePrompt: false, platform: 'ios' }),
    'ios_guide'
  );
  assert.equal(
    resolveInstallAction({ isInstalled: false, hasNativePrompt: false, platform: 'desktop' }),
    'desktop_guide'
  );
});

test('manifest.json and sw.js exist with valid PWA fields and existing icon files on disk', () => {
  const manifestPath = path.resolve(process.cwd(), 'public/manifest.json');
  const swPath = path.resolve(process.cwd(), 'public/sw.js');

  assert.equal(fs.existsSync(manifestPath), true);
  assert.equal(fs.existsSync(swPath), true);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'Bangla AI');
  assert.equal(manifest.short_name, 'Bangla AI');
  assert.ok(manifest.short_name.length <= 12);
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.background_color, '#131314');
  assert.equal(manifest.theme_color, '#131314');

  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  assert.ok(sizes.includes('192x192'));
  assert.ok(sizes.includes('512x512'));

  for (const icon of manifest.icons) {
    const iconFile = path.resolve(process.cwd(), 'public', icon.src.replace(/^\//, ''));
    assert.equal(fs.existsSync(iconFile), true, `Missing manifest icon file: ${icon.src}`);
  }
  assert.equal(fs.existsSync(path.resolve(process.cwd(), 'public/apple-touch-icon.png')), true);
});
