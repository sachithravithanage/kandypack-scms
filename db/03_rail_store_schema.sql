USE kandypack;

-- ============================================================
-- Table: train
-- Master list of train units (REQ-RAIL-01)
-- ============================================================
CREATE TABLE IF NOT EXISTS train (
  train_id INT AUTO_INCREMENT PRIMARY KEY,
  name     VARCHAR(100) NOT NULL
);

-- ============================================================
-- Table: train_trip
-- A single scheduled journey from Kandy to a destination city.
-- Fixed capacity entered by the Administrator (REQ-RAIL-01).
-- status: 'Scheduled' → 'Loaded' (all cargo physically loaded)
-- ============================================================
CREATE TABLE IF NOT EXISTS train_trip (
  trip_id               INT AUTO_INCREMENT PRIMARY KEY,
  train_id              INT            NOT NULL,
  destination_city_id   INT            NOT NULL,
  departure_datetime    DATETIME       NOT NULL,
  arrival_datetime      DATETIME       NOT NULL,
  total_capacity        DECIMAL(10, 2) NOT NULL,
  status                VARCHAR(30)    NOT NULL DEFAULT 'Scheduled',
  FOREIGN KEY (train_id)            REFERENCES train(train_id),
  FOREIGN KEY (destination_city_id) REFERENCES city(city_id)
);

-- ============================================================
-- Table: store
-- Regional store at each destination city.
-- ============================================================
CREATE TABLE IF NOT EXISTS store (
  store_id INT          AUTO_INCREMENT PRIMARY KEY,
  city_id  INT          NOT NULL,
  name     VARCHAR(150) NOT NULL,
  address  VARCHAR(255),
  FOREIGN KEY (city_id) REFERENCES city(city_id)
);

-- ============================================================
-- Table: cargo_allocation
-- Links an order_item to a train_trip, recording both the
-- allocated quantity (what the manifest says) and the
-- received quantity (what the store actually received).
-- One row per order_item per trip.
-- REQ-RAIL-03, REQ-RAIL-04, REQ-RAIL-06, REQ-STORE-01/02
-- status (loading): 'Not Loaded' | 'Partially Loaded' | 'Loaded'
-- ============================================================
CREATE TABLE IF NOT EXISTS cargo_allocation (
  cargo_allocation_id INT         AUTO_INCREMENT PRIMARY KEY,
  order_item_id       INT         NOT NULL,
  trip_id             INT         NOT NULL,
  allocated_quantity  INT         NOT NULL,
  status              VARCHAR(30) NOT NULL DEFAULT 'Not Loaded',
  received_quantity   INT         DEFAULT NULL,
  discrepancy_flag    BOOLEAN     NOT NULL DEFAULT FALSE,
  discrepancy_note    TEXT        DEFAULT NULL,
  FOREIGN KEY (order_item_id) REFERENCES order_item(order_item_id),
  FOREIGN KEY (trip_id)       REFERENCES train_trip(trip_id)
);

-- ============================================================
-- Table: store_inventory
-- Append-only receipt ledger: one row per confirmed shipment.
-- Current stock for a store+product = SUM(quantity_on_hand).
-- UNIQUE on cargo_allocation_id prevents double-counting.
-- REQ-STORE-03
-- ============================================================
CREATE TABLE IF NOT EXISTS store_inventory (
  store_inventory_id  INT      AUTO_INCREMENT PRIMARY KEY,
  store_id            INT      NOT NULL,
  product_id          INT      NOT NULL,
  cargo_allocation_id INT      NOT NULL UNIQUE,
  quantity_on_hand    INT      NOT NULL DEFAULT 0,
  received_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id)            REFERENCES store(store_id),
  FOREIGN KEY (product_id)          REFERENCES product(product_id),
  FOREIGN KEY (cargo_allocation_id) REFERENCES cargo_allocation(cargo_allocation_id)
);

-- Link route → store now that store table exists (Member B's pending FK)
ALTER TABLE route ADD FOREIGN KEY (store_id) REFERENCES store(store_id);
