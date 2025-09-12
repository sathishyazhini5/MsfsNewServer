-- CreateTable
CREATE TABLE "meta_data_mst" (
    "screen_code" VARCHAR(10) NOT NULL,
    "meta_code" VARCHAR(10) NOT NULL,
    "screen_name" VARCHAR(50) NOT NULL,
    "meta_code_name" VARCHAR(50) NOT NULL,
    "auto_codeflag" INTEGER,

    CONSTRAINT "meta_data_mst_pkey" PRIMARY KEY ("screen_code","meta_code")
);

-- CreateTable
CREATE TABLE "quickcode_mst" (
    "quick_code_type" VARCHAR(10) NOT NULL,
    "quick_code" VARCHAR(10) NOT NULL,
    "quickcode_name" VARCHAR(100) NOT NULL,
    "language_code" VARCHAR(2) NOT NULL,
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(6),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(6),

    CONSTRAINT "quickcode_mst_pkey" PRIMARY KEY ("quick_code_type","quick_code")
);

-- CreateTable
CREATE TABLE "country_mst" (
    "country_code" VARCHAR(10) NOT NULL,
    "nationality_code" VARCHAR(10) NOT NULL,
    "country_name" VARCHAR(100) NOT NULL,
    "ISD_code" VARCHAR(5) NOT NULL,
    "language_code" VARCHAR(2) NOT NULL,
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(6),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(6),

    CONSTRAINT "country_mst_pkey" PRIMARY KEY ("country_code")
);

-- CreateTable
CREATE TABLE "state_mst" (
    "state_code" VARCHAR(10) NOT NULL,
    "country_code" VARCHAR(10) NOT NULL,
    "state_name" VARCHAR(100) NOT NULL,
    "ISD_code" VARCHAR(4) NOT NULL,
    "language_code" VARCHAR(2) NOT NULL,
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(6),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(6),

    CONSTRAINT "state_mst_pkey" PRIMARY KEY ("state_code","country_code")
);

-- CreateTable
CREATE TABLE "province_mst" (
    "province_code" VARCHAR(10) NOT NULL,
    "country_code" VARCHAR(10) NOT NULL,
    "province_name" VARCHAR(100) NOT NULL,
    "short_name" VARCHAR(5) NOT NULL,
    "inter_province_chk" INTEGER NOT NULL,
    "date_format" VARCHAR(8),
    "academic_year" VARCHAR(12),
    "language_code" VARCHAR(2) NOT NULL,
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(6),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(6),

    CONSTRAINT "province_mst_pkey" PRIMARY KEY ("province_code","country_code")
);

-- CreateTable
CREATE TABLE "apostolates_mst" (
    "apostolate_code" VARCHAR(10) NOT NULL,
    "centre_type_code" VARCHAR(10) NOT NULL,
    "apostolate_name" VARCHAR(100) NOT NULL,
    "centre_type_name" VARCHAR(5) NOT NULL,
    "date_format" VARCHAR(8),
    "academic_year" VARCHAR(12),
    "language_code" VARCHAR(2) NOT NULL,
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(6),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(6),

    CONSTRAINT "apostolates_mst_pkey" PRIMARY KEY ("apostolate_code","centre_type_code")
);

-- CreateTable
CREATE TABLE "users_mst" (
    "province_code" VARCHAR(10) NOT NULL,
    "user_id" VARCHAR(10) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100),
    "username" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "original_password" VARCHAR(255),
    "user_type_code" VARCHAR(10) NOT NULL,
    "language_code" VARCHAR(10) NOT NULL,
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(100),
    "created_date" TIMESTAMP(3),
    "updated_by" VARCHAR(100),
    "updated_date" TIMESTAMP(3),

    CONSTRAINT "users_mst_pkey" PRIMARY KEY ("province_code","user_id")
);

-- CreateTable
CREATE TABLE "division_setup_mst" (
    "province_code" VARCHAR(10) NOT NULL,
    "division_type_code" VARCHAR(50) NOT NULL,
    "division_code" VARCHAR(10) NOT NULL,
    "division_name" VARCHAR(50) NOT NULL,
    "language_code" VARCHAR(2) NOT NULL,
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(6),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(6),

    CONSTRAINT "division_setup_mst_pkey" PRIMARY KEY ("province_code","division_type_code","division_code")
);

-- CreateTable
CREATE TABLE "languagemetadata" (
    "language_name" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,

    CONSTRAINT "languagemetadata_pkey" PRIMARY KEY ("language_code")
);

