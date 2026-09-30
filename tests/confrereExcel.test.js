import test from 'node:test';
import assert from 'node:assert/strict';
import xlsx from 'xlsx';
import { readConfrereExcelRows } from '../src/utils/confrereExcel.js';
const workbook = (...sheets) => {
  const book = xlsx.utils.book_new();
  sheets.forEach((rows, i) => xlsx.utils.book_append_sheet(book, xlsx.utils.aoa_to_sheet(rows), `Sheet${i}`));
  return xlsx.write(book, { type: 'buffer', bookType: 'xlsx' });
};
test('reads template rows and normalizes header whitespace', () => {
  const rows = readConfrereExcelRows(workbook([[' First  Name ', 'Province'], ['Example', 'P1']]));
  assert.equal(rows[0]['First Name'], 'Example');
  assert.equal(rows[0].Province, 'P1');
});
test('skips an instructions sheet before the data sheet', () => {
  const rows = readConfrereExcelRows(workbook([['Instructions'], ['Use template']], [['First Name'], ['Example']]));
  assert.equal(rows.length, 1);
  assert.equal(rows[0]['First Name'], 'Example');
});
test('rejects empty templates and missing headers with a useful error', () => {
  assert.throws(() => readConfrereExcelRows(workbook([['First Name']])), /at least one data row/);
  assert.throws(() => readConfrereExcelRows(workbook([['Wrong header'], ['Example']])), /First Name column/);
});
