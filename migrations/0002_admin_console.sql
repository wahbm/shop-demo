ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer';
ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;

INSERT INTO users (phone, name, password, created_at, role)
VALUES ('13900000001', '演示管理员', 'Admin1234', '2026-07-24T09:00:00.000Z', 'admin');
