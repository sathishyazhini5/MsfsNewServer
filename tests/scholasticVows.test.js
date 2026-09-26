import test from 'node:test';
import assert from 'node:assert/strict';
import { scholasticVowsWhere, countScholasticVows } from '../src/utils/scholasticVows.js';

const date = new Date('2025-01-01');
const rows = [
  { province_code: 'P1', is_active: true, first_profession_date: date, final_profession_date: null },
  { province_code: 'P1', is_active: true, first_profession_date: date, final_profession_date: date },
  { province_code: 'P1', is_active: true, first_profession_date: null, final_profession_date: date },
  { province_code: 'P1', is_active: true, first_profession_date: null, final_profession_date: null },
  { province_code: 'P1', is_active: false, first_profession_date: date, final_profession_date: null },
  { province_code: 'P2', is_active: true, first_profession_date: date, final_profession_date: null },
];
const matches = (row, where) => Object.entries(where).every(([key, value]) => {
  if (value && typeof value === 'object') {
    if ('not' in value) return row[key] !== value.not;
    if ('in' in value) return value.in.includes(row[key]);
  }
  return row[key] === value;
});
const prisma = { scholastics_dtl: { count: async ({ where }) => rows.filter(row => matches(row, where)).length } };

test('first profession is temporary; final profession takes precedence, including final-only records', () => {
  const temporary = rows.filter(row => matches(row, scholasticVowsWhere('SCHOLASTIC_TEMPORARY')));
  const perpetual = rows.filter(row => matches(row, scholasticVowsWhere('SCHOLASTIC_PERPETUAL')));
  assert.deepEqual(temporary, [rows[0], rows[5]]);
  assert.deepEqual(perpetual, [rows[1], rows[2]]);
  assert.equal(temporary.some(row => perpetual.includes(row)), false);
});
test('province totals exclude other provinces, inactive and unprofessed records', async () => {
  assert.deepEqual(await countScholasticVows(prisma, {province_code:'P1'}), {firstProfessionCount:1,finalProfessionCount:2});
});
test('congregation and all-province scopes use the same classification', async () => {
  assert.deepEqual(await countScholasticVows(prisma, {province_code:{in:['P2']}}), {firstProfessionCount:1,finalProfessionCount:0});
  assert.deepEqual(await countScholasticVows(prisma), {firstProfessionCount:2,finalProfessionCount:2});
  assert.deepEqual(await countScholasticVows(prisma, {province_code:{in:[]}}), {firstProfessionCount:0,finalProfessionCount:0});
});
test('saving final profession moves the person out of temporary vows', () => {
  const updated = {...rows[0], final_profession_date:date};
  assert.equal(matches(updated, scholasticVowsWhere('SCHOLASTIC_TEMPORARY')), false);
  assert.equal(matches(updated, scholasticVowsWhere('SCHOLASTIC_PERPETUAL')), true);
});
