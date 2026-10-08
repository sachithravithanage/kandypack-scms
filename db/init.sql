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
