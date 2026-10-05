// Read-only checks against the configured database. Never prints personal records or credentials.
import '../src/config/index.js';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../src/config/index.js';
import { estatusRouter } from '../src/routes/estatus.js';
import { ConfrereRouter } from '../src/routes/Msfs/Confreres.js';
import { CentreRouter2 } from '../src/routes/Msfs/centre.js';
import { ObituaryRouter } from '../src/routes/Msfs/obituary.js';
import { fetchDirectory, loadDirectoryOptions } from '../src/services/estatusService.js';

const prisma = new PrismaClient();
const samples = {};
const totals = {};
try {
  const province = await prisma.province_mst.findFirst({ where: { NOT: { province_code: 'ALL' } }, select: { province_code: true } });
  for (const kind of ['confrere', 'centre', 'obituary']) {
    const first = await fetchDirectory(prisma, kind, { mode: 'all', page: 1, pageSize: 2 }, null);
    samples[kind] = first.data[0];
    totals[kind] = first.total;
    assert.ok(first.data.length <= 2);
    const scope = [province.province_code];
    const scoped = await fetchDirectory(prisma, kind, { mode: 'all', page: 1, pageSize: 2 }, scope);
    assert.ok(scoped.data.every((row) => scope.includes(row.province_code)));
    const denied = await fetchDirectory(prisma, kind, { mode: 'all', page: 1, pageSize: 2 }, []);
    assert.equal(denied.total, 0);
    const options = await loadDirectoryOptions(prisma, kind, null, {});
    for (const [field, choices] of Object.entries(options)) {
      if (!choices.length) continue;
      const filters = { mode: 'all', page: 1, pageSize: 2, [field]: choices[0].value };
      const filtered = await fetchDirectory(prisma, kind, filters, null);
      assert.ok(filtered.total <= first.total);
      console.log(`${kind}: ${field} filtering OK`);
    }
    if (first.data[0]?.name) {
      const searched = await fetchDirectory(prisma, kind, { mode: 'all', page: 1, pageSize: 2, search: first.data[0].name }, null);
      assert.ok(searched.total > 0);
    }
    if (first.total > 2) {
      const next = await fetchDirectory(prisma, kind, { mode: 'all', page: 2, pageSize: 2 }, null);
      assert.equal(next.total, first.total);
      const identity = (r) => JSON.stringify([r.code, r.province_code, r.division_type_code, r.division_code]);
      assert.ok(next.data.every((r) => !first.data.some((f) => identity(r) === identity(f))));
    }
    console.log(`${kind}: real records, counts, search, pagination and province isolation OK (${first.total} total)`);
  }
  const today = await fetchDirectory(prisma, 'obituary', { page: 1, pageSize: 20 }, null);
  const boundary = await prisma.$queryRaw`SELECT ('2026-10-04 18:29:59+00'::timestamptz AT TIME ZONE 'Asia/Kolkata')::date::text AS before, ('2026-10-04 18:30:00+00'::timestamptz AT TIME ZONE 'Asia/Kolkata')::date::text AS after`;
  assert.equal(boundary[0].before, '2026-10-04');
  assert.equal(boundary[0].after, '2026-10-05');
  const expected = await prisma.$queryRaw`SELECT count(*)::int AS total FROM obituary_dtl WHERE death_date::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date`;
  assert.equal(today.total, expected[0].total);
  const allObituaries = await fetchDirectory(prisma, 'obituary', { mode: 'all', page: 1, pageSize: 100 }, null);
  assert.ok(allObituaries.data.every((r) => r.name && r.name !== r.code));
  const dated = allObituaries.data.find((r) => r.death_date);
  if (dated) {
    const date = dated.death_date.toISOString().slice(0, 10);
    const selectedDate = await fetchDirectory(prisma, 'obituary', { death_date: date, mode: 'all', page: 1, pageSize: 100 }, null);
    assert.ok(selectedDate.total > 0 && selectedDate.data.every((r) => r.death_date.toISOString().slice(0, 10) === date));
  }
  console.log(`Obituary: India today default (${today.total}), all-dates names and selected death date OK`);
  const app = express();
  app.use('/api', estatusRouter);
  app.use('/api', ConfrereRouter, CentreRouter2, ObituaryRouter);
  const server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  try {
    const base = `http://127.0.0.1:${server.address().port}/api/estatus`;
    const headers = { Authorization: `Bearer ${jwt.sign({ role_name: 'Province Admin', province_code: province.province_code }, JWT_SECRET, { expiresIn: '2m' })}` };
    for (const kind of ['confrere', 'centre', 'obituary']) {
      assert.equal((await fetch(`${base}/${kind}`)).status, 401);
      const response = await fetch(`${base}/${kind}?pageSize=2${kind === 'obituary' ? '&mode=all' : ''}`, { headers });
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.total, totals[kind], `${kind}: province admin sees global count`);
      const optionsResponse = await fetch(`${base}/${kind}/filters`, { headers });
      assert.equal(optionsResponse.status, 200);
      const options = (await optionsResponse.json()).options;
      assert.ok(options.province_code.length > 1, `${kind}: global province options`);
      const selected = options.province_code.find((p) => p.value !== province.province_code).value;
      const filtered = await fetch(`${base}/${kind}?province_code=${selected}${kind === 'obituary' ? '&mode=all' : ''}`, { headers });
      assert.equal(filtered.status, 200);
      assert.ok((await filtered.json()).data.every((r) => r.province_code === selected));
      const ordinaryPath = { confrere: 'getAllConfreres', centre: 'getcenterdetails', obituary: 'getAllObituaryData' }[kind];
      const ordinary = await fetch(`${base.replace('/estatus', '')}/${ordinaryPath}`, { headers });
      assert.equal(ordinary.status, 200);
      const scopedBody = await ordinary.json();
      const scopedRows = Array.isArray(scopedBody) ? scopedBody : scopedBody.data;
      assert.ok(scopedRows.every((r) => r.province_code === province.province_code), `${kind}: ordinary list remains province restricted`);
    }
    assert.equal((await fetch(`${base}/confrere?province_code=FORBIDDEN`, { headers })).status, 400);
    assert.equal((await fetch(`${base}/centre?pageSize=999`, { headers })).status, 400);
    const unsupported = { Authorization: `Bearer ${jwt.sign({ role_name: 'Member' }, JWT_SECRET)}` };
    assert.equal((await fetch(`${base}/confrere`, { headers: unsupported })).status, 403);
    assert.equal((await fetch(`${base}/confrere`, { headers: { Authorization: 'Bearer invalid' } })).status, 401);
    console.log('HTTP APIs: global lists/counts/options for province admin, optional foreign province filters, invalid parameters/tokens and unsupported roles OK');
    const admin = { Authorization: `Bearer ${jwt.sign({ role_name: 'Super Admin' }, JWT_SECRET, { expiresIn: '2m' })}` };
    const paths = { confrere: 'getConfrereData', centre: 'centre-view', obituary: 'getObituary' };
    for (const [kind, row] of Object.entries(samples)) {
      if (!row) continue;
      const query = new URLSearchParams({ province_code: row.province_code, ...(kind === 'centre' ? { division_type_code: row.division_type_code, division_code: row.division_code } : kind === 'obituary' ? { confrer_scholastic_code: row.confrer_scholastic_code } : {}) });
      const response = await fetch(`${base.replace('/estatus', '')}/${paths[kind]}/${encodeURIComponent(row.code)}?${query}`, { headers: admin });
      assert.equal(response.status, 200, `${kind} existing profile endpoint`);
      const detail = await response.json();
      assert.ok(kind === 'centre' ? detail.length === 1 : !!detail);
      const foreignProvince = await prisma.province_mst.findFirst({ where: { province_code: { notIn: ['ALL', row.province_code] } }, select: { province_code: true } });
      if (foreignProvince) {
        const foreign = { Authorization: `Bearer ${jwt.sign({ role_name: 'Province Admin', province_code: foreignProvince.province_code }, JWT_SECRET, { expiresIn: '2m' })}` };
        const denied = await fetch(`${base.replace('/estatus', '')}/${paths[kind]}/${encodeURIComponent(row.code)}?${query}`, { headers: foreign });
        assert.ok([403, 404].includes(denied.status), `${kind} profile denies foreign province`);
        const global = await fetch(`${base}/${kind}/record/${encodeURIComponent(row.code)}?${query}`, { headers: foreign });
        assert.equal(global.status, 200, `${kind}: eStatus permits foreign record`);
        const profile = await global.json();
        const value = kind === 'centre' ? profile[0] : profile;
        assert.equal(value.province_code, row.province_code);
        if (kind === 'confrere') {
          const assignments = await prisma.appoint_transfer_dtl.findMany({ where: { confrer_code: row.code, is_active: true, designation_end_date: null } });
          const names = [];
          for (const a of assignments) {
            const centre = await prisma.centre_dtl.findFirst({ where: { province_code: a.province_code, division_type_code: a.division_type_code, division_code: a.division_code, centre_code: a.centre_code }, select: { centre_name: true } });
            if (centre?.centre_name) names.push(centre.centre_name);
          }
          assert.equal(value.current_centre_name, [...new Set(names)].join('; ') || 'Not assigned');
          console.log('Confrere: current Centre mapping matches live compound assignments');
        }
        if (kind === 'obituary') assert.equal(value.deceased_name, row.name);
        assert.equal(value[{ confrere: 'confrer_code', centre: 'centre_code', obituary: 'obituary_code' }[kind]], row.code);
        assert.equal((await fetch(`${base}/${kind}/record/${row.code}`, { headers: foreign })).status, 400);
        assert.equal((await fetch(`${base}/${kind}/record/${row.code}?${query}`, { method: 'POST', headers: foreign })).status, 404);
      }
      console.log(`${kind}: exact cross-province eStatus profile OK; ordinary profile restrictions and read-only routing unchanged`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
} catch (error) {
  console.error('Database verification failed:', error.name, error.code || '', error.message.split('\n').slice(-1)[0]);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
// The imported route owns its own Prisma pool; exit after all checks complete.
process.exit(process.exitCode || 0);
