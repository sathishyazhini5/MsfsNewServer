export function academicYear(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{4}$/.test(value.trim())) {
    throw Object.assign(new Error('academic_year must use YYYY-YYYY format.'), { status: 400 });
  }
  return value.trim();
}
