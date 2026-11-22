import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_NAV_GROUPS,
  ALL_ADMIN_NAV_ITEMS,
  getAdminNavItem
} from './adminConsoleNav.ts';

describe('adminConsoleNav', () => {
  it('defines unique grouped sections with the right settings in the right tab', () => {
    const ids = ALL_ADMIN_NAV_ITEMS.map(item => item.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(ADMIN_NAV_GROUPS.length, 5);

    const mfs = getAdminNavItem('mfs');
    assert.equal(mfs.groupId, 'billing');
    assert.equal(mfs.label, 'MFS Gateways');

    const models = getAdminNavItem('models');
    assert.equal(models.groupId, 'ai');

    const devApi = getAdminNavItem('developer_api');
    assert.equal(devApi.groupId, 'ai');
    assert.equal(devApi.label, 'Developer API Keys');

    const pixel = getAdminNavItem('pixel');
    assert.equal(pixel.groupId, 'integrations');

    const email = getAdminNavItem('email');
    assert.equal(email.groupId, 'integrations');

    const seo = getAdminNavItem('seo');
    assert.equal(seo.groupId, 'integrations');
  });
});
