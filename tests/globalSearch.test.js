import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { searchGlobally } from '../src/services/globalSearchService.js';

test('global search never queries Appointments and preserves other categories, scope, counts and navigation', async () => {
  let captured;
  const row = (group, count, route) => ({ group_key: group, group_count: count, entity_type: group.toUpperCase(), record_id: 'R1', title: 'Name', route, navigation_state: { province_code: 'P1' } });
  const prisma = { $queryRaw: async (strings, ...values) => { captured = Prisma.sql(strings, ...values); return [row('priests', 14, '/confreresProfile'), row('centres', 2, '/viewcentredetails')]; } };
  const result = await searchGlobally({ prisma, query: 'Aroc_%', provinceCodes: ['P1'], user: {} });
  assert.doesNotMatch(captured.text, /appoint_transfer|APPOINTMENT|appointments|appointmentTransfer/);
  for (const table of ['confreres_dtl', 'scholastics_dtl', 'province_mst', 'centre_dtl', 'curia_advisors_dtl', 'scholastics_admisn_promon_dtl', 'event_dtl', 'announcements_dtl', 'country_mst', 'state_mst', 'apostolates_mst', 'departures_dtl', 'obituary_dtl']) assert.ok(captured.text.includes(table), table);
  assert.ok(captured.values.includes('P1'));
  assert.ok(captured.values.includes('%Aroc\\_\\%%'));
  assert.equal(result.total, 16);
  assert.equal(result.groups.priests.count, 14);
  assert.equal(result.groups.priests.results[0].route, '/confreresProfile');
  assert.deepEqual(result.groups.centres.results[0].navigationState, { province_code: 'P1' });
  assert.ok(!Object.hasOwn(result.groups, 'appointments'));
});
