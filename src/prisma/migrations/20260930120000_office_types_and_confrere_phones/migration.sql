BEGIN;
-- Additive migration. Existing identifiers and stored phone digits are preserved.
ALTER TABLE "curia_advisors_dtl" ADD COLUMN "gcic_off_code" VARCHAR(10);
ALTER TABLE "confreres_dtl" ADD COLUMN "import_key" VARCHAR(64);
CREATE UNIQUE INDEX "confreres_dtl_import_key_key" ON "confreres_dtl"("import_key");
ALTER TABLE "confreres_dtl"
  ALTER COLUMN "personal1_contact_no" TYPE VARCHAR(20) USING "personal1_contact_no"::text,
  ALTER COLUMN "personal2_contact_no" TYPE VARCHAR(20) USING "personal2_contact_no"::text,
  ALTER COLUMN "personal3_contact_no" TYPE VARCHAR(20) USING "personal3_contact_no"::text,
  ALTER COLUMN "watsup1_no" TYPE VARCHAR(20) USING "watsup1_no"::text,
  ALTER COLUMN "watsup2_no" TYPE VARCHAR(20) USING "watsup2_no"::text,
  ALTER COLUMN "watsup3_no" TYPE VARCHAR(20) USING "watsup3_no"::text,
  ALTER COLUMN "emergency_contact_no" TYPE VARCHAR(20) USING "emergency_contact_no"::text;
-- Reuse deployed metadata category codes when present.
INSERT INTO "meta_data_mst" ("screen_code", "meta_code", "screen_name", "meta_code_name")
SELECT 'qckcode', 'pcicof', 'Quick Code', 'PCIC Office Type'
WHERE NOT EXISTS (SELECT 1 FROM "meta_data_mst" WHERE "screen_code" = 'qckcode'
  AND ("meta_code" = 'pcicof' OR btrim("meta_code_name") ~* '^PCIC'));
INSERT INTO "meta_data_mst" ("screen_code", "meta_code", "screen_name", "meta_code_name")
SELECT 'qckcode', 'gcicof', 'Quick Code', 'GCIC Office Type'
WHERE NOT EXISTS (SELECT 1 FROM "meta_data_mst" WHERE "screen_code" = 'qckcode'
  AND ("meta_code" = 'gcicof' OR btrim("meta_code_name") ~* '^GCIC'));

COMMIT;
