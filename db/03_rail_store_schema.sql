USE kandypack;

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