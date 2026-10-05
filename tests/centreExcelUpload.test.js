import test from 'node:test';
import assert from 'node:assert/strict';
import { saveCentreExcelRow } from '../src/utils/centreExcelUpload.js';

const row = {
  'Division Type': ' Region ', 'Name of the Division': 'North', 'Apostolate Name': 'Education',
  'Center Type': 'School', 'Community House': 'Home', Diocese: 'Diocese',
  'Name of the Center': 'Centre', 'Place of the Center': 'Town', 'Address 1': 'Street',
  'Address 2': 'Town', Country: 'India', State: 'State', 'City/District': 'City',
  'Pin / Zipcode': 123456, 'Personal1 ISD': '+91', 'Personal1 Contact': '1234567890',
  'Office MailId 1': 'office@example.com',
};
const context = { provinceCode: 'P01', provinceCodes: ['P01'], createdBy: 'tester' };
function database(failCentre = false) {
  let tables = {
    province_mst: [{ province_code: 'P01' }],
    country_mst: [{ province_code: 'P01', country_name: ' India ', country_code: 'IN' }],
    state_mst: [{ province_code: 'P01', country_code: 'IN', state_name: 'State', state_code: 'ST' }],
    quickcode_mst: [{ quick_code_type: 'divtyp', quick_code: 'D001', quickcode_name: ' REGION ' },
      { quick_code_type: 'other', quick_code: 'D001', quickcode_name: 'Education' }],
    division_setup_mst: [{ province_code: 'P01', division_type_code: 'D001', division_code: 'DIV', division_name: 'North' }],
    community_house_dtl: [], apostolates_mst: [], centre_dtl: [],
  };
  return {
    get tables() { return tables; },
    async $transaction(callback, options) {
      assert.equal(options.isolationLevel, 'Serializable');
      const pending = structuredClone(tables);
      const db = Object.fromEntries(Object.keys(pending).map(model => [model, {
        async findMany({ where = {} } = {}) {
          return pending[model].filter(record => Object.entries(where).every(([key, value]) => record[key] === value));
        },
        async findFirst(args) { return (await this.findMany(args))[0]; },
        async findUnique(args) { return this.findFirst(args); },
        async create({ data }) {
          if (model === 'centre_dtl' && failCentre) throw new Error('Centre save failed');
          pending[model].push(data);
          return data;
        },
      }]));
      const result = await callback(db);
      tables = pending;
      return result;
    },
  };
}

test('creates correct categories, scoped mapping and house; reuses normalized names', async () => {
  const db = database();
  await saveCentreExcelRow(db, row, context);
  await saveCentreExcelRow(db, { ...row, 'Name of the Center': ' CENTRE ', 'Personal1 Contact': '1234567891', 'Apostolate Name': ' education ', 'Community House': ' HOME ' }, context);
  assert.equal(db.tables.quickcode_mst.length, 5);
  assert.equal(db.tables.community_house_dtl.length, 1);
  assert.equal(db.tables.apostolates_mst.length, 1);
  assert.equal(db.tables.centre_dtl.length, 2);
  const centre = db.tables.centre_dtl[0];
  assert.equal(centre.apostolate_code, db.tables.quickcode_mst.find(q => q.quick_code_type === 'apostl').quick_code);
  assert.equal(centre.community_house_code, 'CH001P01');
  await assert.rejects(saveCentreExcelRow(db, { ...row, 'Name of the Center': 'Different', 'Office MailId 1': 'different@example.com', 'Personal1 Contact': ' 01234567890 ' }, context), /Personal1 Contact .* already exists/);
  assert.equal(db.tables.centre_dtl.length, 2);
});

test('failed centre rolls back all newly created masters and mappings', async () => {
  const db = database(true);
  await assert.rejects(saveCentreExcelRow(db, row, context), /Centre save failed/);
  assert.equal(db.tables.quickcode_mst.length, 2);
  assert.equal(db.tables.community_house_dtl.length, 0);
  assert.equal(db.tables.apostolates_mst.length, 0);
});

test('missing required values, invalid numbers and unauthorized provinces fail', async () => {
  const db = database();
  await assert.rejects(saveCentreExcelRow(db, { ...row, 'Address 1': '  ' }, context), /Missing required fields: Address 1/);
  await assert.rejects(saveCentreExcelRow(db, { ...row, 'Pin / Zipcode': '123abc' }, context), /whole number/);
  await assert.rejects(saveCentreExcelRow(db, row, { ...context, provinceCodes: ['P02'] }), /authorized scope/);
  assert.equal(db.tables.centre_dtl.length, 0);
});

test('Excel resolves Tamilnadu to global Tamil Nadu without creating a state', async () => {
  const db = database();
  db.tables.state_mst[0] = { province_code: 'ALL', country_code: 'IN', state_name: 'Tamil Nadu', state_code: 'IN-TN' };
  await saveCentreExcelRow(db, { ...row, State: 'Tamilnadu' }, context);
  assert.equal(db.tables.centre_dtl[0].state_code, 'IN-TN');
  assert.equal(db.tables.state_mst.length, 1);
});

test('missing scoped division is created from the supplied name and reused', async () => {
  const db = database();
  db.tables.division_setup_mst.length = 0;
  await saveCentreExcelRow(db, row, context);
  await saveCentreExcelRow(db, { ...row, 'Name of the Center': 'Second', 'Personal1 Contact': '1234567891' }, context);
  assert.equal(db.tables.division_setup_mst.length, 1);
  assert.equal(db.tables.division_setup_mst[0].division_code, 'D1');
  assert.equal(db.tables.centre_dtl[0].division_code, 'D1');
  assert.equal(db.tables.community_house_dtl.length, 1);
});
