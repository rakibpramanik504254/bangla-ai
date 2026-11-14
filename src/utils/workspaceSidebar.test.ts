import test from 'node:test';
import assert from 'node:assert/strict';
import {
  partitionWorkspaceChats,
  resolveWorkspaceModelVisual,
  formatCompactTokens,
} from './workspaceSidebar.ts';
import { Chat } from '../types/index.ts';

const SAMPLE_CHATS: Chat[] = [
  {
    id: 'c1',
    user_id: 'u1',
    title: 'React Architecture Review',
    model_id: 'mod_claude',
    pinned: false,
    created_at: '2026-11-10T10:00:00.000Z',
    updated_at: '2026-11-10T12:00:00.000Z',
  },
  {
    id: 'c2',
    user_id: 'u1',
    title: 'বাংলা প্রবন্ধ খসড়া',
    model_id: 'mod_gemini',
    pinned: true,
    created_at: '2026-11-09T10:00:00.000Z',
    updated_at: '2026-11-09T15:00:00.000Z',
  },
  {
    id: 'c3',
    user_id: 'u1',
    title: 'PostgreSQL Query Tuning',
    model_id: 'mod_gpt',
    pinned: true,
    created_at: '2026-11-11T08:00:00.000Z',
    updated_at: '2026-11-11T09:00:00.000Z',
  },
  {
    id: 'c4',
    user_id: 'u1',
    title: 'Marketing Email Draft',
    model_id: 'mod_deepseek',
    pinned: false,
    created_at: '2026-11-12T08:00:00.000Z',
    updated_at: '2026-11-12T08:30:00.000Z',
  },
];

test('partitionWorkspaceChats splits pinned and recent sorted newest first', () => {
  const { pinnedChats, recentChats } = partitionWorkspaceChats(SAMPLE_CHATS, '');
  assert.deepEqual(
    pinnedChats.map((c) => c.id),
    ['c3', 'c2']
  );
  assert.deepEqual(
    recentChats.map((c) => c.id),
    ['c4', 'c1']
  );
});

test('partitionWorkspaceChats filters titles case-insensitively including Bengali text', () => {
  const english = partitionWorkspaceChats(SAMPLE_CHATS, '  react ');
  assert.deepEqual(english.pinnedChats, []);
  assert.deepEqual(
    english.recentChats.map((c) => c.id),
    ['c1']
  );

  const bengali = partitionWorkspaceChats(SAMPLE_CHATS, 'বাংলা');
  assert.deepEqual(
    bengali.pinnedChats.map((c) => c.id),
    ['c2']
  );
  assert.deepEqual(bengali.recentChats, []);
});

test('resolveWorkspaceModelVisual maps known providers to local SVG icons', () => {
  assert.equal(
    resolveWorkspaceModelVisual({
      id: 'm1',
      provider_id: 'p1',
      model_name: 'claude-3-5-sonnet',
      display_name: 'Claude Fable 5.2 (max)',
    })?.iconSrc,
    '/assets/aistudio/calc-claude_2a15ea2f.svg'
  );

  assert.equal(
    resolveWorkspaceModelVisual({
      id: 'm2',
      provider_id: 'p2',
      model_name: 'gemini-2.5-flash',
      display_name: 'Gemini 4 Carbon (high)',
    })?.iconSrc,
    '/assets/aistudio/calc-gemini_221ee978.svg'
  );

  const openai = resolveWorkspaceModelVisual({
    id: 'm3',
    provider_id: 'p3',
    model_name: 'gpt-4o',
    display_name: 'GPT-6 Astra (max)',
  });
  assert.equal(openai?.iconSrc, '/assets/aistudio/calc-openai_c4f23f92.svg');
  assert.equal(openai?.invertDark, true);

  assert.equal(
    resolveWorkspaceModelVisual({
      id: 'm4',
      provider_id: 'p4',
      model_name: 'deepseek-chat',
      display_name: 'DeepSeek V4.1 Flash',
    })?.iconSrc,
    '/assets/aistudio/calc-deepseek_729ceac7.svg'
  );

  assert.equal(
    resolveWorkspaceModelVisual({
      id: 'm5',
      provider_id: 'p5',
      model_name: 'custom-local-llama',
      display_name: 'Custom Model',
    }),
    null
  );
});

test('formatCompactTokens formats counts cleanly without negative values', () => {
  assert.equal(formatCompactTokens(-50), '0');
  assert.equal(formatCompactTokens(850), '850');
  assert.equal(formatCompactTokens(42500), '42.5K');
  assert.equal(formatCompactTokens(995150), '995K');
  assert.equal(formatCompactTokens(1000000), '1M');
});
