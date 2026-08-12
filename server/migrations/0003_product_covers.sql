-- Reference SQL for the idempotent migration in server/mysql-migrations.ts.
ALTER TABLE products ADD COLUMN cover_bucket_id VARCHAR(128) NULL;
ALTER TABLE products ADD COLUMN cover_path VARCHAR(512) NULL;
ALTER TABLE products ADD COLUMN cover_original_name VARCHAR(255) NULL;
ALTER TABLE products ADD COLUMN cover_mime_type VARCHAR(128) NULL;
ALTER TABLE products ADD COLUMN cover_size_bytes BIGINT NULL;
ALTER TABLE products ADD COLUMN cover_visibility VARCHAR(16) NOT NULL DEFAULT 'public';
