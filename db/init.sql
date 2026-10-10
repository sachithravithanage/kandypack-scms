CREATE DATABASE IF NOT EXISTS kandypack;
USE kandypack;

-- 01_users_schema.sql
CREATE TABLE role (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO role (role_name) VALUES
  ('Administrator'), ('Dispatcher'), ('Regional Store Manager'),
  ('Driver'), ('Assistant'), ('Customer');

CREATE TABLE `user` (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES role(role_id)
);

CREATE TABLE employee (
  user_id INT PRIMARY KEY,
  FOREIGN KEY (user_id) REFERENCES `user`(user_id) ON DELETE CASCADE
);

CREATE TABLE city (
  city_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO city (name) VALUES
  ('Colombo'), ('Negombo'), ('Galle'), ('Matara'), ('Jaffna'), ('Trincomalee');

CREATE TABLE audit_log (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(255) NOT NULL,
  table_affected VARCHAR(100),
  record_id INT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  details TEXT,
  FOREIGN KEY (user_id) REFERENCES `user`(user_id)
);

-- 02_orders_schema.sql
CREATE TABLE product (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  unit_price DECIMAL(8,2) NOT NULL,
  space_consumption_rate DECIMAL(6,2) NOT NULL
);

CREATE TABLE route (
  route_id INT PRIMARY KEY,
  store_id INT NOT NULL,
  name VARCHAR(150) NOT NULL UNIQUE,
  max_delivery_time_minutes INT NOT NULL,
  service_days VARCHAR(200) NOT NULL
);

CREATE TABLE route_stop (
  route_stop_id INT AUTO_INCREMENT PRIMARY KEY,
  route_id INT NOT NULL,
  stop_name VARCHAR(100) NOT NULL,
  stop_order INT NOT NULL,
  approx_distance_km DECIMAL(5,2) NULL,
  UNIQUE (route_id, stop_order),
  FOREIGN KEY (route_id) REFERENCES route(route_id) ON DELETE CASCADE
);

CREATE TABLE customer (
  user_id INT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  address VARCHAR(200) NOT NULL,
  city_id INT,
  FOREIGN KEY (user_id) REFERENCES `user`(user_id) ON DELETE CASCADE,
  FOREIGN KEY (city_id) REFERENCES city(city_id)
);

CREATE TABLE `order` (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  route_id INT NOT NULL,
  route_stop_id INT NOT NULL,
  delivery_address VARCHAR(255) NOT NULL,
  order_date DATE NOT NULL,
  requested_delivery_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Placed',
  total_value DECIMAL(11,2) NOT NULL,
  total_volume DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customer(user_id),
  FOREIGN KEY (route_id) REFERENCES route(route_id),
  FOREIGN KEY (route_stop_id) REFERENCES route_stop(route_stop_id)
);

CREATE TABLE order_item (
  order_item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  status VARCHAR(30) DEFAULT 'Pending',
  FOREIGN KEY (order_id) REFERENCES `order`(order_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES product(product_id)
);

-- 03_rail_store_schema.sql
CREATE TABLE train (
  train_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE train_trip (
  trip_id INT AUTO_INCREMENT PRIMARY KEY,
  train_id INT NOT NULL,
  destination_city_id INT NOT NULL,
  departure_datetime DATETIME NOT NULL,
  arrival_datetime DATETIME NOT NULL,
  total_capacity DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) DEFAULT 'Scheduled',
  FOREIGN KEY (train_id) REFERENCES train(train_id),
  FOREIGN KEY (destination_city_id) REFERENCES city(city_id)
);

CREATE TABLE store (
  store_id INT AUTO_INCREMENT PRIMARY KEY,
  city_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255),
  FOREIGN KEY (city_id) REFERENCES city(city_id)
);

CREATE TABLE cargo_allocation (
  cargo_allocation_id INT AUTO_INCREMENT PRIMARY KEY,
  order_item_id INT NOT NULL,
  trip_id INT NOT NULL,
  allocated_quantity INT NOT NULL,
  status VARCHAR(30) DEFAULT 'Not Loaded',
  received_quantity INT,
  discrepancy_flag BOOLEAN DEFAULT FALSE,
  discrepancy_note TEXT,
  FOREIGN KEY (order_item_id) REFERENCES order_item(order_item_id),
  FOREIGN KEY (trip_id) REFERENCES train_trip(trip_id)
);

CREATE TABLE store_inventory (
  store_inventory_id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  product_id INT NOT NULL,
  cargo_allocation_id INT NOT NULL UNIQUE,
  quantity_on_hand INT NOT NULL DEFAULT 0,
  FOREIGN KEY (store_id) REFERENCES store(store_id),
  FOREIGN KEY (product_id) REFERENCES product(product_id),
  FOREIGN KEY (cargo_allocation_id) REFERENCES cargo_allocation(cargo_allocation_id)
);

ALTER TABLE route ADD FOREIGN KEY (store_id) REFERENCES store(store_id);

-- 04_roster_delivery_schema.sql
CREATE TABLE driver (
  user_id INT PRIMARY KEY,
  license_number VARCHAR(50) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES employee(user_id) ON DELETE CASCADE
);

CREATE TABLE assistant (
  user_id INT PRIMARY KEY,
  FOREIGN KEY (user_id) REFERENCES employee(user_id) ON DELETE CASCADE
);

CREATE TABLE truck (
  truck_id INT AUTO_INCREMENT PRIMARY KEY,
  plate_number VARCHAR(20) NOT NULL UNIQUE,
  capacity DECIMAL(10,2) NOT NULL
);

CREATE TABLE truck_schedule (
  truck_schedule_id INT AUTO_INCREMENT PRIMARY KEY,
  route_id INT NOT NULL,
  truck_id INT NOT NULL,
  driver_id INT NOT NULL,
  assistant_id INT NOT NULL,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(30) DEFAULT 'Scheduled',
  pickup_confirmed_at DATETIME NULL,
  FOREIGN KEY (route_id) REFERENCES route(route_id),
  FOREIGN KEY (truck_id) REFERENCES truck(truck_id),
  FOREIGN KEY (driver_id) REFERENCES driver(user_id),
  FOREIGN KEY (assistant_id) REFERENCES assistant(user_id)
);

CREATE TABLE truck_allocation (
  truck_allocation_id INT AUTO_INCREMENT PRIMARY KEY,
  truck_schedule_id INT NOT NULL,
  order_id INT NOT NULL,
  route_stop_id INT NOT NULL,
  delivery_status ENUM('Pending', 'Delivered', 'Failed', 'Attempted') NOT NULL DEFAULT 'Pending',
  delivered_at DATETIME NULL,
  delivery_note TEXT NULL,
  FOREIGN KEY (truck_schedule_id) REFERENCES truck_schedule(truck_schedule_id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES `order`(order_id),
  FOREIGN KEY (route_stop_id) REFERENCES route_stop(route_stop_id)
);

CREATE TABLE roster_log (
  roster_log_id INT AUTO_INCREMENT PRIMARY KEY,
  truck_schedule_id INT NOT NULL UNIQUE,
  actual_start_time DATETIME NOT NULL,
  actual_end_time DATETIME NOT NULL,
  actual_hours_worked DECIMAL(5,2) GENERATED ALWAYS AS (
    TIMESTAMPDIFF(MINUTE, actual_start_time, actual_end_time) / 60.0
  ) STORED,
  FOREIGN KEY (truck_schedule_id) REFERENCES truck_schedule(truck_schedule_id)
);

CREATE TABLE system_parameter (
  param_name VARCHAR(50) PRIMARY KEY,
  param_value VARCHAR(50) NOT NULL
);

INSERT INTO system_parameter VALUES ('driver_min_rest_hours', '2');

-- 05_notifications_schema.sql
CREATE TABLE notification (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES `user`(user_id) ON DELETE CASCADE
);

-- 06_inventory_schema.sql
CREATE TABLE main_inventory (
  inventory_id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL UNIQUE,
  quantity_in_stock INT NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES product(product_id)
);

-- Seed data required for local development and acceptance testing.
-- Seed users use Password123! as their local-only password.
INSERT INTO product (product_id, name, unit_price, space_consumption_rate) VALUES
  (1, 'Rice 5kg', 1450.00, 5.00),
  (2, 'Dhal 1kg', 420.00, 1.20),
  (3, 'Sugar 1kg', 360.00, 1.10),
  (4, 'Tea  kahawa 200g', 780.00, 0.40),
  (5, 'Coconut Oil 1L', 920.00, 1.00),
  (6, 'Canned Fish 425g', 680.00, 0.50),
  (7, 'Wheat Flour 1kg', 310.00, 1.10),
  (8, 'Soap Pack', 540.00, 0.80),
  (9, 'Biscuits Family Pack', 460.00, 0.70),
  (10, 'Milk Powder 400g', 1250.00, 0.60);

INSERT INTO main_inventory (product_id, quantity_in_stock) VALUES
  (1, 1000), (2, 1200), (3, 1200), (4, 800), (5, 700),
  (6, 900), (7, 1100), (8, 950), (9, 1000), (10, 750);

INSERT INTO `user` (user_id, name, email, password_hash, role_id) VALUES
  (1, 'System Administrator', 'admin@kandypack.local', '$2b$10$XdP.SYjmvXCoVzL1pzSKk.VjCU.eatS800ipR2KLn8d5Wl8TZ4GGy', 1),
  (2, 'Dispatch Controller', 'dispatcher@kandypack.local', '$2b$10$XdP.SYjmvXCoVzL1pzSKk.VjCU.eatS800ipR2KLn8d5Wl8TZ4GGy', 2),
  (3, 'Colombo Store Manager', 'manager@kandypack.local', '$2b$10$XdP.SYjmvXCoVzL1pzSKk.VjCU.eatS800ipR2KLn8d5Wl8TZ4GGy', 3),
  (4, 'Nimal Perera', 'driver@kandypack.local', '$2b$10$XdP.SYjmvXCoVzL1pzSKk.VjCU.eatS800ipR2KLn8d5Wl8TZ4GGy', 4),
  (5, 'Kamal Silva', 'assistant@kandypack.local', '$2b$10$XdP.SYjmvXCoVzL1pzSKk.VjCU.eatS800ipR2KLn8d5Wl8TZ4GGy', 5);

INSERT INTO `user` (user_id, name, email, password_hash, role_id)
WITH RECURSIVE customer_numbers AS (
  SELECT 1 AS customer_number
  UNION ALL
  SELECT customer_number + 1
  FROM customer_numbers
  WHERE customer_number < 40
)
SELECT
  customer_number + 6,
  CONCAT('Sample Customer ', customer_number),
  CONCAT('customer', customer_number, '@kandypack.local'),
  '$2b$10$XdP.SYjmvXCoVzL1pzSKk.VjCU.eatS800ipR2KLn8d5Wl8TZ4GGy',
  6
FROM customer_numbers;

INSERT INTO employee (user_id) VALUES (1), (2), (3), (4), (5);
INSERT INTO driver (user_id, license_number) VALUES (4, 'B1234567');
INSERT INTO assistant (user_id) VALUES (5);

INSERT INTO customer (user_id, phone, address, city_id)
WITH RECURSIVE customer_numbers AS (
  SELECT 1 AS customer_number
  UNION ALL
  SELECT customer_number + 1
  FROM customer_numbers
  WHERE customer_number < 40
)
SELECT
  customer_number + 6,
  CONCAT('077100', LPAD(customer_number, 4, '0')),
  CONCAT(customer_number, ' Sample Customer Lane'),
  MOD(customer_number - 1, 6) + 1
FROM customer_numbers;

INSERT INTO store (store_id, city_id, name, address) VALUES
  (1, 1, 'Colombo Central Store', '1 Main Street, Colombo'),
  (2, 2, 'Negombo Coastal Store', '2 Beach Road, Negombo'),
  (3, 3, 'Galle Southern Store', '3 Fort Road, Galle'),
  (4, 4, 'Matara Regional Store', '4 Station Road, Matara'),
  (5, 5, 'Jaffna Northern Store', '5 Temple Road, Jaffna'),
  (6, 6, 'Trincomalee Eastern Store', '6 Harbour Road, Trincomalee'),
  (7, 1, 'Colombo East Store', '7 Lake Road, Colombo'),
  (8, 2, 'Negombo North Store', '8 Market Road, Negombo'),
  (9, 3, 'Galle Harbour Store', '9 Port Road, Galle'),
  (10, 4, 'Matara South Store', '10 Beach Road, Matara');

INSERT INTO route (route_id, store_id, name, max_delivery_time_minutes, service_days) VALUES
  (1, 1, 'Colombo Central Route', 120, 'Mon,Wed,Fri'),
  (2, 2, 'Negombo Coastal Route', 150, 'Tue,Thu,Sat'),
  (3, 3, 'Galle Southern Route', 240, 'Mon,Thu'),
  (4, 4, 'Matara Regional Route', 270, 'Tue,Fri'),
  (5, 5, 'Jaffna Northern Route', 480, 'Wed,Sat'),
  (6, 6, 'Trincomalee Eastern Route', 420, 'Mon,Wed'),
  (7, 7, 'Colombo East Route', 135, 'Tue,Thu,Sat'),
  (8, 8, 'Negombo North Route', 165, 'Mon,Wed,Fri'),
  (9, 9, 'Galle Harbour Route', 255, 'Tue,Thu'),
  (10, 10, 'Matara South Route', 285, 'Wed,Sat');

INSERT INTO route_stop (route_id, stop_name, stop_order, approx_distance_km) VALUES
  (1, 'Colombo Fort', 1, 0.00), (1, 'Pettah Market', 2, 3.50),
  (2, 'Negombo Bus Stand', 1, 0.00), (2, 'Kochchikade', 2, 8.00),
  (3, 'Galle Fort', 1, 0.00), (3, 'Hikkaduwa', 2, 18.00),
  (4, 'Matara Town', 1, 0.00), (4, 'Weligama', 2, 15.00),
  (5, 'Jaffna Town', 1, 0.00), (5, 'Chavakachcheri', 2, 18.00),
  (6, 'Trincomalee Town', 1, 0.00), (6, 'Kinniya', 2, 12.00),
  (7, 'Rajagiriya', 1, 0.00), (7, 'Battaramulla', 2, 6.00),
  (8, 'Katunayake', 1, 0.00), (8, 'Seeduwa', 2, 7.00),
  (9, 'Unawatuna', 1, 0.00), (9, 'Dodanduwa', 2, 11.00),
  (10, 'Dondra', 1, 0.00), (10, 'Akuressa', 2, 22.00);

INSERT INTO train (train_id, name) VALUES
  (1, 'Kandyan Express'), (2, 'Southern Supply Line'), (3, 'Northern Freight Link');

INSERT INTO train_trip
  (trip_id, train_id, destination_city_id, departure_datetime, arrival_datetime, total_capacity, status)
VALUES
  (1, 1, 1, '2026-11-10 06:00:00', '2026-11-10 09:00:00', 15000.00, 'Scheduled'),
  (2, 1, 3, '2026-11-11 06:00:00', '2026-11-11 12:00:00', 15000.00, 'Scheduled'),
  (3, 2, 4, '2026-11-12 05:30:00', '2026-11-12 11:00:00', 18000.00, 'Scheduled'),
  (4, 2, 5, '2026-11-13 04:30:00', '2026-11-13 16:00:00', 18000.00, 'Scheduled'),
  (5, 3, 6, '2026-11-14 05:00:00', '2026-11-14 14:00:00', 20000.00, 'Scheduled'),
  (6, 3, 2, '2026-11-15 06:00:00', '2026-11-15 10:00:00', 20000.00, 'Scheduled');

INSERT INTO `order`
  (order_id, customer_id, route_id, route_stop_id, delivery_address,
   order_date, requested_delivery_date, status, total_value, total_volume)
WITH RECURSIVE order_numbers AS (
  SELECT 1 AS order_number
  UNION ALL
  SELECT order_number + 1
  FROM order_numbers
  WHERE order_number < 40
)
SELECT
  order_number,
  order_number + 6,
  FLOOR((order_number - 1) / 4) + 1,
  ((FLOOR((order_number - 1) / 4)) * 2) + MOD(order_number - 1, 2) + 1,
  CONCAT(order_number, ' Sample Customer Lane'),
  '2026-11-01',
  DATE_ADD('2026-11-01', INTERVAL MOD(order_number, 10) DAY),
  CASE
    WHEN MOD(order_number, 5) = 0 THEN 'Delivered'
    WHEN MOD(order_number, 3) = 0 THEN 'Dispatched'
    ELSE 'Placed'
  END,
  500.00 + (order_number * 125.00),
  5.00 + (order_number * 0.50)
FROM order_numbers;

INSERT INTO order_item (order_item_id, order_id, product_id, quantity, status)
WITH RECURSIVE item_numbers AS (
  SELECT 1 AS item_number
  UNION ALL
  SELECT item_number + 1
  FROM item_numbers
  WHERE item_number < 80
)
SELECT
  item_number,
  FLOOR((item_number - 1) / 2) + 1,
  MOD(item_number - 1, 10) + 1,
  5 + MOD(item_number, 6),
  CASE
    WHEN MOD(FLOOR((item_number - 1) / 2) + 1, 5) = 0 THEN 'Fulfilled'
    ELSE 'Pending'
  END
FROM item_numbers;

INSERT INTO truck (truck_id, plate_number, capacity) VALUES
  (1, 'KDY-1001', 5000.00), (2, 'KDY-1002', 5000.00),
  (3, 'KDY-1003', 6000.00), (4, 'KDY-1004', 6000.00),
  (5, 'KDY-1005', 7000.00), (6, 'KDY-1006', 7000.00),
  (7, 'KDY-1007', 8000.00), (8, 'KDY-1008', 8000.00),
  (9, 'KDY-1009', 9000.00), (10, 'KDY-1010', 9000.00);

INSERT INTO truck_schedule
  (truck_schedule_id, route_id, truck_id, driver_id, assistant_id,
   scheduled_date, start_time, end_time, status)
WITH RECURSIVE schedule_numbers AS (
  SELECT 1 AS schedule_number
  UNION ALL
  SELECT schedule_number + 1
  FROM schedule_numbers
  WHERE schedule_number < 10
)
SELECT
  schedule_number,
  schedule_number,
  schedule_number,
  4,
  5,
  DATE_ADD('2026-11-16', INTERVAL schedule_number DAY),
  '07:00:00',
  '17:00:00',
  'Scheduled'
FROM schedule_numbers;

INSERT INTO truck_allocation
  (truck_allocation_id, truck_schedule_id, order_id, route_stop_id, delivery_status)
VALUES
  (1, 1, 1, 1, 'Pending'), (2, 2, 5, 3, 'Pending'),
  (3, 3, 9, 5, 'Pending'), (4, 4, 13, 7, 'Pending'),
  (5, 5, 17, 9, 'Pending'), (6, 6, 21, 11, 'Pending'),
  (7, 7, 25, 13, 'Pending'), (8, 8, 29, 15, 'Pending'),
  (9, 9, 33, 17, 'Pending'), (10, 10, 37, 19, 'Pending');

INSERT INTO notification (user_id, type, message) VALUES
  (1, 'system', 'Seed database initialized successfully.'),
  (2, 'dispatch', 'Ten sample truck schedules are ready for dispatch testing.'),
  (3, 'inventory', 'Sample products and main inventory are available for testing.');

-- 07_advanced_sql.sql
-- Keep the advanced SQL examples in the database initializer so a fresh
-- Docker/MySQL database has the same reporting and integrity features.
ALTER TABLE product
  ADD CONSTRAINT chk_product_price CHECK (unit_price >= 0),
  ADD CONSTRAINT chk_product_space CHECK (space_consumption_rate > 0);

ALTER TABLE main_inventory
  ADD CONSTRAINT chk_inventory_quantity CHECK (quantity_in_stock >= 0);

ALTER TABLE order_item
  ADD CONSTRAINT chk_order_item_quantity CHECK (quantity > 0);

CREATE INDEX idx_order_customer_status
  ON `order` (customer_id, status, order_date);

CREATE INDEX idx_order_item_product
  ON order_item (product_id, order_id);

CREATE INDEX idx_trip_destination_departure
  ON train_trip (destination_city_id, departure_datetime);

CREATE INDEX idx_schedule_date_status
  ON truck_schedule (scheduled_date, status);

CREATE OR REPLACE VIEW v_inventory_overview AS
SELECT
  p.product_id,
  p.name AS product_name,
  p.unit_price,
  COALESCE(mi.quantity_in_stock, 0) AS quantity_in_stock,
  CASE
    WHEN COALESCE(mi.quantity_in_stock, 0) = 0 THEN 'Out of stock'
    WHEN COALESCE(mi.quantity_in_stock, 0) < 100 THEN 'Low stock'
    ELSE 'In stock'
  END AS stock_status
FROM product AS p
LEFT JOIN main_inventory AS mi ON mi.product_id = p.product_id;

CREATE OR REPLACE VIEW v_order_delivery_summary AS
SELECT
  o.order_id,
  u.name AS customer_name,
  c.name AS destination_city,
  r.name AS route_name,
  s.name AS store_name,
  o.status,
  o.requested_delivery_date,
  o.total_value,
  COALESCE(SUM(oi.quantity), 0) AS total_units
FROM `order` AS o
JOIN customer AS cu ON cu.user_id = o.customer_id
JOIN `user` AS u ON u.user_id = cu.user_id
LEFT JOIN city AS c ON c.city_id = cu.city_id
JOIN route AS r ON r.route_id = o.route_id
JOIN store AS s ON s.store_id = r.store_id
LEFT JOIN order_item AS oi ON oi.order_id = o.order_id
GROUP BY
  o.order_id, u.name, c.name, r.name, s.name, o.status,
  o.requested_delivery_date, o.total_value;

CREATE OR REPLACE VIEW v_order_value_rankings AS
SELECT
  summary.*,
  RANK() OVER (
    PARTITION BY summary.route_name
    ORDER BY summary.total_value DESC
  ) AS route_value_rank,
  SUM(summary.total_value) OVER (
    PARTITION BY summary.route_name
  ) AS route_total_value
FROM v_order_delivery_summary AS summary;

DELIMITER //

CREATE FUNCTION fn_order_item_value(p_product_id INT, p_quantity INT)
RETURNS DECIMAL(14, 2)
DETERMINISTIC
READS SQL DATA
SQL SECURITY INVOKER
BEGIN
  DECLARE v_unit_price DECIMAL(8, 2);
  SELECT unit_price INTO v_unit_price
  FROM product
  WHERE product_id = p_product_id;
  RETURN COALESCE(v_unit_price, 0) * p_quantity;
END//

CREATE PROCEDURE sp_restock_product(
  IN p_product_id INT,
  IN p_quantity_added INT,
  IN p_user_id INT
)
SQL SECURITY INVOKER
BEGIN
  DECLARE v_product_exists INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_quantity_added IS NULL OR p_quantity_added <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Restock quantity must be a positive integer';
  END IF;

  SELECT COUNT(*) INTO v_product_exists
  FROM product
  WHERE product_id = p_product_id;

  IF v_product_exists = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Product does not exist';
  END IF;

  START TRANSACTION;
  INSERT INTO main_inventory (product_id, quantity_in_stock)
  VALUES (p_product_id, p_quantity_added)
  ON DUPLICATE KEY UPDATE
    quantity_in_stock = quantity_in_stock + p_quantity_added;
  INSERT INTO audit_log
    (user_id, action, table_affected, record_id, details)
  VALUES
    (p_user_id, 'Restocked product', 'main_inventory', p_product_id,
     CONCAT('quantity_added ', p_quantity_added));
  COMMIT;
END//

CREATE TRIGGER trg_order_item_validate_insert
BEFORE INSERT ON order_item
FOR EACH ROW
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Order item quantity must be positive';
  END IF;
END//

CREATE TRIGGER trg_inventory_validate_update
BEFORE UPDATE ON main_inventory
FOR EACH ROW
BEGIN
  IF NEW.quantity_in_stock < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Inventory quantity cannot be negative';
  END IF;
END//

DELIMITER ;
