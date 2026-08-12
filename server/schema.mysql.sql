CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  phone VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'customer',
  PRIMARY KEY (id),
  UNIQUE KEY users_phone_unique (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE categories (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY categories_name_unique (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE products (
  id INT NOT NULL AUTO_INCREMENT,
  category_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  stock INT NOT NULL,
  emoji VARCHAR(32) NOT NULL,
  cover_bucket_id VARCHAR(128) NULL,
  cover_path VARCHAR(512) NULL,
  cover_original_name VARCHAR(255) NULL,
  cover_mime_type VARCHAR(128) NULL,
  cover_size_bytes BIGINT NULL,
  cover_visibility VARCHAR(16) NOT NULL DEFAULT 'public',
  is_active TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY products_category_id (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cart_items (
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  PRIMARY KEY (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE addresses (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  detail TEXT NOT NULL,
  is_default TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY addresses_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders (
  id INT NOT NULL AUTO_INCREMENT,
  order_no VARCHAR(64) NOT NULL,
  user_id INT NOT NULL,
  status VARCHAR(64) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  address_json JSON NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY orders_order_no_unique (order_no),
  KEY orders_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_items (
  id INT NOT NULL AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  quantity INT NOT NULL,
  emoji VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  KEY order_items_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO users (id, phone, name, password, created_at, role) VALUES
  (1, '13800000000', '演示用户', 'Demo1234', '2026-07-23T09:00:00.000Z', 'customer'),
  (2, '13900000001', '演示管理员', 'Admin1234', '2026-07-24T09:00:00.000Z', 'admin');

INSERT INTO categories (id, name) VALUES
  (1, '数码生活'), (2, '居家好物'), (3, '学习办公'), (4, '轻运动');

INSERT INTO products (id, category_id, name, description, price, stock, emoji, is_active) VALUES
  (1,1,'云隙降噪耳机','通勤时刻，也能拥有一小段安静。',299,30,'🎧',1),
  (2,1,'曜石机械键盘','紧凑配列，柔和白光。',369,18,'⌨️',1),
  (3,1,'漫游充电宝','10000mAh 双向快充。',159,42,'🔋',1),
  (4,1,'微光桌面音箱','小巧立体声，适合书桌。',219,25,'🔊',1),
  (5,1,'折光阅读灯','三档色温，无频闪照明。',129,33,'💡',1),
  (6,1,'简约平板支架','铝合金折叠支架。',79,55,'📱',1),
  (7,2,'山岚香薰机','超声波细雾与定时模式。',189,24,'🌿',1),
  (8,2,'晨雾马克杯','350ml 陶瓷杯，手感温润。',68,60,'☕',1),
  (9,2,'柔棉四件套','亲肤棉质，四季可用。',429,16,'🛏️',1),
  (10,2,'午后抱枕','高回弹填充，搭配沙发。',99,38,'🛋️',1),
  (11,2,'星点收纳盒','模块化叠放设计。',49,70,'📦',1),
  (12,2,'溪石保温壶','保温 12 小时，600ml。',139,22,'🫖',1),
  (13,3,'沉浸番茄钟','专注、休息与白噪音。',89,35,'⏲️',1),
  (14,3,'留白笔记本','A5 点阵内页，180 页。',36,90,'📓',1),
  (15,3,'晴川签字笔套装','0.5mm 顺滑书写，12 色。',59,68,'🖊️',1),
  (16,3,'立式文件架','三格分类，桌面更整洁。',85,30,'🗂️',1),
  (17,3,'轻舟双肩包','15 英寸电脑仓与防泼水面料。',259,20,'🎒',1),
  (18,3,'纸感鼠标垫','细腻纹理，易清洁。',45,48,'🖱️',1),
  (19,4,'云步瑜伽垫','加厚防滑，展开即练。',168,27,'🧘',1),
  (20,4,'远行水杯','吸管杯盖，750ml 容量。',88,44,'🥤',1),
  (21,4,'轻盈跳绳','可调节长度，计数手柄。',72,39,'🪢',1),
  (22,4,'夜跑腰包','反光条与独立耳机孔。',118,19,'🏃',1),
  (23,4,'探索野餐垫','防潮折叠，双人尺寸。',149,26,'🏕️',1),
  (24,4,'晨风毛巾','速干材质，三条装。',55,63,'🧺',1);

INSERT INTO addresses (id, user_id, recipient, phone, detail, is_default) VALUES
  (1, 1, '演示用户', '13800000000', '上海市浦东新区星河路 88 号 101 室', 1);

INSERT INTO orders (id, order_no, user_id, status, total, address_json, created_at) VALUES
  (1, 'SHOP-0001', 1, '已支付', 299, '{"recipient":"演示用户","phone":"13800000000","detail":"上海市浦东新区星河路 88 号 101 室"}', '2026-07-23T09:00:00.000Z');

INSERT INTO order_items (id, order_id, product_id, name, price, quantity, emoji) VALUES
  (1, 1, 1, '云隙降噪耳机', 299, 1, '🎧');