-- CreateTable
CREATE TABLE "nationalitymetadata" (
    "nationality" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "nationalitymetadata_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "countrymetadata" (
    "alpha_3code" TEXT NOT NULL,
    "country_name" TEXT NOT NULL,
    "alpha_2code" TEXT NOT NULL,
    "ISD_code" TEXT NOT NULL,

    CONSTRAINT "countrymetadata_pkey" PRIMARY KEY ("alpha_3code")
);

-- CreateTable
CREATE TABLE "bloodgroup_metadata" (
    "BloodGroup" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "bloodgroup_metadata_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "date_format_metadata" (
    "date_format_name" TEXT NOT NULL,
    "date_format_code" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "headquarters_dtl" (
    "headquarters_code" VARCHAR(10) NOT NULL,
    "province_code" VARCHAR(10) NOT NULL,
    "division_type_code" VARCHAR(10) NOT NULL,
    "division_code" VARCHAR(10) NOT NULL,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "place" VARCHAR(100) NOT NULL,
    "city_dist" VARCHAR(100) NOT NULL,
    "pin_zipcode" INTEGER NOT NULL,
    "country_code" VARCHAR(10) NOT NULL,
    "state_code" VARCHAR(10) NOT NULL,
    "courier_address1" TEXT,
    "courier_address2" TEXT,
    "courier_place" VARCHAR(100),
    "courier_city_dist" VARCHAR(100),
    "courier_pin_zipcode" INTEGER,
    "courier_country_code" VARCHAR(10),
    "courier_state_code" VARCHAR(10),
    "other_address1" TEXT,
    "other_address2" TEXT,
    "other_place" VARCHAR(100),
    "other_city_dist" VARCHAR(100),
    "other_pin_zipcode" INTEGER,
    "other_country_code" VARCHAR(10),
    "other_state_code" VARCHAR(10),
    "phone1_isd" VARCHAR(5) NOT NULL,
    "phone1_no" BIGINT NOT NULL,
    "phone2_isd" VARCHAR(5),
    "phone2_no" BIGINT,
    "phone3_isd" VARCHAR(5),
    "phone3_no" BIGINT,
    "mobile1_isd" VARCHAR(5),
    "mobile1_no" BIGINT,
    "mobile2_isd" VARCHAR(5),
    "mobile2_no" BIGINT,
    "mobile3_isd" VARCHAR(5),
    "mobile3_no" BIGINT,
    "watsup_isd" VARCHAR(5),
    "watsup_no" BIGINT,
    "fax_isd" VARCHAR(5),
    "fax_no" BIGINT,
    "office_mailid1" VARCHAR(255) NOT NULL,
    "office_mailid2" VARCHAR(255),
    "office_mailid3" VARCHAR(255),
    "website1" TEXT,
    "website2" TEXT,
    "website3" TEXT,
    "secretary_isd" VARCHAR(5),
    "secretary_contact_no" BIGINT,
    "secretary_mailid" VARCHAR(255),
    "bursar_isd" VARCHAR(5),
    "bursar_contact_no" BIGINT,
    "bursar_mailid" VARCHAR(255),
    "language_code" VARCHAR(2),
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(3),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(3),

    CONSTRAINT "headquarters_dtl_pkey" PRIMARY KEY ("headquarters_code","province_code","division_type_code","division_code")
);

-- CreateTable
CREATE TABLE "confreres_dtl" (
    "confrer_code" VARCHAR(10) NOT NULL,
    "province_code" VARCHAR(10) NOT NULL,
    "member_type_code" VARCHAR(10) NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "middle_name" VARCHAR(50),
    "last_name" VARCHAR(50) NOT NULL,
    "image_file_name" VARCHAR(100),
    "image_file_path" TEXT,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "baptism_date" TIMESTAMP(3),
    "confirmation_date" TIMESTAMP(3),
    "first_profession_date" TIMESTAMP(3) NOT NULL,
    "final_profession_date" TIMESTAMP(3) NOT NULL,
    "ordination_date" TIMESTAMP(3),
    "personal1_isd" VARCHAR(5),
    "personal1_contact_no" BIGINT,
    "personal2_isd" VARCHAR(5),
    "personal2_contact_no" BIGINT,
    "personal3_isd" VARCHAR(5),
    "personal3_contact_no" BIGINT,
    "watsup1_isd" VARCHAR(5),
    "watsup1_no" BIGINT,
    "watsup2_isd" VARCHAR(5),
    "watsup2_no" BIGINT,
    "watsup3_isd" VARCHAR(5),
    "watsup3_no" BIGINT,
    "emergency_isd" VARCHAR(5),
    "emergency_contact_no" BIGINT,
    "personal_mailid1" VARCHAR(255) NOT NULL,
    "blood_group_code" VARCHAR(10),
    "nationality_code" VARCHAR(10),
    "language_code" VARCHAR(2),
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(3),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(3),

    CONSTRAINT "confreres_dtl_pkey" PRIMARY KEY ("confrer_code","province_code")
);

-- CreateTable
CREATE TABLE "community_house_dtl" (
    "community_house_code" VARCHAR(10) NOT NULL,
    "province_code" VARCHAR(10) NOT NULL,
    "division_type_code" VARCHAR(50) NOT NULL,
    "division_code" VARCHAR(10) NOT NULL,
    "commutity_house_name" VARCHAR(50) NOT NULL,
    "language_code" VARCHAR(2),
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(3),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(3),

    CONSTRAINT "community_house_dtl_pkey" PRIMARY KEY ("community_house_code","province_code","division_type_code","division_code")
);

-- CreateTable
CREATE TABLE "centre_dtl" (
    "centre_code" VARCHAR(10) NOT NULL,
    "province_code" VARCHAR(10) NOT NULL,
    "division_type_code" VARCHAR(50) NOT NULL,
    "division_code" VARCHAR(10) NOT NULL,
    "apostolate_code" VARCHAR(10) NOT NULL,
    "centre_type_code" VARCHAR(10) NOT NULL,
    "community_house_code" VARCHAR(10) NOT NULL,
    "centre_name" VARCHAR(50) NOT NULL,
    "centre_place" VARCHAR(100) NOT NULL,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "address3" TEXT,
    "city_dist" VARCHAR(100) NOT NULL,
    "pin_zipcode" INTEGER NOT NULL,
    "country_code" VARCHAR(10) NOT NULL,
    "state_code" VARCHAR(10) NOT NULL,
    "diocese_name" VARCHAR(100) NOT NULL,
    "phone1_isd" VARCHAR(4) NOT NULL,
    "phone1_no" BIGINT NOT NULL,
    "phone2_isd" VARCHAR(5),
    "phone2_no" BIGINT,
    "phone3_isd" VARCHAR(5),
    "phone3_no" BIGINT,
    "mobile1_isd" VARCHAR(5),
    "mobile1_no" BIGINT,
    "mobile2_isd" VARCHAR(5),
    "mobile2_no" BIGINT,
    "mobile3_isd" VARCHAR(5),
    "mobile3_no" BIGINT,
    "watsup_isd" VARCHAR(5),
    "watsup_no" BIGINT,
    "fax_isd" VARCHAR(5),
    "fax_no" BIGINT,
    "office_mailid1" VARCHAR(255) NOT NULL,
    "office_mailid2" VARCHAR(255),
    "office_mailid3" VARCHAR(255),
    "website1" TEXT,
    "website2" TEXT,
    "website3" TEXT,
    "language_code" VARCHAR(2),
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(3),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(3),

    CONSTRAINT "centre_dtl_pkey" PRIMARY KEY ("centre_code","province_code","division_type_code","division_code")
);

-- CreateTable
CREATE TABLE "curia_advisors_dtl" (
    "confrer_code" VARCHAR(10) NOT NULL,
    "province_code" VARCHAR(10) NOT NULL,
    "division_type_code" VARCHAR(50) NOT NULL,
    "division_code" VARCHAR(10) NOT NULL,
    "designation_code" VARCHAR(10) NOT NULL,
    "pcic_off_code" VARCHAR(10) NOT NULL,
    "appointment_date" TIMESTAMP(3) NOT NULL,
    "mandate_code" VARCHAR(10) NOT NULL,
    "installation_date" TIMESTAMP(3) NOT NULL,
    "mandate_end_date" TIMESTAMP(3) NOT NULL,
    "office1_isd" VARCHAR(5),
    "office1_contact_no" BIGINT,
    "office2_isd" VARCHAR(5),
    "office2_contact_no" BIGINT,
    "office3_isd" VARCHAR(5),
    "office3_contact_no" BIGINT,
    "office_mailid1" VARCHAR(255) NOT NULL,
    "office_mailid2" VARCHAR(255),
    "office_mailid3" VARCHAR(255),
    "language_code" VARCHAR(2),
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(3),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(3),

    CONSTRAINT "curia_advisors_dtl_pkey" PRIMARY KEY ("confrer_code","province_code","division_type_code","division_code")
);

-- CreateTable
CREATE TABLE "appoint_transfer_dtl" (
    "confrer_code" VARCHAR(10) NOT NULL,
    "centre_code" VARCHAR(10) NOT NULL,
    "province_code" VARCHAR(10) NOT NULL,
    "division_type_code" VARCHAR(50) NOT NULL,
    "division_code" VARCHAR(10) NOT NULL,
    "centre_place_code" VARCHAR(10),
    "inter_province_chk" INTEGER NOT NULL,
    "designation1_code" VARCHAR(10) NOT NULL,
    "designation1_appn_date" TIMESTAMP(3) NOT NULL,
    "designation1_taken_date" TIMESTAMP(3),
    "designation1_end_date" TIMESTAMP(3),
    "designation2_code" VARCHAR(10),
    "designation2_appn_date" TIMESTAMP(3),
    "designation2_taken_date" TIMESTAMP(3),
    "designation2_end_date" TIMESTAMP(3),
    "designation3_code" VARCHAR(10),
    "designation3_appn_date" TIMESTAMP(3),
    "designation3_taken_date" TIMESTAMP(3),
    "designation3_end_date" TIMESTAMP(3),
    "language_code" VARCHAR(2),
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(3),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(3),

    CONSTRAINT "appoint_transfer_dtl_pkey" PRIMARY KEY ("confrer_code","centre_code")
);

-- CreateTable
CREATE TABLE "scholastics_dtl" (
    "scholastic_code" VARCHAR(10) NOT NULL,
    "province_code" VARCHAR(10) NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "middle_name" VARCHAR(50),
    "last_name" VARCHAR(50) NOT NULL,
    "image_file_name" VARCHAR(100),
    "image_file_path" TEXT,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "baptism_date" TIMESTAMP(3),
    "confirmation_date" TIMESTAMP(3),
    "first_profession_date" TIMESTAMP(3) NOT NULL,
    "final_profession_date" TIMESTAMP(3) NOT NULL,
    "ordination_date" TIMESTAMP(3),
    "personal1_isd" VARCHAR(5),
    "personal1_contact_no" BIGINT,
    "personal2_isd" VARCHAR(5),
    "personal2_contact_no" BIGINT,
    "personal3_isd" VARCHAR(5),
    "personal3_contact_no" BIGINT,
    "watsup1_isd" VARCHAR(5),
    "watsup1_no" BIGINT,
    "watsup2_isd" VARCHAR(5),
    "watsup2_no" BIGINT,
    "watsup3_isd" VARCHAR(5),
    "watsup3_no" BIGINT,
    "emergency_isd" VARCHAR(5),
    "emergency_contact_no" BIGINT,
    "personal_mailid1" VARCHAR(255) NOT NULL,
    "blood_group_code" VARCHAR(10),
    "nationality_code" VARCHAR(10),
    "language_code" VARCHAR(2),
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(3),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(3),

    CONSTRAINT "scholastics_dtl_pkey" PRIMARY KEY ("scholastic_code","province_code")
);

-- CreateTable
CREATE TABLE "scholastics_admisn_promon_dtl" (
    "scholastic_code" VARCHAR(10) NOT NULL,
    "centre_code" VARCHAR(10) NOT NULL,
    "province_code" VARCHAR(10) NOT NULL,
    "division_type_code" VARCHAR(50) NOT NULL,
    "division_code" VARCHAR(10) NOT NULL,
    "formation_type_code" VARCHAR(10),
    "scholastic_type_code" VARCHAR(10),
    "promotion_to_code" VARCHAR(10),
    "promotion_date" TIMESTAMP(3),
    "year_formation_code" VARCHAR(10),
    "academic_year" VARCHAR(12),
    "remarks" TEXT,
    "language_code" VARCHAR(2),
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(3),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(3),

    CONSTRAINT "scholastics_admisn_promon_dtl_pkey" PRIMARY KEY ("scholastic_code","centre_code")
);

-- CreateTable
CREATE TABLE "departures_dtl" (
    "province_code" VARCHAR(10) NOT NULL,
    "confrer_scholastic_code" VARCHAR(10) NOT NULL,
    "member_type_code" VARCHAR(10),
    "departure_type_code" VARCHAR(10),
    "departure_date" TIMESTAMP(3),
    "remarks" TEXT,
    "language_code" VARCHAR(2),
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(3),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(3),

    CONSTRAINT "departures_dtl_pkey" PRIMARY KEY ("province_code","confrer_scholastic_code")
);

-- CreateTable
CREATE TABLE "anniversary_notify_dtl" (
    "notify_id" SERIAL NOT NULL,
    "province_code" VARCHAR(10) NOT NULL,
    "anniversary_type_code" VARCHAR(10) NOT NULL,
    "confrer_scholastic_code" VARCHAR(10) NOT NULL,
    "notify_sent_date" TIMESTAMP(3),
    "nofify_received_flag" INTEGER,
    "anniversary_date" TIMESTAMP(3),
    "contact_isd" VARCHAR(5),
    "contact_no" BIGINT,
    "emailid" VARCHAR(255),
    "message_chk" INTEGER NOT NULL,
    "email_chk" INTEGER NOT NULL,
    "language_code" VARCHAR(2),
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(3),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(3),

    CONSTRAINT "anniversary_notify_dtl_pkey" PRIMARY KEY ("notify_id")
);

-- CreateTable
CREATE TABLE "event_dtl" (
    "event_id" SERIAL NOT NULL,
    "province_code" VARCHAR(10) NOT NULL,
    "event_name" VARCHAR(255),
    "event_date" TIMESTAMP(3),
    "venue" VARCHAR(100),
    "event_detail" TEXT,
    "language_code" INTEGER,
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(3),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(3),

    CONSTRAINT "event_dtl_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "announcements_dtl" (
    "anouncement_id" SERIAL NOT NULL,
    "province_code" VARCHAR(10) NOT NULL,
    "division_type_code" VARCHAR(50),
    "division_code" VARCHAR(10),
    "apostolate_code" VARCHAR(10),
    "centre_place_code" VARCHAR(10),
    "centre_code" VARCHAR(10),
    "member_type_code" VARCHAR(10),
    "designation_code" VARCHAR(10),
    "anouncement_subjt" VARCHAR(100),
    "anouncement_dtl" TEXT,
    "signature_address" TEXT,
    "language_code" VARCHAR(2),
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(3),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(3),

    CONSTRAINT "announcements_dtl_pkey" PRIMARY KEY ("anouncement_id")
);

-- CreateTable
CREATE TABLE "obituary_dtl" (
    "province_code" VARCHAR(10) NOT NULL,
    "confrer_scholastic_code" VARCHAR(10) NOT NULL,
    "member_type_code" VARCHAR(10),
    "is_existing_member_chk" INTEGER,
    "disease_name" VARCHAR(100),
    "death_place" VARCHAR(100),
    "death_date" TIMESTAMP(3),
    "death_country_code" VARCHAR(10),
    "orgin_country_code" VARCHAR(10),
    "remarks" TEXT,
    "language_code" VARCHAR(2),
    "concurrency_val" INTEGER,
    "created_by" VARCHAR(50),
    "created_date" TIMESTAMP(3),
    "updated_by" VARCHAR(50),
    "updated_date" TIMESTAMP(3),

    CONSTRAINT "obituary_dtl_pkey" PRIMARY KEY ("province_code","confrer_scholastic_code")
);

-- CreateIndex
CREATE INDEX "quickcode_name_idx" ON "quickcode_mst"("quickcode_name");

-- CreateIndex
CREATE UNIQUE INDEX "users_mst_username_key" ON "users_mst"("username");

-- CreateIndex
CREATE UNIQUE INDEX "languagemetadata_language_code_key" ON "languagemetadata"("language_code");

-- CreateIndex
CREATE UNIQUE INDEX "nationalitymetadata_code_key" ON "nationalitymetadata"("code");

-- CreateIndex
CREATE UNIQUE INDEX "countrymetadata_alpha_3code_key" ON "countrymetadata"("alpha_3code");

-- CreateIndex
CREATE UNIQUE INDEX "bloodgroup_metadata_code_key" ON "bloodgroup_metadata"("code");

-- CreateIndex
CREATE UNIQUE INDEX "date_format_metadata_date_format_code_key" ON "date_format_metadata"("date_format_code");

-- CreateIndex
CREATE UNIQUE INDEX "anniversary_notify_dtl_notify_id_province_code_key" ON "anniversary_notify_dtl"("notify_id", "province_code");

-- CreateIndex
CREATE UNIQUE INDEX "event_dtl_event_id_province_code_key" ON "event_dtl"("event_id", "province_code");

-- CreateIndex
CREATE UNIQUE INDEX "announcements_dtl_anouncement_id_province_code_key" ON "announcements_dtl"("anouncement_id", "province_code");
