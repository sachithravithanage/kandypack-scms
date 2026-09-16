USE kandypack;
CREATE TABLE product (
product_id INT AUTO_INCREMENT PRIMARY KEY,
`name` VARCHAR(150) NOT NULL UNIQUE,
unit_price DECIMAL(8,2) NOT NULL,
space_consumption_rate DECIMAL(6,2)
);

CREATE TABLE route (
route_id INT PRIMARY KEY,
store_id INT NOT NULL,
`name` VARCHAR(150) NOT NULL UNIQUE,
coverage_area TEXT NOT NULL,
max_delivery_time_minutes INT NOT NULL,
service_days VARCHAR(200) NOT NULL
);

CREATE TABLE customer (
user_id INT AUTO_INCREMENT PRIMARY KEY,
phone VARCHAR(10) NOT NULL UNIQUE,
address VARCHAR(200) NOT NULL,
city_id INT
);

CREATE TABLE order_id (
order_id INT AUTO_INCREMENT PRIMARY KEY,
customer_id INT NOT NULL,
route_id INT NOT NULL,
order_date DATE NOT NULL,
requested_delivery_date DATE NOT NULL,
`status` VARCHAR(30) NOT NULL DEFAULT 'Placed',
total_value DECIMAL(11,2) NOT NULL,
total_volume DECIMAL(10,2),
FOREIGN KEY (customer_id) REFERENCES customer(user_id),
FOREIGN KEY (route_id) REFERENCES route(route_id)
);

CREATE TABLE order_item (
order_item_id INT AUTO_INCREMENT PRIMARY KEY,
order_id INT NOT NULL,
product_id INT NOT NULL,
quantity INT NOT NULL,
status VARCHAR(30),
FOREIGN KEY (order_id) REFERENCES order_id(order_id),
FOREIGN KEY (product_id) REFERENCES product(product_id)
);

