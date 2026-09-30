import xlsx from 'xlsx';

export const readConfrereExcelRows = (buffer) => {
  let workbook;
  try { workbook = xlsx.read(buffer, { type: 'buffer' }); }
  catch { throw new Error('Unable to read this Excel file. Save it as .xlsx or .xls and try again.'); }
  const normalize = value => String(value ?? '').trim().replace(/\s+/g, ' ');
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet['!ref']) continue;
    const table = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: true });
    const headerIndex = table.findIndex(row => row.some(value => normalize(value) === 'First Name'));
    if (headerIndex < 0) continue;
    const headers = table[headerIndex].map(normalize);
    const seen = new Set();
    for (const header of headers.filter(Boolean)) {
      if (seen.has(header)) throw new Error(`Header '${header}' occurs more than once. Correct the columns before importing.`);
      seen.add(header);
    }
    const offset = xlsx.utils.decode_range(sheet['!ref']).s.r;
    const rows = table.slice(headerIndex + 1).flatMap((values, index) => {
      if (values.every(value => value == null || value === '')) return [];
      const row = Object.fromEntries(headers.filter(Boolean).map(header => [header, values[headers.indexOf(header)] ?? null]));
      const extra = values.findIndex((value, col) => !headers[col] && value != null && value !== '');
      Object.defineProperties(row, {
        __rowNum__: { value: offset + headerIndex + index + 1 },
        __date1904__: { value: workbook.Workbook?.WBProps?.date1904 === true || workbook.Workbook?.WBProps?.date1904 === 1 },
        __mappingError__: { value: extra >= 0 ? `Column ${xlsx.utils.encode_col(extra)}: contains data without a header; check for shifted columns.` : null },
      });
      return [row];
    });
    if (rows.length) return rows;
  }
  throw new Error('No Confreres data found. Use the downloaded template with a First Name column in the header row and at least one data row.');
};
