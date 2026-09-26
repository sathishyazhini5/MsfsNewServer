import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const DATA_URL = 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/states.json';
const prisma = new PrismaClient();

const normalizeIsdCode = (value) => {
  const firstCode = String(value || '').split(',')[0].trim();
  return firstCode.split(/[-\s]/)[0].trim();
};

const getStableStateCode = (state) => {
  const isoCode = String(state.iso3166_2 || '').trim().toUpperCase();
  if (isoCode && isoCode.length <= 10) return isoCode;

  const countryCode = String(state.country_code || '').trim().toUpperCase();
  return `${countryCode}-${state.id}`.slice(0, 10);
};

const main = async () => {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`Failed to download subdivision dataset: HTTP ${response.status}`);
  }

  const sourceStates = await response.json();
  const countries = await prisma.countrymetadata.findMany({
    select: {
      alpha_2code: true,
      alpha_3code: true,
      ISD_code: true,
    },
  });

  const countryByAlpha2 = new Map(
    countries.map((country) => [country.alpha_2code.toUpperCase(), country]),
  );

  const importedStates = sourceStates.filter((state) => state.name && state.country_code);
  const unmatchedCountryCodes = new Set();
  const records = [];

  for (const state of importedStates) {
    const sourceCountryCode = String(state.country_code).toUpperCase();
    const country = countryByAlpha2.get(sourceCountryCode);

    if (!country) {
      unmatchedCountryCodes.add(sourceCountryCode);
      continue;
    }

    records.push({
      state_code: getStableStateCode(state),
      country_code: country.alpha_3code,
      province_code: 'ALL',
      state_name: String(state.name).trim(),
      ISD_code: normalizeIsdCode(country.ISD_code),
      language_code: 'en',
      concurrency_val: 1,
      created_by: 'system-state-import',
      created_date: new Date(),
      updated_by: null,
      updated_date: null,
    });
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const existing = await prisma.state_mst.findUnique({
      where: {
        state_code_country_code_province_code: {
          state_code: record.state_code,
          country_code: record.country_code,
          province_code: record.province_code,
        },
      },
      select: { state_name: true, ISD_code: true },
    });

    if (!existing) {
      await prisma.state_mst.create({ data: record });
      inserted += 1;
      continue;
    }

    if (existing.state_name !== record.state_name || existing.ISD_code !== record.ISD_code) {
      await prisma.state_mst.update({
        where: {
          state_code_country_code_province_code: {
            state_code: record.state_code,
            country_code: record.country_code,
            province_code: record.province_code,
          },
        },
        data: {
          state_name: record.state_name,
          ISD_code: record.ISD_code,
          updated_by: 'system-state-import',
          updated_date: new Date(),
        },
      });
      updated += 1;
    } else {
      skipped += 1;
    }
  }

  const countriesWithStates = new Set(records.map((record) => record.country_code));
  console.log(JSON.stringify({
    source_records: sourceStates.length,
    countries_matched: countriesWithStates.size,
    states_inserted: inserted,
    states_updated: updated,
    states_skipped: skipped,
    countries_unmatched: unmatchedCountryCodes.size,
    unmatched_country_codes: [...unmatchedCountryCodes].sort(),
  }, null, 2));
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
