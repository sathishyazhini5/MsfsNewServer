-- This migration only widens identifier columns, adds a counter table, and adds
-- global uniqueness. It never updates historical identifier values.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM confreres_dtl
    GROUP BY confrer_code HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add global confrer_code uniqueness: duplicates exist';
  END IF;
END $$;

ALTER TABLE "confreres_dtl" ALTER COLUMN "confrer_code" TYPE VARCHAR(15);
ALTER TABLE "confreres_feedback_dtl" ALTER COLUMN "confrer_code" TYPE VARCHAR(15);
ALTER TABLE "curia_advisors_dtl" ALTER COLUMN "confrer_code" TYPE VARCHAR(15);
ALTER TABLE "appoint_transfer_dtl" ALTER COLUMN "confrer_code" TYPE VARCHAR(15);
ALTER TABLE "appoint_transfer_his_dtl" ALTER COLUMN "confrer_code" TYPE VARCHAR(15);
ALTER TABLE "departures_dtl" ALTER COLUMN "confrer_scholastic_code" TYPE VARCHAR(15);
ALTER TABLE "anniversary_notify_dtl" ALTER COLUMN "confrer_scholastic_code" TYPE VARCHAR(15);
ALTER TABLE "obituary_dtl" ALTER COLUMN "confrer_scholastic_code" TYPE VARCHAR(15);

CREATE UNIQUE INDEX "confreres_dtl_confrer_code_key"
  ON "confreres_dtl"("confrer_code");

CREATE TABLE "confrere_code_counter" (
  "province_code" VARCHAR(10) NOT NULL,
  "ordination_year" INTEGER NOT NULL,
  "last_sequence" INTEGER NOT NULL,
  "updated_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "confrere_code_counter_pkey" PRIMARY KEY ("province_code", "ordination_year"),
  CONSTRAINT "confrere_code_counter_sequence_check" CHECK ("last_sequence" BETWEEN 0 AND 999)
);

-- Seed from the configured short name + embedded four-digit year + any numeric
-- suffix. Historical identifiers remain unchanged; only the numeric suffix is
-- used to initialize the next allocation safely.
INSERT INTO "confrere_code_counter" ("province_code", "ordination_year", "last_sequence")
SELECT
  c."province_code",
  substring(c."confrer_code" FROM char_length(btrim(p."short_name")) + 1 FOR 4)::INTEGER,
  MAX(substring(c."confrer_code" FROM char_length(btrim(p."short_name")) + 5)::INTEGER)
FROM "confreres_dtl" c
JOIN "province_mst" p ON p."province_code" = c."province_code"
WHERE upper(c."confrer_code") LIKE upper(btrim(p."short_name")) || '%'
  AND substring(c."confrer_code" FROM char_length(btrim(p."short_name")) + 1) ~ '^[0-9]{5,}$'
GROUP BY
  c."province_code",
  substring(c."confrer_code" FROM char_length(btrim(p."short_name")) + 1 FOR 4)::INTEGER;
