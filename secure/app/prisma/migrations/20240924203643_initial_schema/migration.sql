-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identity" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "groups" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "span_entries" (
    "id" SERIAL NOT NULL,
    "org_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "trace_id" TEXT NOT NULL,
    "span_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "span_name" TEXT NOT NULL DEFAULT 'UNSET',
    "span_status" TEXT NOT NULL DEFAULT 'STATUS_CODE_UNSET',
    "start_timestamp" TIMESTAMP(3) NOT NULL,
    "end_timestamp" TIMESTAMP(3) NOT NULL,
    "resource_attributes" JSONB NOT NULL,
    "attributes" JSONB NOT NULL,
    "events" JSONB,
    "links" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "start_timebucket" TIMESTAMP(3) NOT NULL,
    "ingestion_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "span_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JWTSecret" (
    "id" SERIAL NOT NULL,
    "secret" TEXT NOT NULL,

    CONSTRAINT "JWTSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "key_id" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "roles" TEXT[],
    "salt" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("key_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_identity_key" ON "users"("identity");

-- CreateIndex
CREATE INDEX "span_entries_org_id_resource_id_idx" ON "span_entries"("org_id", "resource_id");

-- CreateIndex
CREATE INDEX "span_entries_start_timestamp_idx" ON "span_entries" USING BRIN ("start_timestamp");

-- CreateIndex
CREATE INDEX "span_entries_attributes_idx" ON "span_entries" USING GIN ("attributes" jsonb_path_ops);

-- CreateIndex
CREATE UNIQUE INDEX "JWTSecret_secret_key" ON "JWTSecret"("secret");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_hash_key" ON "ApiKey"("key_hash");
