import { Prisma } from '@prisma/client';

const timelineSql = Prisma.sql`
  SELECT 'Confreres' AS module, 'Confrere' AS entity_type, c."confrer_code" AS entity_id,
         c."province_code", concat_ws(' ', c."first_name", c."middle_name", c."last_name") AS entity_name,
         c."created_by" AS actor_id, c."created_date" AS activity_date, 'CREATE' AS action
  FROM "confreres_dtl" c WHERE c."created_date" IS NOT NULL
  UNION ALL
  SELECT 'Confreres', 'Confrere', c."confrer_code", c."province_code",
         concat_ws(' ', c."first_name", c."middle_name", c."last_name"), c."updated_by", c."updated_date", 'UPDATE'
  FROM "confreres_dtl" c WHERE c."updated_date" IS NOT NULL
  UNION ALL
  SELECT 'Scholastics', 'Scholastic', s."scholastic_code", s."province_code",
         concat_ws(' ', s."first_name", s."middle_name", s."last_name"), s."created_by", s."created_date", 'CREATE'
  FROM "scholastics_dtl" s WHERE s."created_date" IS NOT NULL
  UNION ALL
  SELECT 'Scholastics', 'Scholastic', s."scholastic_code", s."province_code",
         concat_ws(' ', s."first_name", s."middle_name", s."last_name"), s."updated_by", s."updated_date", 'UPDATE'
  FROM "scholastics_dtl" s WHERE s."updated_date" IS NOT NULL
  UNION ALL
  SELECT 'Divisions', coalesce(d."division_type_code", 'Division'), d."division_code", d."province_code",
         d."division_name", d."created_by", d."created_date", 'CREATE'
  FROM "division_setup_mst" d WHERE d."created_date" IS NOT NULL
  UNION ALL
  SELECT 'Divisions', coalesce(d."division_type_code", 'Division'), d."division_code", d."province_code",
         d."division_name", d."updated_by", d."updated_date", 'UPDATE'
  FROM "division_setup_mst" d WHERE d."updated_date" IS NOT NULL
  UNION ALL
  SELECT 'Centres', 'Centre', c."centre_code", c."province_code", coalesce(c."centre_name", c."centre_place"),
         c."created_by", c."created_date", 'CREATE'
  FROM "centre_dtl" c WHERE c."created_date" IS NOT NULL
  UNION ALL
  SELECT 'Centres', 'Centre', c."centre_code", c."province_code", coalesce(c."centre_name", c."centre_place"),
         c."updated_by", c."updated_date", 'UPDATE'
  FROM "centre_dtl" c WHERE c."updated_date" IS NOT NULL
  UNION ALL
  SELECT 'Events', 'Event', e."event_id", e."province_code", e."event_name", e."created_by", e."created_date", 'CREATE'
  FROM "event_dtl" e WHERE e."created_date" IS NOT NULL
  UNION ALL
  SELECT 'Events', 'Event', e."event_id", e."province_code", e."event_name", e."updated_by", e."updated_date", 'UPDATE'
  FROM "event_dtl" e WHERE e."updated_date" IS NOT NULL
  UNION ALL
  SELECT 'News / Announcements', 'Announcement', a."anouncement_id", a."province_code", a."anouncement_subjt",
         a."created_by", a."created_date", 'PUBLISH'
  FROM "announcements_dtl" a WHERE a."created_date" IS NOT NULL
  UNION ALL
  SELECT 'News / Announcements', 'Announcement', a."anouncement_id", a."province_code", a."anouncement_subjt",
         a."updated_by", a."updated_date", 'UPDATE'
  FROM "announcements_dtl" a WHERE a."updated_date" IS NOT NULL
  UNION ALL
  SELECT 'Provinces', 'Province', p."province_code", p."province_code", p."province_name", p."created_by", p."created_date", 'CREATE'
  FROM "province_mst" p WHERE p."created_date" IS NOT NULL AND p."province_code" <> 'ALL'
  UNION ALL
  SELECT 'Provinces', 'Province', p."province_code", p."province_code", p."province_name", p."updated_by", p."updated_date", 'UPDATE'
  FROM "province_mst" p WHERE p."updated_date" IS NOT NULL AND p."province_code" <> 'ALL'
`;

const scopeSql = (provinceCodes) => provinceCodes === null
  ? Prisma.empty
  : Prisma.sql`AND t.province_code IN (${Prisma.join(provinceCodes)})`;

const messageFor = (row) => {
  const verb = row.action === 'CREATE' ? 'was added' : row.action === 'PUBLISH' ? 'was published' : 'was updated';
  return `${row.entity_name || row.entity_type} ${verb}`;
};

const normalize = (row) => ({
  id: `${row.module}-${row.action}-${row.entity_id}-${new Date(row.activity_date).getTime()}`,
  module: row.module,
  entityType: row.entity_type,
  entityId: row.entity_id,
  provinceCode: row.province_code,
  provinceName: row.province_name,
  entityName: row.entity_name,
  action: row.action,
  description: messageFor(row),
  performedBy: row.actor_email ? {
    name: row.actor_name || null,
    email: row.actor_email,
    role: row.actor_role || null,
  } : null,
  activityDate: row.activity_date,
});

export const getActivities = async ({ prisma, provinceCodes, recentOnly, page = 1, pageSize = 20 }) => {
  const period = recentOnly
    ? Prisma.empty
    : Prisma.sql`AND t.activity_date >= timezone('Asia/Kolkata', now()) - interval '2 months'`;
  const scope = scopeSql(provinceCodes);
  const limit = recentOnly ? 6 : pageSize;
  const offset = recentOnly ? 0 : (page - 1) * pageSize;

  const rows = await prisma.$queryRaw(Prisma.sql`
    WITH timeline AS (${timelineSql})
    SELECT t.*, pm."province_name",
           nullif(trim(concat_ws(' ', u."first_name", u."last_name")), '') AS actor_name,
           u."user_id" AS actor_email, u."role_name" AS actor_role
    FROM timeline t
    LEFT JOIN "province_mst" pm ON pm."province_code" = t.province_code
    LEFT JOIN "users_mst" u ON u."user_id" = t.actor_id
    WHERE 1=1 ${scope} ${period}
    ORDER BY t.activity_date DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  let total = rows.length;
  if (!recentOnly) {
    const [countRow] = await prisma.$queryRaw(Prisma.sql`
      WITH timeline AS (${timelineSql})
      SELECT count(*)::int AS total FROM timeline t
      WHERE 1=1 ${scope} ${period}
    `);
    total = countRow?.total || 0;
  }

  return { items: rows.map(normalize), total, page, pageSize: limit };
};
