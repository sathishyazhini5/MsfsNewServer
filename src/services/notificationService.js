import { Prisma } from '@prisma/client';

const provinceFilter = (provinceCodes, alias) => provinceCodes === null
  ? Prisma.empty
  : Prisma.sql`AND ${Prisma.raw(`${alias}."province_code"`)} IN (${Prisma.join(provinceCodes)})`;

const clean = (value) => String(value || '').replace(/<[^>]*>/g, '').trim();

export const getNotificationSummary = async ({ prisma, provinceCodes }) => {
  const personScope = provinceFilter(provinceCodes, 'p');
  const recordScope = provinceFilter(provinceCodes, 'r');

  const [birthdays, obituary, events, recentPosts] = await Promise.all([
    prisma.$queryRaw(Prisma.sql`
      SELECT p."confrer_code" AS id, p."province_code", pm."province_name",
             concat_ws(' ', p."first_name", p."middle_name", p."last_name") AS name,
             coalesce(q."quickcode_name", p."member_type_code") AS member_type,
             p."birth_date", 'confrere' AS person_type
      FROM "confreres_dtl" p
      LEFT JOIN "province_mst" pm ON pm."province_code" = p."province_code"
      LEFT JOIN "quickcode_mst" q ON q."quick_code" = p."member_type_code" AND q."quick_code_type" = 'memtyp'
      WHERE p."is_active" = true
        AND EXTRACT(MONTH FROM p."birth_date") = EXTRACT(MONTH FROM timezone('Asia/Kolkata', now()))
        AND EXTRACT(DAY FROM p."birth_date") = EXTRACT(DAY FROM timezone('Asia/Kolkata', now()))
        ${personScope}
      UNION ALL
      SELECT p."scholastic_code", p."province_code", pm."province_name",
             concat_ws(' ', p."first_name", p."middle_name", p."last_name"),
             coalesce(q."quickcode_name", p."member_type_code"), p."birth_date", 'scholastic'
      FROM "scholastics_dtl" p
      LEFT JOIN "province_mst" pm ON pm."province_code" = p."province_code"
      LEFT JOIN "quickcode_mst" q ON q."quick_code" = p."member_type_code" AND q."quick_code_type" = 'memtyp'
      WHERE p."is_active" = true
        AND EXTRACT(MONTH FROM p."birth_date") = EXTRACT(MONTH FROM timezone('Asia/Kolkata', now()))
        AND EXTRACT(DAY FROM p."birth_date") = EXTRACT(DAY FROM timezone('Asia/Kolkata', now()))
        ${personScope}
      ORDER BY name
    `),
    prisma.$queryRaw(Prisma.sql`
      SELECT r."obituary_code" AS id, r."province_code", pm."province_name",
             coalesce(nullif(r."disease_name", ''),
               concat_ws(' ', c."first_name", c."middle_name", c."last_name"),
               concat_ws(' ', s."first_name", s."middle_name", s."last_name")) AS name,
             r."death_date", r."death_place", r."remarks"
      FROM "obituary_dtl" r
      LEFT JOIN "province_mst" pm ON pm."province_code" = r."province_code"
      LEFT JOIN "confreres_dtl" c ON c."confrer_code" = r."confrer_scholastic_code" AND c."province_code" = r."province_code"
      LEFT JOIN "scholastics_dtl" s ON s."scholastic_code" = r."confrer_scholastic_code" AND s."province_code" = r."province_code"
      WHERE r."death_date" IS NOT NULL
        AND EXTRACT(MONTH FROM r."death_date") = EXTRACT(MONTH FROM timezone('Asia/Kolkata', now()))
        AND EXTRACT(DAY FROM r."death_date") = EXTRACT(DAY FROM timezone('Asia/Kolkata', now()))
        ${recordScope}
      ORDER BY name
    `),
    prisma.$queryRaw(Prisma.sql`
      SELECT r."event_id" AS id, r."province_code", pm."province_name", r."event_name" AS title,
             r."event_date", r."from_time", r."to_time", r."venue", r."event_detail" AS description
      FROM "event_dtl" r
      LEFT JOIN "province_mst" pm ON pm."province_code" = r."province_code"
      WHERE r."event_date"::date = timezone('Asia/Kolkata', now())::date
        ${recordScope}
      ORDER BY r."from_time" NULLS LAST, r."event_name"
    `),
    prisma.$queryRaw(Prisma.sql`
      SELECT r."anouncement_id" AS id, r."province_code", pm."province_name",
             r."anouncement_subjt" AS title, r."anouncement_dtl" AS description, r."created_date"
      FROM "announcements_dtl" r
      LEFT JOIN "province_mst" pm ON pm."province_code" = r."province_code"
      WHERE r."created_date" >= timezone('Asia/Kolkata', now()) - interval '7 days'
        ${recordScope}
      ORDER BY r."created_date" DESC NULLS LAST
      LIMIT 20
    `),
  ]);

  const normalizedPosts = recentPosts.map((item) => ({ ...item, title: clean(item.title), description: clean(item.description).slice(0, 180) }));
  const news = normalizedPosts.filter((item) => /\bnews\b/i.test(`${item.title} ${item.description}`));
  const announcements = normalizedPosts.filter((item) => !/\bnews\b/i.test(`${item.title} ${item.description}`));
  const groups = { birthdays, obituary, events, news, announcements };

  return {
    asOfDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()),
    totalCount: Object.values(groups).reduce((total, items) => total + items.length, 0),
    groups,
  };
};
