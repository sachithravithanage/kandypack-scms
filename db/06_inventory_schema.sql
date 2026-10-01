USE kandypack;

CREATE TABLE main_inventory (
  inventory_id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL UNIQUE,
  quantity_in_stock INT NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES product(product_id)
);
