import { Prisma } from '@prisma/client';

const QUICK_LIMIT = 6;

const scopeClause = (alias, provinceCodes) => provinceCodes === null
  ? Prisma.sql`TRUE`
  : Prisma.sql`${Prisma.raw(`${alias}."province_code"`)} IN (${Prisma.join(provinceCodes)})`;

const match = (parts, pattern) => Prisma.sql`concat_ws(' ', ${Prisma.join(parts)}) ILIKE ${pattern}`;

export const searchGlobally = async ({ prisma, query, provinceCodes, user }) => {
  const escaped = query.replace(/[\\%_]/g, '\\$&');
  const pattern = `%${escaped}%`;
  const confrereScope = scopeClause('c', provinceCodes);
  const scholasticScope = scopeClause('s', provinceCodes);
  const provinceScope = scopeClause('p', provinceCodes);
  const divisionScope = scopeClause('d', provinceCodes);
  const centreScope = scopeClause('ct', provinceCodes);
  const headquartersScope = scopeClause('h', provinceCodes);
  const communityScope = scopeClause('ch', provinceCodes);
  const appointmentScope = scopeClause('ap', provinceCodes);
  const curiaScope = scopeClause('ca', provinceCodes);
  const admissionScope = scopeClause('sa', provinceCodes);
  const eventScope = scopeClause('e', provinceCodes);
  const announcementScope = scopeClause('a', provinceCodes);
  const countryScope = scopeClause('co', provinceCodes);
  const stateScope = scopeClause('st', provinceCodes);
  const apostolateScope = scopeClause('apo', provinceCodes);
  const departureScope = scopeClause('dep', provinceCodes);
  const obituaryScope = scopeClause('ob', provinceCodes);
  const congregationClause = provinceCodes === null
    ? Prisma.sql`TRUE`
    : Prisma.sql`cg."concretion_code" = ${user.concretion_code || '__NONE__'}`;

  const rows = await prisma.$queryRaw`
    WITH search_results AS (
      SELECT
        CASE
          WHEN upper(coalesce(mt."quickcode_name", '')) LIKE '%PRIEST%' THEN 'priests'
          WHEN upper(coalesce(mt."quickcode_name", '')) LIKE '%BROTHER%' THEN 'religiousBrothers'
          ELSE 'confreres'
        END AS group_key,
        'CONFRERE' AS entity_type,
        c."confrer_code" AS record_id,
        btrim(concat_ws(' ', c."first_name", c."middle_name", c."last_name")) AS title,
        p."province_name" AS subtitle,
        coalesce(c."personal1_contact_no"::text, c."personal_mailid1") AS secondary_text,
        '/confreresProfile' AS route,
        jsonb_build_object('confrer_code', c."confrer_code", 'province_code', c."province_code") AS navigation_state
      FROM "confreres_dtl" c
      JOIN "province_mst" p ON p."province_code" = c."province_code"
      LEFT JOIN "quickcode_mst" mt ON mt."quick_code" = c."member_type_code"
        AND mt."quick_code_type" IN ('memtyp', 'memtype')
      WHERE ${confrereScope} AND ${match([
        Prisma.sql`c."first_name"`, Prisma.sql`c."middle_name"`, Prisma.sql`c."last_name"`,
        Prisma.sql`c."personal1_contact_no"::text`, Prisma.sql`c."personal_mailid1"`,
        Prisma.sql`p."province_name"`, Prisma.sql`p."short_name"`, Prisma.sql`mt."quickcode_name"`
      ], pattern)}

      UNION ALL
      SELECT 'scholastics', 'SCHOLASTIC', s."scholastic_code",
        btrim(concat_ws(' ', s."first_name", s."middle_name", s."last_name")),
        p."province_name", coalesce(s."personal1_contact_no"::text, s."personal_mailid1"),
        '/scholasticsProfile', jsonb_build_object('scholastic_code', s."scholastic_code", 'province_code', s."province_code")
      FROM "scholastics_dtl" s
      JOIN "province_mst" p ON p."province_code" = s."province_code"
      LEFT JOIN "quickcode_mst" mt ON mt."quick_code" = s."member_type_code"
        AND mt."quick_code_type" IN ('memtyp', 'memtype')
      WHERE ${scholasticScope} AND ${match([
        Prisma.sql`s."first_name"`, Prisma.sql`s."middle_name"`, Prisma.sql`s."last_name"`,
        Prisma.sql`s."personal1_contact_no"::text`, Prisma.sql`s."personal_mailid1"`,
        Prisma.sql`p."province_name"`, Prisma.sql`p."short_name"`, Prisma.sql`mt."quickcode_name"`
      ], pattern)}

      UNION ALL
      SELECT 'congregations', 'CONGREGATION', cg."concretion_code",
        cg."concretion_name", coalesce(cg."contact_name", 'Congregation'),
        coalesce(cg."mobile_no", cg."email"), '/concretion', '{}'::jsonb
      FROM "concretion_defination_mst" cg
      WHERE ${congregationClause} AND ${match([
        Prisma.sql`cg."concretion_name"`, Prisma.sql`cg."contact_name"`,
        Prisma.sql`cg."mobile_no"`, Prisma.sql`cg."email"`
      ], pattern)}

      UNION ALL
      SELECT 'provinces', 'PROVINCE', p."province_code", p."province_name",
        coalesce(cg."concretion_name", 'Province'), coalesce(p."short_name", p."email"),
        '/province_onboard', '{}'::jsonb
      FROM "province_mst" p
      LEFT JOIN "concretion_defination_mst" cg ON cg."concretion_code" = p."concretion_code"
      WHERE p."province_code" <> 'ALL' AND ${provinceScope} AND ${match([
        Prisma.sql`p."province_name"`, Prisma.sql`p."short_name"`, Prisma.sql`p."province_code"`,
        Prisma.sql`p."email"`, Prisma.sql`cg."concretion_name"`
      ], pattern)}

      UNION ALL
      SELECT
        CASE
          WHEN upper(coalesce(dt."quickcode_name", '')) LIKE '%REGION%' THEN 'regions'
          WHEN upper(coalesce(dt."quickcode_name", '')) LIKE '%DELEGATION%' THEN 'delegations'
          WHEN upper(coalesce(dt."quickcode_name", '')) LIKE '%MISSION%' THEN 'missions'
          ELSE 'divisions'
        END,
        'DIVISION', d."division_code", d."division_name", p."province_name",
        coalesce(dt."quickcode_name", 'Division'), '/division', '{}'::jsonb
      FROM "division_setup_mst" d
      JOIN "province_mst" p ON p."province_code" = d."province_code"
      LEFT JOIN "quickcode_mst" dt ON dt."quick_code" = d."division_type_code"
      WHERE ${divisionScope} AND ${match([
        Prisma.sql`d."division_name"`, Prisma.sql`p."province_name"`, Prisma.sql`dt."quickcode_name"`
      ], pattern)}

      UNION ALL
      SELECT
        CASE
          WHEN upper(coalesce(apo."apostolate_name", '')) LIKE '%MISSION%' THEN 'missionCentres'
          WHEN upper(coalesce(apo."apostolate_name", '')) LIKE '%FORMATION%' THEN 'formationCentres'
          WHEN upper(coalesce(apo."apostolate_name", '')) LIKE '%EDUCATION%' THEN 'educationCentres'
          WHEN upper(coalesce(apo."apostolate_name", '')) LIKE '%SAIM%' THEN 'saimCentres'
          ELSE 'centres'
        END,
        'CENTRE', ct."centre_code", coalesce(ct."centre_name", ct."centre_place"), p."province_name",
        concat_ws(' · ', apo."apostolate_name", ct."centre_place"), '/viewcentredetails',
        jsonb_build_object('centre_code', ct."centre_code")
      FROM "centre_dtl" ct
      JOIN "province_mst" p ON p."province_code" = ct."province_code"
      LEFT JOIN "apostolates_mst" apo ON apo."province_code" = ct."province_code"
        AND apo."apostolate_code" = ct."apostolate_code"
        AND apo."centre_type_code" = ct."centre_type_code"
      WHERE ${centreScope} AND ${match([
        Prisma.sql`ct."centre_name"`, Prisma.sql`ct."centre_place"`, Prisma.sql`ct."city_dist"`,
        Prisma.sql`ct."phone1_no"::text`, Prisma.sql`ct."mobile1_no"::text`,
        Prisma.sql`ct."office_mailid1"`, Prisma.sql`p."province_name"`,
        Prisma.sql`apo."apostolate_name"`, Prisma.sql`apo."centre_type_name"`
      ], pattern)}

      UNION ALL
      SELECT 'headquarters', 'HEADQUARTERS', h."headquarters_code",
        coalesce(h."headquarters_name", h."place"), p."province_name",
        coalesce(h."mobile1_no"::text, h."office_mailid1"), '/headquarters', '{}'::jsonb
      FROM "headquarters_dtl" h JOIN "province_mst" p ON p."province_code" = h."province_code"
      WHERE ${headquartersScope} AND ${match([
        Prisma.sql`h."headquarters_name"`, Prisma.sql`h."place"`, Prisma.sql`h."city_dist"`,
        Prisma.sql`h."mobile1_no"::text`, Prisma.sql`h."phone1_no"::text`,
        Prisma.sql`h."office_mailid1"`, Prisma.sql`p."province_name"`
      ], pattern)}

      UNION ALL
      SELECT 'communities', 'COMMUNITY', ch."community_house_code", ch."community_house_name",
        p."province_name", coalesce(d."division_name", 'Community House'), '/communityhouse', '{}'::jsonb
      FROM "community_house_dtl" ch JOIN "province_mst" p ON p."province_code" = ch."province_code"
      LEFT JOIN "division_setup_mst" d ON d."province_code" = ch."province_code"
        AND d."division_code" = ch."division_code"
      WHERE ${communityScope} AND ${match([
        Prisma.sql`ch."community_house_name"`, Prisma.sql`p."province_name"`, Prisma.sql`d."division_name"`
      ], pattern)}

      UNION ALL
      SELECT 'curiaAdvisors', 'CURIA_ADVISOR', ca."curia_code" || ':' || ca."confrer_code",
        btrim(concat_ws(' ', c."first_name", c."middle_name", c."last_name")), p."province_name",
        concat_ws(' · ', des."quickcode_name", ca."personal_mailid1"), '/curia_advisors', '{}'::jsonb
      FROM "curia_advisors_dtl" ca
      JOIN "confreres_dtl" c ON c."confrer_code" = ca."confrer_code"
      JOIN "province_mst" p ON p."province_code" = ca."province_code"
      LEFT JOIN "quickcode_mst" des ON des."quick_code" = ca."designation_code"
      WHERE ${curiaScope} AND ${match([
        Prisma.sql`c."first_name"`, Prisma.sql`c."middle_name"`, Prisma.sql`c."last_name"`,
        Prisma.sql`ca."personal1_contact_no"::text`, Prisma.sql`ca."personal_mailid1"`,
        Prisma.sql`des."quickcode_name"`, Prisma.sql`p."province_name"`
      ], pattern)}

      UNION ALL
      SELECT 'admissionsPromotions', 'ADMISSION_PROMOTION', sa."scholastics_admisn_code",
        btrim(concat_ws(' ', s."first_name", s."middle_name", s."last_name")), p."province_name",
        concat_ws(' · ', ct."centre_name", ft."quickcode_name", st."quickcode_name"),
        '/newadmission_promotion', '{}'::jsonb
      FROM "scholastics_admisn_promon_dtl" sa
      JOIN "scholastics_dtl" s ON s."scholastic_code" = sa."scholastic_code"
      JOIN "province_mst" p ON p."province_code" = sa."province_code"
      LEFT JOIN "centre_dtl" ct ON ct."centre_code" = sa."centre_code" AND ct."province_code" = sa."province_code"
      LEFT JOIN "quickcode_mst" ft ON ft."quick_code" = sa."formation_type_code"
      LEFT JOIN "quickcode_mst" st ON st."quick_code" = sa."scholastic_type_code"
      WHERE ${admissionScope} AND ${match([
        Prisma.sql`s."first_name"`, Prisma.sql`s."middle_name"`, Prisma.sql`s."last_name"`,
        Prisma.sql`ct."centre_name"`, Prisma.sql`sa."centre_place"`, Prisma.sql`ft."quickcode_name"`,
        Prisma.sql`st."quickcode_name"`, Prisma.sql`sa."academic_year"`, Prisma.sql`p."province_name"`
      ], pattern)}

      UNION ALL
      SELECT 'appointments', 'APPOINTMENT', ap."confrer_code" || ':' || ap."confrer_seq_no"::text,
        btrim(concat_ws(' ', c."first_name", c."middle_name", c."last_name")), p."province_name",
        concat_ws(' · ', ct."centre_name", des."quickcode_name"), '/appointmentTransfer', '{}'::jsonb
      FROM "appoint_transfer_dtl" ap
      JOIN "confreres_dtl" c ON c."confrer_code" = ap."confrer_code"
      JOIN "province_mst" p ON p."province_code" = ap."province_code"
      LEFT JOIN "centre_dtl" ct ON ct."centre_code" = ap."centre_code" AND ct."province_code" = ap."province_code"
      LEFT JOIN "quickcode_mst" des ON des."quick_code" = ap."designation_code"
      WHERE ${appointmentScope} AND ${match([
        Prisma.sql`c."first_name"`, Prisma.sql`c."middle_name"`, Prisma.sql`c."last_name"`,
        Prisma.sql`ct."centre_name"`, Prisma.sql`des."quickcode_name"`, Prisma.sql`p."province_name"`
      ], pattern)}

      UNION ALL
      SELECT 'events', 'EVENT', e."event_id", e."event_name", p."province_name",
        concat_ws(' · ', e."venue", e."event_date"::date::text), '/eventdetails', '{}'::jsonb
      FROM "event_dtl" e JOIN "province_mst" p ON p."province_code" = e."province_code"
      WHERE ${eventScope} AND ${match([
        Prisma.sql`e."event_name"`, Prisma.sql`e."venue"`, Prisma.sql`e."event_detail"`, Prisma.sql`p."province_name"`
      ], pattern)}

      UNION ALL
      SELECT 'announcements', 'ANNOUNCEMENT', a."anouncement_id", a."anouncement_subjt",
        p."province_name", left(coalesce(a."anouncement_dtl", ''), 100), '/newsannouncements', '{}'::jsonb
      FROM "announcements_dtl" a JOIN "province_mst" p ON p."province_code" = a."province_code"
      WHERE ${announcementScope} AND ${match([
        Prisma.sql`a."anouncement_subjt"`, Prisma.sql`a."anouncement_dtl"`, Prisma.sql`p."province_name"`
      ], pattern)}

      UNION ALL
      SELECT 'countries', 'COUNTRY', co."country_code", co."country_name", p."province_name",
        co."ISD_code", '/country', '{}'::jsonb
      FROM "country_mst" co JOIN "province_mst" p ON p."province_code" = co."province_code"
      WHERE ${countryScope} AND ${match([
        Prisma.sql`co."country_name"`, Prisma.sql`co."country_code"`, Prisma.sql`co."ISD_code"`, Prisma.sql`p."province_name"`
      ], pattern)}

      UNION ALL
      SELECT 'states', 'STATE', st."state_code", st."state_name", p."province_name",
        co."country_name", '/state', '{}'::jsonb
      FROM "state_mst" st JOIN "province_mst" p ON p."province_code" = st."province_code"
      LEFT JOIN "country_mst" co ON co."country_code" = st."country_code" AND co."province_code" = st."province_code"
      WHERE ${stateScope} AND ${match([
        Prisma.sql`st."state_name"`, Prisma.sql`st."state_code"`, Prisma.sql`co."country_name"`, Prisma.sql`p."province_name"`
      ], pattern)}

      UNION ALL
      SELECT 'apostolates', 'APOSTOLATE', apo."apostolate_code", apo."apostolate_name",
        p."province_name", apo."centre_type_name", '/apostolates', '{}'::jsonb
      FROM "apostolates_mst" apo JOIN "province_mst" p ON p."province_code" = apo."province_code"
      WHERE ${apostolateScope} AND ${match([
        Prisma.sql`apo."apostolate_name"`, Prisma.sql`apo."centre_type_name"`, Prisma.sql`p."province_name"`
      ], pattern)}

      UNION ALL
      SELECT 'departures', 'DEPARTURE', dep."departure_code",
        coalesce(btrim(concat_ws(' ', c."first_name", c."middle_name", c."last_name")),
                 btrim(concat_ws(' ', s."first_name", s."middle_name", s."last_name")), 'Departure'),
        p."province_name", concat_ws(' · ', dep."place_of_death", dep."departure_date"::date::text),
        '/departures', '{}'::jsonb
      FROM "departures_dtl" dep JOIN "province_mst" p ON p."province_code" = dep."province_code"
      LEFT JOIN "confreres_dtl" c ON c."confrer_code" = dep."confrer_scholastic_code"
      LEFT JOIN "scholastics_dtl" s ON s."scholastic_code" = dep."confrer_scholastic_code" AND s."province_code" = dep."province_code"
      WHERE ${departureScope} AND ${match([
        Prisma.sql`c."first_name"`, Prisma.sql`c."middle_name"`, Prisma.sql`c."last_name"`,
        Prisma.sql`s."first_name"`, Prisma.sql`s."middle_name"`, Prisma.sql`s."last_name"`,
        Prisma.sql`dep."place_of_death"`, Prisma.sql`dep."cause_of_death"`, Prisma.sql`p."province_name"`
      ], pattern)}

      UNION ALL
      SELECT 'obituaries', 'OBITUARY', ob."obituary_code",
        coalesce(btrim(concat_ws(' ', c."first_name", c."middle_name", c."last_name")),
                 btrim(concat_ws(' ', s."first_name", s."middle_name", s."last_name")), 'Obituary'),
        p."province_name", concat_ws(' · ', ob."death_place", ob."death_date"::date::text),
        '/obituary', '{}'::jsonb
      FROM "obituary_dtl" ob JOIN "province_mst" p ON p."province_code" = ob."province_code"
      LEFT JOIN "confreres_dtl" c ON c."confrer_code" = ob."confrer_scholastic_code"
      LEFT JOIN "scholastics_dtl" s ON s."scholastic_code" = ob."confrer_scholastic_code" AND s."province_code" = ob."province_code"
      WHERE ${obituaryScope} AND ${match([
        Prisma.sql`c."first_name"`, Prisma.sql`c."middle_name"`, Prisma.sql`c."last_name"`,
        Prisma.sql`s."first_name"`, Prisma.sql`s."middle_name"`, Prisma.sql`s."last_name"`,
        Prisma.sql`ob."death_place"`, Prisma.sql`ob."cause_of_death"`, Prisma.sql`ob."disease_name"`, Prisma.sql`p."province_name"`
      ], pattern)}
    ), ranked AS (
      SELECT *, count(*) OVER (PARTITION BY group_key)::int AS group_count,
        row_number() OVER (PARTITION BY group_key ORDER BY title) AS group_row
      FROM search_results
      WHERE title IS NOT NULL AND btrim(title) <> ''
    )
    SELECT * FROM ranked WHERE group_row <= ${QUICK_LIMIT}
    ORDER BY group_key, group_row
  `;

  const groups = {};
  for (const row of rows) {
    if (!groups[row.group_key]) groups[row.group_key] = { count: row.group_count, results: [] };
    groups[row.group_key].results.push({
      entityType: row.entity_type,
      recordId: row.record_id,
      title: row.title,
      subtitle: row.subtitle,
      secondaryText: row.secondary_text,
      route: row.route,
      navigationState: row.navigation_state,
    });
  }
  return { query, total: Object.values(groups).reduce((sum, group) => sum + group.count, 0), groups };
};

export { QUICK_LIMIT };
