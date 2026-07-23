CREATE TABLE users (id INTEGER PRIMARY KEY, phone TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE products (id INTEGER PRIMARY KEY, category_id INTEGER NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, price REAL NOT NULL, stock INTEGER NOT NULL, emoji TEXT NOT NULL);
CREATE TABLE cart_items (user_id INTEGER NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL, PRIMARY KEY(user_id, product_id));
CREATE TABLE addresses (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, recipient TEXT NOT NULL, phone TEXT NOT NULL, detail TEXT NOT NULL, is_default INTEGER NOT NULL DEFAULT 0);
CREATE TABLE orders (id INTEGER PRIMARY KEY, order_no TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL, status TEXT NOT NULL, total REAL NOT NULL, address_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, product_id INTEGER NOT NULL, name TEXT NOT NULL, price REAL NOT NULL, quantity INTEGER NOT NULL, emoji TEXT NOT NULL);

INSERT INTO users VALUES (1, '13800000000', '演示用户', 'Demo1234', '2026-07-23T09:00:00.000Z');
INSERT INTO categories VALUES (1, '数码生活'), (2, '居家好物'), (3, '学习办公'), (4, '轻运动');
INSERT INTO products VALUES
 (1,1,'云隙降噪耳机','通勤时刻，也能拥有一小段安静。',299,30,'🎧'),
 (2,1,'曜石机械键盘','紧凑配列，柔和白光。',369,18,'⌨️'),
 (3,1,'漫游充电宝','10000mAh 双向快充。',159,42,'🔋'),
 (4,1,'微光桌面音箱','小巧立体声，适合书桌。',219,25,'🔊'),
 (5,1,'折光阅读灯','三档色温，无频闪照明。',129,33,'💡'),
 (6,1,'简约平板支架','铝合金折叠支架。',79,55,'📱'),
 (7,2,'山岚香薰机','超声波细雾与定时模式。',189,24,'🌿'),
 (8,2,'晨雾马克杯','350ml 陶瓷杯，手感温润。',68,60,'☕'),
 (9,2,'柔棉四件套','亲肤棉质，四季可用。',429,16,'🛏️'),
 (10,2,'午后抱枕','高回弹填充，搭配沙发。',99,38,'🛋️'),
 (11,2,'星点收纳盒','模块化叠放设计。',49,70,'📦'),
 (12,2,'溪石保温壶','保温 12 小时，600ml。',139,22,'🫖'),
 (13,3,'沉浸番茄钟','专注、休息与白噪音。',89,35,'⏲️'),
 (14,3,'留白笔记本','A5 点阵内页，180 页。',36,90,'📓'),
 (15,3,'晴川签字笔套装','0.5mm 顺滑书写，12 色。',59,68,'🖊️'),
 (16,3,'立式文件架','三格分类，桌面更整洁。',85,30,'🗂️'),
 (17,3,'轻舟双肩包','15 英寸电脑仓与防泼水面料。',259,20,'🎒'),
 (18,3,'纸感鼠标垫','细腻纹理，易清洁。',45,48,'🖱️'),
 (19,4,'云步瑜伽垫','加厚防滑，展开即练。',168,27,'🧘'),
 (20,4,'远行水杯','吸管杯盖，750ml 容量。',88,44,'🥤'),
 (21,4,'轻盈跳绳','可调节长度，计数手柄。',72,39,'🪢'),
 (22,4,'夜跑腰包','反光条与独立耳机孔。',118,19,'🏃'),
 (23,4,'探索野餐垫','防潮折叠，双人尺寸。',149,26,'🏕️'),
 (24,4,'晨风毛巾','速干材质，三条装。',55,63,'🧺');
INSERT INTO addresses VALUES (1, 1, '演示用户', '13800000000', '上海市浦东新区星河路 88 号 101 室', 1);
INSERT INTO orders VALUES (1, 'SHOP-0001', 1, '已支付', 299, '{"recipient":"演示用户","phone":"13800000000","detail":"上海市浦东新区星河路 88 号 101 室"}', '2026-07-23T09:00:00.000Z');
INSERT INTO order_items VALUES (1, 1, 1, '云隙降噪耳机', 299, 1, '🎧');
