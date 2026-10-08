USE kandypack;

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
  delivered_at DATETIME NULL,
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