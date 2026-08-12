ALTER TABLE products ADD COLUMN cover_bucket_id TEXT;
ALTER TABLE products ADD COLUMN cover_path TEXT;
ALTER TABLE products ADD COLUMN cover_original_name TEXT;
ALTER TABLE products ADD COLUMN cover_mime_type TEXT;
ALTER TABLE products ADD COLUMN cover_size_bytes INTEGER;
ALTER TABLE products ADD COLUMN cover_visibility TEXT NOT NULL DEFAULT 'public';
