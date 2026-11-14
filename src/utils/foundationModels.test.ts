import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CURATED_FOUNDATION_MODELS,
  CURATED_MODEL_MAP,
  buildMarqueeRows,
} from './foundationModels.ts';

test('CURATED_FOUNDATION_MODELS has all 10 models with existing public logo assets', () => {
  assert.equal(CURATED_FOUNDATION_MODELS.length, 10);

  for (const model of CURATED_FOUNDATION_MODELS) {
    assert.ok(model.name.length > 0);
    assert.ok(model.iconSrc.startsWith('/assets/aistudio/'));
    const diskPath = path.resolve(process.cwd(), 'public', model.iconSrc.replace(/^\//, ''));
    assert.equal(fs.existsSync(diskPath), true, `Missing asset on disk: ${diskPath}`);
    assert.equal(CURATED_MODEL_MAP[model.id]?.name, model.name);
  }
});

test('buildMarqueeRows outputs 3 rows with strict right -> left -> right directions', () => {
  const rows = buildMarqueeRows();
  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((r) => r.direction),
    ['right', 'left', 'right']
  );

  const coveredIds = new Set<string>();
  for (const row of rows) {
    assert.ok(row.durationSeconds >= 35 && row.durationSeconds <= 45);
    assert.ok(row.halfTrackItems.length >= 10, 'Half-track should be wide enough to prevent desktop gaps');
    for (const item of row.halfTrackItems) {
      coveredIds.add(item.id);
    }
  }

  for (const model of CURATED_FOUNDATION_MODELS) {
    assert.equal(coveredIds.has(model.id), true, `Model missing from marquee: ${model.name}`);
  }
});
