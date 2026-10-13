-- ================================================================
-- Kandypack SCMS Full Database Dump
-- Generated: 2026-10-12T06:17:57.981Z
-- ================================================================

USE kandypack;
SET FOREIGN_KEY_CHECKS = 0;

-- Ensure required views exist
CREATE OR REPLACE VIEW v_customer_orders AS
SELECT o.order_id, o.customer_id, o.route_id, o.route_stop_id,
       o.delivery_address, o.order_date, o.requested_delivery_date,
       o.status, o.total_value, o.total_volume, o.delivered_at,
       r.name AS route_name, rs.stop_name
  FROM `order` o
  LEFT JOIN route r ON o.route_id = r.route_id
  LEFT JOIN route_stop rs ON o.route_stop_id = rs.route_stop_id;

CREATE OR REPLACE VIEW v_driver_assigned_runs AS
SELECT
    ts.truck_schedule_id,
    ts.route_id,
    r.name AS route_name,
    r.max_delivery_time_minutes,
    ts.truck_id,
    tk.plate_number,
    tk.capacity AS truck_capacity,
    ts.driver_id,
    ud.name AS driver_name,
    ts.assistant_id,
    ua.name AS assistant_name,
    DATE_FORMAT(ts.scheduled_date, '%Y-%m-%d') AS scheduled_date,
    ts.start_time,
    ts.end_time,
    ts.status,
    ts.pickup_confirmed_at,
    COUNT(ta.truck_allocation_id) AS total_stops,
    COALESCE(SUM(CASE WHEN ta.delivery_status = 'Delivered' THEN 1 ELSE 0 END), 0) AS delivered_stops,
    COALESCE(SUM(CASE WHEN ta.delivery_status = 'Attempted' THEN 1 ELSE 0 END), 0) AS attempted_stops,
    COALESCE(SUM(CASE WHEN ta.delivery_status = 'Failed' THEN 1 ELSE 0 END), 0) AS failed_stops,
    COALESCE(SUM(CASE WHEN ta.delivery_status = 'Pending' THEN 1 ELSE 0 END), 0) AS pending_stops
FROM
    truck_schedule ts
    JOIN route r ON ts.route_id = r.route_id
    JOIN truck tk ON ts.truck_id = tk.truck_id
    JOIN `user` ud ON ts.driver_id = ud.user_id
    JOIN `user` ua ON ts.assistant_id = ua.user_id
    LEFT JOIN truck_allocation ta ON ts.truck_schedule_id = ta.truck_schedule_id
GROUP BY
    ts.truck_schedule_id,
    ts.route_id,
    r.name,
    r.max_delivery_time_minutes,
    ts.truck_id,
    tk.plate_number,
    tk.capacity,
    ts.driver_id,
    ud.name,
    ts.assistant_id,
    ua.name,
    ts.scheduled_date,
    ts.start_time,
    ts.end_time,
    ts.status,
    ts.pickup_confirmed_at;

-- ------------------------------------------------------------
-- Table: `role` (6 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `role` (`role_id`, `role_name`) VALUES (1, 'Administrator');
INSERT IGNORE INTO `role` (`role_id`, `role_name`) VALUES (5, 'Assistant');
INSERT IGNORE INTO `role` (`role_id`, `role_name`) VALUES (6, 'Customer');
INSERT IGNORE INTO `role` (`role_id`, `role_name`) VALUES (2, 'Dispatcher');
INSERT IGNORE INTO `role` (`role_id`, `role_name`) VALUES (4, 'Driver');
INSERT IGNORE INTO `role` (`role_id`, `role_name`) VALUES (3, 'Regional Store Manager');

-- ------------------------------------------------------------
-- Table: `city` (6 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `city` (`city_id`, `name`) VALUES (1, 'Colombo');
INSERT IGNORE INTO `city` (`city_id`, `name`) VALUES (3, 'Galle');
INSERT IGNORE INTO `city` (`city_id`, `name`) VALUES (5, 'Jaffna');
INSERT IGNORE INTO `city` (`city_id`, `name`) VALUES (4, 'Matara');
INSERT IGNORE INTO `city` (`city_id`, `name`) VALUES (2, 'Negombo');
INSERT IGNORE INTO `city` (`city_id`, `name`) VALUES (6, 'Trincomalee');

-- ------------------------------------------------------------
-- Table: `user` (14 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `user` (`user_id`, `name`, `email`, `password_hash`, `role_id`, `is_active`, `created_at`, `phone`, `notification_preferences`) VALUES (1, 'Kasun Perera', 'admin@kandypack.lk', '$2b$10$374Bl.tHpkS2hhlC.2wbNebqy7YMV3f/u6ayVmCI3VVEdHurSIa2O', 1, 1, '2026-10-07 04:36:00', '+1555969013', 'ALL');
INSERT IGNORE INTO `user` (`user_id`, `name`, `email`, `password_hash`, `role_id`, `is_active`, `created_at`, `phone`, `notification_preferences`) VALUES (2, 'Nimal Fernando', 'dispatcher@kandypack.lk', '$2b$10$374Bl.tHpkS2hhlC.2wbNebqy7YMV3f/u6ayVmCI3VVEdHurSIa2O', 2, 1, '2026-10-07 04:36:00', '+1555778890', 'ALL');
INSERT IGNORE INTO `user` (`user_id`, `name`, `email`, `password_hash`, `role_id`, `is_active`, `created_at`, `phone`, `notification_preferences`) VALUES (3, 'Suneth Silva', 'suneth.cmb@kandypack.lk', '$2b$10$374Bl.tHpkS2hhlC.2wbNebqy7YMV3f/u6ayVmCI3VVEdHurSIa2O', 3, 1, '2026-10-07 04:36:00', '+1555723763', 'ALL');
INSERT IGNORE INTO `user` (`user_id`, `name`, `email`, `password_hash`, `role_id`, `is_active`, `created_at`, `phone`, `notification_preferences`) VALUES (5, 'Kamal Gunaratne', 'kamal.driver@kandypack.lk', '$2b$10$374Bl.tHpkS2hhlC.2wbNebqy7YMV3f/u6ayVmCI3VVEdHurSIa2O', 4, 1, '2026-10-07 04:36:00', '+1555177686', 'ALL');
INSERT IGNORE INTO `user` (`user_id`, `name`, `email`, `password_hash`, `role_id`, `is_active`, `created_at`, `phone`, `notification_preferences`) VALUES (6, 'Ajith Kumara', 'ajith.driver@kandypack.lk', '$2b$10$374Bl.tHpkS2hhlC.2wbNebqy7YMV3f/u6ayVmCI3VVEdHurSIa2O', 4, 1, '2026-10-07 04:36:01', '+1555360895', 'ALL');
INSERT IGNORE INTO `user` (`user_id`, `name`, `email`, `password_hash`, `role_id`, `is_active`, `created_at`, `phone`, `notification_preferences`) VALUES (7, 'Bandara Weerakoon', 'bandara.asst@kandypack.lk', '$2b$10$374Bl.tHpkS2hhlC.2wbNebqy7YMV3f/u6ayVmCI3VVEdHurSIa2O', 5, 1, '2026-10-07 04:36:01', '+1555187349', 'ALL');
INSERT IGNORE INTO `user` (`user_id`, `name`, `email`, `password_hash`, `role_id`, `is_active`, `created_at`, `phone`, `notification_preferences`) VALUES (8, 'Chinthaka Dias', 'chinthaka.asst@kandypack.lk', '$2b$10$374Bl.tHpkS2hhlC.2wbNebqy7YMV3f/u6ayVmCI3VVEdHurSIa2O', 5, 1, '2026-10-07 04:36:01', '+1555694035', 'ALL');
INSERT IGNORE INTO `user` (`user_id`, `name`, `email`, `password_hash`, `role_id`, `is_active`, `created_at`, `phone`, `notification_preferences`) VALUES (9, 'Waruni Rathnayake', 'waruni@gmail.com', '$2b$10$374Bl.tHpkS2hhlC.2wbNebqy7YMV3f/u6ayVmCI3VVEdHurSIa2O', 6, 1, '2026-10-07 04:36:01', '+1555426886', '{"sms":true,"email":true,"inApp":true}');
INSERT IGNORE INTO `user` (`user_id`, `name`, `email`, `password_hash`, `role_id`, `is_active`, `created_at`, `phone`, `notification_preferences`) VALUES (999, 'Test Shop Customer', 'shop@test.com', '.tHpkS2hhlC.2wbNebqy7YMV3f/u6ayVmCI3VVEdHurSIa2O', 6, 1, '2026-10-08 13:13:01', '+1555620561', 'ALL');
INSERT IGNORE INTO `user` (`user_id`, `name`, `email`, `password_hash`, `role_id`, `is_active`, `created_at`, `phone`, `notification_preferences`) VALUES (90002, 'System Administrator', 'admin@kandypack.local', '$2b$10$374Bl.tHpkS2hhlC.2wbNebqy7YMV3f/u6ayVmCI3VVEdHurSIa2O', 1, 1, '2026-10-12 05:42:05', NULL, 'ALL');
INSERT IGNORE INTO `user` (`user_id`, `name`, `email`, `password_hash`, `role_id`, `is_active`, `created_at`, `phone`, `notification_preferences`) VALUES (90003, 'Dispatch Controller', 'dispatcher@kandypack.local', '$2b$10$374Bl.tHpkS2hhlC.2wbNebqy7YMV3f/u6ayVmCI3VVEdHurSIa2O', 2, 1, '2026-10-12 05:42:05', NULL, 'ALL');
INSERT IGNORE INTO `user` (`user_id`, `name`, `email`, `password_hash`, `role_id`, `is_active`, `created_at`, `phone`, `notification_preferences`) VALUES (90004, 'Colombo Store Manager', 'manager@kandypack.local', '$2b$10$374Bl.tHpkS2hhlC.2wbNebqy7YMV3f/u6ayVmCI3VVEdHurSIa2O', 3, 1, '2026-10-12 05:42:05', NULL, 'ALL');
INSERT IGNORE INTO `user` (`user_id`, `name`, `email`, `password_hash`, `role_id`, `is_active`, `created_at`, `phone`, `notification_preferences`) VALUES (90005, 'Nimal Perera', 'driver@kandypack.local', '$2b$10$374Bl.tHpkS2hhlC.2wbNebqy7YMV3f/u6ayVmCI3VVEdHurSIa2O', 4, 1, '2026-10-12 05:42:05', NULL, 'ALL');
INSERT IGNORE INTO `user` (`user_id`, `name`, `email`, `password_hash`, `role_id`, `is_active`, `created_at`, `phone`, `notification_preferences`) VALUES (90006, 'Kamal Silva', 'assistant@kandypack.local', '$2b$10$374Bl.tHpkS2hhlC.2wbNebqy7YMV3f/u6ayVmCI3VVEdHurSIa2O', 5, 1, '2026-10-12 05:42:06', NULL, 'ALL');

-- ------------------------------------------------------------
-- Table: `employee` (7 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `employee` (`user_id`) VALUES (1);
INSERT IGNORE INTO `employee` (`user_id`) VALUES (2);
INSERT IGNORE INTO `employee` (`user_id`) VALUES (3);
INSERT IGNORE INTO `employee` (`user_id`) VALUES (5);
INSERT IGNORE INTO `employee` (`user_id`) VALUES (6);
INSERT IGNORE INTO `employee` (`user_id`) VALUES (7);
INSERT IGNORE INTO `employee` (`user_id`) VALUES (8);

-- ------------------------------------------------------------
-- Table: `driver` (2 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `driver` (`user_id`, `license_number`) VALUES (5, 'DL-78234');
INSERT IGNORE INTO `driver` (`user_id`, `license_number`) VALUES (6, 'DL-90112');

-- ------------------------------------------------------------
-- Table: `assistant` (2 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `assistant` (`user_id`) VALUES (7);
INSERT IGNORE INTO `assistant` (`user_id`) VALUES (8);

-- ------------------------------------------------------------
-- Table: `customer` (2 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `customer` (`user_id`, `phone`, `address`, `city_id`) VALUES (1, '0771234567', 'no', 1);
INSERT IGNORE INTO `customer` (`user_id`, `phone`, `address`, `city_id`) VALUES (9, '0703504806', '42 Flower Road, Colombo 07', 1);

-- ------------------------------------------------------------
-- Table: `product` (4 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `product` (`product_id`, `name`, `unit_price`, `space_consumption_rate`) VALUES (101, 'Kandypack Milk Powder 400g', '850.00', '1.20');
INSERT IGNORE INTO `product` (`product_id`, `name`, `unit_price`, `space_consumption_rate`) VALUES (102, 'Kandypack Tea Leaves 200g', '450.00', '0.50');
INSERT IGNORE INTO `product` (`product_id`, `name`, `unit_price`, `space_consumption_rate`) VALUES (103, 'Kandypack Chocolate Biscuits', '220.00', '0.80');
INSERT IGNORE INTO `product` (`product_id`, `name`, `unit_price`, `space_consumption_rate`) VALUES (104, 'Kandypack Sugar 1kg', '300.00', '1.00');

-- ------------------------------------------------------------
-- Table: `main_inventory` (4 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `main_inventory` (`inventory_id`, `product_id`, `quantity_in_stock`) VALUES (1, 101, 4990);
INSERT IGNORE INTO `main_inventory` (`inventory_id`, `product_id`, `quantity_in_stock`) VALUES (2, 102, 4994);
INSERT IGNORE INTO `main_inventory` (`inventory_id`, `product_id`, `quantity_in_stock`) VALUES (3, 103, 4996);
INSERT IGNORE INTO `main_inventory` (`inventory_id`, `product_id`, `quantity_in_stock`) VALUES (4, 104, 4997);

-- ------------------------------------------------------------
-- Table: `store` (6 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `store` (`store_id`, `city_id`, `name`, `address`) VALUES (1, 1, 'Colombo Regional Store', '100 Baseline Road, Colombo 09');
INSERT IGNORE INTO `store` (`store_id`, `city_id`, `name`, `address`) VALUES (2, 3, 'Galle Regional Store', '45 Matara Road, Galle');
INSERT IGNORE INTO `store` (`store_id`, `city_id`, `name`, `address`) VALUES (3, 2, 'Negombo Regional Store', '15 Beach Road, Negombo');
INSERT IGNORE INTO `store` (`store_id`, `city_id`, `name`, `address`) VALUES (4, 4, 'Matara Regional Store', '22 Station Road, Matara');
INSERT IGNORE INTO `store` (`store_id`, `city_id`, `name`, `address`) VALUES (5, 5, 'Jaffna Regional Store', '5 Temple Road, Jaffna');
INSERT IGNORE INTO `store` (`store_id`, `city_id`, `name`, `address`) VALUES (6, 6, 'Trincomalee Regional Store', '88 Inner Harbour Road, Trincomalee');

-- ------------------------------------------------------------
-- Table: `route` (12 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `route` (`route_id`, `store_id`, `name`, `max_delivery_time_minutes`, `service_days`) VALUES (1, 1, 'Colombo Metro North', 240, 'Monday, Wednesday, Friday');
INSERT IGNORE INTO `route` (`route_id`, `store_id`, `name`, `max_delivery_time_minutes`, `service_days`) VALUES (2, 1, 'Colombo Metro South', 300, 'Tuesday, Thursday, Saturday');
INSERT IGNORE INTO `route` (`route_id`, `store_id`, `name`, `max_delivery_time_minutes`, `service_days`) VALUES (3, 3, 'Negombo Coastal Express', 180, 'Monday, Wednesday, Friday');
INSERT IGNORE INTO `route` (`route_id`, `store_id`, `name`, `max_delivery_time_minutes`, `service_days`) VALUES (4, 3, 'Negombo Airport & Industrial Zone', 210, 'Tuesday, Thursday, Saturday');
INSERT IGNORE INTO `route` (`route_id`, `store_id`, `name`, `max_delivery_time_minutes`, `service_days`) VALUES (5, 2, 'Galle Coastal & Heritage Route', 240, 'Monday, Thursday');
INSERT IGNORE INTO `route` (`route_id`, `store_id`, `name`, `max_delivery_time_minutes`, `service_days`) VALUES (6, 2, 'Galle Inland & Medical Corridor', 270, 'Tuesday, Friday');
INSERT IGNORE INTO `route` (`route_id`, `store_id`, `name`, `max_delivery_time_minutes`, `service_days`) VALUES (7, 4, 'Matara Urban Commercial Route', 210, 'Monday, Wednesday, Friday');
INSERT IGNORE INTO `route` (`route_id`, `store_id`, `name`, `max_delivery_time_minutes`, `service_days`) VALUES (8, 4, 'Matara Southern Coast & Weligama', 260, 'Tuesday, Thursday, Saturday');
INSERT IGNORE INTO `route` (`route_id`, `store_id`, `name`, `max_delivery_time_minutes`, `service_days`) VALUES (9, 5, 'Jaffna Peninsula Central Route', 300, 'Monday, Wednesday, Friday');
INSERT IGNORE INTO `route` (`route_id`, `store_id`, `name`, `max_delivery_time_minutes`, `service_days`) VALUES (10, 5, 'Jaffna Northern Coastal Express', 360, 'Tuesday, Thursday, Saturday');
INSERT IGNORE INTO `route` (`route_id`, `store_id`, `name`, `max_delivery_time_minutes`, `service_days`) VALUES (11, 6, 'Trincomalee Harbour & City Route', 240, 'Monday, Wednesday, Friday');
INSERT IGNORE INTO `route` (`route_id`, `store_id`, `name`, `max_delivery_time_minutes`, `service_days`) VALUES (12, 6, 'Trincomalee Coastal Tourism Route', 300, 'Tuesday, Thursday, Saturday');

-- ------------------------------------------------------------
-- Table: `route_stop` (48 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (1, 1, 'Colombo 07 - Cinnamon Gardens', 1, '4.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (2, 1, 'Colombo 03 - Kollupitiya Junction', 2, '7.20');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (3, 2, 'Ratmalana Airport Bypass', 3, '14.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (4, 2, 'Dehiwala Junction Central', 1, '6.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (5, 2, 'Mount Lavinia Hotel Stop', 2, '9.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (101, 1, 'Colombo 10 - Maradana Commercial Hub', 3, '10.80');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (102, 1, 'Colombo 01 - Fort Central Station', 4, '13.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (103, 2, 'Moratuwa Town Crossroad', 4, '18.20');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (201, 3, 'Negombo Town Bus Stand', 1, '3.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (202, 3, 'Kochchikade Central Market', 2, '7.20');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (203, 3, 'Porutota Beach Promenade', 3, '11.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (204, 3, 'Waikkal Bridge Terminal', 4, '15.40');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (205, 4, 'Katunayake FTZ Gate 1', 1, '5.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (206, 4, 'Bandaranaike Airport Cargo Bay', 2, '8.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (207, 4, 'Seeduwa Junction Marketplace', 3, '12.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (208, 4, 'Ja-Ela Express Interchange', 4, '16.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (301, 5, 'Galle Fort Main Gate', 1, '2.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (302, 5, 'Unawatuna Beach Junction', 2, '6.80');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (303, 5, 'Talpe Coastal Bypass', 3, '10.40');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (304, 5, 'Koggala Export Processing Zone', 4, '15.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (305, 6, 'Karapitiya Teaching Hospital Square', 1, '4.20');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (306, 6, 'Labuduwa Agricultural Complex', 2, '7.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (307, 6, 'Baddegama Road Industrial Park', 3, '13.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (308, 6, 'Hikkaduwa Tourism Hub', 4, '19.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (401, 7, 'Matara Fort & Bus Terminal', 1, '2.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (402, 7, 'Nupe Junction Trade Hub', 2, '5.20');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (403, 7, 'Uyanwatta Stadium Road', 3, '8.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (404, 7, 'Rahula Crossroad Commercial Area', 4, '11.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (405, 8, 'Mirissa Harbour Road', 1, '9.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (406, 8, 'Weligama Bay Central Market', 2, '15.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (407, 8, 'Dondra Head Lighthouse Halt', 3, '8.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (408, 8, 'Akuressa Inland Trade Station', 4, '22.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (501, 9, 'Jaffna Town Clock Tower Square', 1, '2.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (502, 9, 'Nallur Kandaswamy Kovil Approach', 2, '5.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (503, 9, 'Kopay Junction Agricultural Center', 3, '10.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (504, 9, 'Chavakachcheri Market Hub', 4, '16.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (505, 10, 'Chunnakam Commercial Market', 1, '8.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (506, 10, 'Tellippalai Hospital Halt', 2, '13.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (507, 10, 'Kankesanthurai (KKS) Harbour Port', 3, '18.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (508, 10, 'Point Pedro Fishery Terminal', 4, '32.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (601, 11, 'Trincomalee Inner Harbour Wharf', 1, '3.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (602, 11, 'Fort Frederick / Koneswaram Road', 2, '5.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (603, 11, 'China Bay Industrial Zone', 3, '10.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (604, 11, 'Kinniya Bridge Main Terminal', 4, '18.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (605, 12, 'Uppuveli Beach Commercial Strip', 1, '6.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (606, 12, 'Nilaveli Tourism Beach Road', 2, '14.50');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (607, 12, 'Kuchchaveli Bypass Halt', 3, '28.00');
INSERT IGNORE INTO `route_stop` (`route_stop_id`, `route_id`, `stop_name`, `stop_order`, `approx_distance_km`) VALUES (608, 12, 'Kantale Agricultural Depot', 4, '38.00');

-- ------------------------------------------------------------
-- Table: `train` (3 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `train` (`train_id`, `name`) VALUES (1, 'Udarata Menike');
INSERT IGNORE INTO `train` (`train_id`, `name`) VALUES (2, 'Intercity Express');
INSERT IGNORE INTO `train` (`train_id`, `name`) VALUES (3, 'Rajarata Rajini');

-- ------------------------------------------------------------
-- Table: `train_trip` (7 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `train_trip` (`trip_id`, `train_id`, `destination_city_id`, `departure_datetime`, `arrival_datetime`, `total_capacity`, `status`) VALUES (1, 1, 1, '2026-10-10 06:00:00', '2026-10-10 09:00:00', '1000.00', 'Scheduled');
INSERT IGNORE INTO `train_trip` (`trip_id`, `train_id`, `destination_city_id`, `departure_datetime`, `arrival_datetime`, `total_capacity`, `status`) VALUES (2, 2, 2, '2026-10-10 07:00:00', '2026-10-10 10:00:00', '800.00', 'Scheduled');
INSERT IGNORE INTO `train_trip` (`trip_id`, `train_id`, `destination_city_id`, `departure_datetime`, `arrival_datetime`, `total_capacity`, `status`) VALUES (3, 3, 3, '2026-10-11 08:00:00', '2026-10-11 12:00:00', '600.00', 'Scheduled');
INSERT IGNORE INTO `train_trip` (`trip_id`, `train_id`, `destination_city_id`, `departure_datetime`, `arrival_datetime`, `total_capacity`, `status`) VALUES (4, 1, 4, '2026-10-11 08:00:00', '2026-10-11 13:00:00', '500.00', 'Scheduled');
INSERT IGNORE INTO `train_trip` (`trip_id`, `train_id`, `destination_city_id`, `departure_datetime`, `arrival_datetime`, `total_capacity`, `status`) VALUES (5, 2, 5, '2026-10-12 05:00:00', '2026-10-12 12:00:00', '700.00', 'Scheduled');
INSERT IGNORE INTO `train_trip` (`trip_id`, `train_id`, `destination_city_id`, `departure_datetime`, `arrival_datetime`, `total_capacity`, `status`) VALUES (6, 3, 6, '2026-10-12 05:30:00', '2026-10-12 13:00:00', '650.00', 'Scheduled');
INSERT IGNORE INTO `train_trip` (`trip_id`, `train_id`, `destination_city_id`, `departure_datetime`, `arrival_datetime`, `total_capacity`, `status`) VALUES (30001, 1, 1, '2026-10-11 11:46:00', '2026-10-11 16:46:00', '1000.00', 'Scheduled');

-- ------------------------------------------------------------
-- Table: `cargo_allocation` (2 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `cargo_allocation` (`cargo_allocation_id`, `order_item_id`, `trip_id`, `allocated_quantity`, `status`, `received_quantity`, `discrepancy_flag`, `discrepancy_note`) VALUES (1, 1005, 1, 1, 'Loaded', 8, 0, 'All good');
INSERT IGNORE INTO `cargo_allocation` (`cargo_allocation_id`, `order_item_id`, `trip_id`, `allocated_quantity`, `status`, `received_quantity`, `discrepancy_flag`, `discrepancy_note`) VALUES (30001, 1005, 30001, 7, 'Not Loaded', NULL, 0, NULL);

-- ------------------------------------------------------------
-- Table: `store_inventory` (1 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `store_inventory` (`store_inventory_id`, `store_id`, `product_id`, `cargo_allocation_id`, `quantity_on_hand`) VALUES (1, 1, 101, 1, 8);

-- ------------------------------------------------------------
-- Table: `order` (29 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (101, 9, 1, 1, '42 Flower Road, Colombo 07', '2026-10-07 00:00:00', '2026-10-07 00:00:00', 'Delivered', '14500.00', '4.50', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (102, 9, 1, 2, '15 Galle Road, Mount Lavinia', '2026-10-07 00:00:00', '2026-10-07 00:00:00', 'In Transit', '8200.00', '6.20', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (103, 9, 1, 3, '88 Maradana Station Road', '2026-10-08 00:00:00', '2026-10-08 00:00:00', 'In Transit', '12300.00', '5.80', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (104, 9, 2, 4, '12 Dehiwala Hill Street', '2026-10-08 00:00:00', '2026-10-08 00:00:00', 'Scheduled', '7400.00', '3.50', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (105, 9, 2, 5, '55 Hotel Road, Mount Lavinia', '2026-10-08 00:00:00', '2026-10-08 00:00:00', 'Placed', '9800.00', '4.20', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (106, 9, 1, 2, '200 High Level Road, Colombo', '2026-10-08 00:00:00', '2026-10-08 00:00:00', 'Placed', '15000.00', '7.50', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (60103, 9, 7, 401, 'no.42', '2026-10-08 00:00:00', '2026-10-15 00:00:00', 'Placed', '2550.00', '3.60', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (60104, 9, 1, 1, '42 Flower Road, Colombo 07', '2026-10-08 00:00:00', '2026-10-25 00:00:00', 'Placed', '2150.00', '2.90', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (90102, 9, 1, 1, '42 Flower Road, Colombo 07', '2026-10-08 00:00:00', '2026-10-30 00:00:00', 'Placed', '1290.00', '2.80', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (90103, 9, 1, 1, 'Updated Delivery Address, Colombo 07', '2026-10-08 00:00:00', '2026-11-05 00:00:00', 'Cancelled', '850.00', '1.20', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (120102, 9, 1, 1, 'No. 126, Mahahena', '2026-10-08 00:00:00', '2026-10-15 00:00:00', 'Placed', '1300.00', '1.70', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (150102, 9, 11, 602, 'abc, cakdy', '2026-10-10 00:00:00', '2026-10-17 00:00:00', 'Placed', '1950.00', '3.50', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (150103, 9, 1, 1, 'No, 42, Priness park', '2026-10-10 00:00:00', '2026-10-17 00:00:00', 'Placed', '220.00', '0.80', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (150104, 9, 1, 1, 'gfg', '2026-10-10 00:00:00', '2026-10-17 00:00:00', 'Placed', '450.00', '0.50', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (180102, 9, 1, 1, '126,mahahena', '2026-10-10 00:00:00', '2026-10-22 00:00:00', 'Placed', '2220.00', '4.20', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (180103, 9, 1, 1, '126,mahahena', '2026-10-10 00:00:00', '2026-10-17 00:00:00', 'Cancelled', '1070.00', '2.00', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (180104, 1, 9, 501, 'no', '2026-10-10 00:00:00', '2026-10-17 00:00:00', 'Placed', '850.00', '1.20', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (180105, 1, 1, 1, 'Fake Address', '2026-08-05 00:00:00', '2026-08-10 00:00:00', 'Delivered', '25000.00', '50.00', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (180106, 1, 1, 1, 'Fake Address', '2026-08-12 00:00:00', '2026-08-15 00:00:00', 'Delivered', '35000.00', '50.00', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (180107, 1, 1, 1, 'Fake Address', '2026-08-18 00:00:00', '2026-08-20 00:00:00', 'Delivered', '12000.00', '50.00', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (180108, 1, 1, 1, 'Fake Address', '2026-08-22 00:00:00', '2026-08-25 00:00:00', 'Delivered', '45000.00', '50.00', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (180109, 1, 1, 1, 'Fake Address', '2026-08-29 00:00:00', '2026-09-02 00:00:00', 'Delivered', '28000.00', '50.00', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (180110, 1, 1, 1, 'Fake Address', '2026-09-03 00:00:00', '2026-09-08 00:00:00', 'Delivered', '55000.00', '50.00', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (180111, 1, 1, 1, 'Fake Address', '2026-09-07 00:00:00', '2026-09-12 00:00:00', 'Delivered', '42000.00', '50.00', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (180112, 1, 1, 1, 'Fake Address', '2026-09-14 00:00:00', '2026-09-18 00:00:00', 'Delivered', '61000.00', '50.00', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (180113, 1, 1, 1, 'Fake Address', '2026-09-16 00:00:00', '2026-09-20 00:00:00', 'Delivered', '18000.00', '50.00', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (180114, 1, 1, 1, 'Fake Address', '2026-09-20 00:00:00', '2026-09-25 00:00:00', 'Delivered', '39000.00', '50.00', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (180115, 1, 1, 1, 'Fake Address', '2026-09-23 00:00:00', '2026-09-28 00:00:00', 'Delivered', '22000.00', '50.00', NULL);
INSERT IGNORE INTO `order` (`order_id`, `customer_id`, `route_id`, `route_stop_id`, `delivery_address`, `order_date`, `requested_delivery_date`, `status`, `total_value`, `total_volume`, `delivered_at`) VALUES (180116, 1, 1, 1, 'Fake Address', '2026-09-28 00:00:00', '2026-10-02 00:00:00', 'Delivered', '54000.00', '50.00', NULL);

-- ------------------------------------------------------------
-- Table: `order_item` (24 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (1001, 101, 101, 10, 'Delivered');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (1002, 101, 102, 15, 'Delivered');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (1003, 102, 103, 25, 'In Transit');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (1004, 103, 104, 30, 'In Transit');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (1005, 104, 101, 8, 'Out for Delivery');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (1006, 105, 102, 12, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (31003, 60103, 101, 3, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (31004, 60104, 101, 2, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (31005, 60104, 102, 1, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (61002, 90102, 101, 1, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (61003, 90102, 103, 2, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (61004, 90103, 101, 1, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (91002, 120102, 101, 1, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (91003, 120102, 102, 1, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (121002, 150102, 102, 3, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (121003, 150102, 104, 2, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (121004, 150103, 103, 1, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (121005, 150104, 102, 1, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (151002, 180102, 101, 2, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (151003, 180102, 103, 1, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (151004, 180102, 104, 1, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (151005, 180103, 101, 1, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (151006, 180103, 103, 1, 'Pending');
INSERT IGNORE INTO `order_item` (`order_item_id`, `order_id`, `product_id`, `quantity`, `status`) VALUES (151007, 180104, 101, 1, 'Pending');

-- ------------------------------------------------------------
-- Table: `truck` (3 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `truck` (`truck_id`, `plate_number`, `capacity`) VALUES (1, 'WP-CAB-1234', '50.00');
INSERT IGNORE INTO `truck` (`truck_id`, `plate_number`, `capacity`) VALUES (2, 'WP-CAD-5678', '40.00');
INSERT IGNORE INTO `truck` (`truck_id`, `plate_number`, `capacity`) VALUES (3, 'SP-CAF-9012', '60.00');

-- ------------------------------------------------------------
-- Table: `system_parameter` (1 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `system_parameter` (`param_name`, `param_value`) VALUES ('driver_min_rest_hours', '2');

-- ------------------------------------------------------------
-- Table: `truck_schedule` (12 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `truck_schedule` (`truck_schedule_id`, `route_id`, `truck_id`, `driver_id`, `assistant_id`, `scheduled_date`, `start_time`, `end_time`, `status`, `pickup_confirmed_at`) VALUES (1, 1, 1, 5, 7, '2026-10-08 00:00:00', '08:00:00', '12:00:00', 'In Progress', '2026-10-08 08:15:00');
INSERT IGNORE INTO `truck_schedule` (`truck_schedule_id`, `route_id`, `truck_id`, `driver_id`, `assistant_id`, `scheduled_date`, `start_time`, `end_time`, `status`, `pickup_confirmed_at`) VALUES (2, 2, 2, 6, 8, '2026-10-08 00:00:00', '13:00:00', '18:00:00', 'Scheduled', NULL);
INSERT IGNORE INTO `truck_schedule` (`truck_schedule_id`, `route_id`, `truck_id`, `driver_id`, `assistant_id`, `scheduled_date`, `start_time`, `end_time`, `status`, `pickup_confirmed_at`) VALUES (3, 1, 3, 6, 8, '2026-10-16 00:00:00', '08:00:00', '12:00:00', 'Scheduled', NULL);
INSERT IGNORE INTO `truck_schedule` (`truck_schedule_id`, `route_id`, `truck_id`, `driver_id`, `assistant_id`, `scheduled_date`, `start_time`, `end_time`, `status`, `pickup_confirmed_at`) VALUES (4, 1, 1, 5, 7, '2026-10-07 00:00:00', '08:00:00', '12:00:00', 'Completed', '2026-10-07 08:00:00');
INSERT IGNORE INTO `truck_schedule` (`truck_schedule_id`, `route_id`, `truck_id`, `driver_id`, `assistant_id`, `scheduled_date`, `start_time`, `end_time`, `status`, `pickup_confirmed_at`) VALUES (10, 1, 1, 5, 7, '2026-10-18 00:00:00', '08:00:00', '12:00:00', 'In Progress', '2026-10-08 10:57:42');
INSERT IGNORE INTO `truck_schedule` (`truck_schedule_id`, `route_id`, `truck_id`, `driver_id`, `assistant_id`, `scheduled_date`, `start_time`, `end_time`, `status`, `pickup_confirmed_at`) VALUES (11, 2, 2, 6, 7, '2026-10-18 00:00:00', '14:30:00', '19:30:00', 'In Progress', '2026-10-08 13:12:06');
INSERT IGNORE INTO `truck_schedule` (`truck_schedule_id`, `route_id`, `truck_id`, `driver_id`, `assistant_id`, `scheduled_date`, `start_time`, `end_time`, `status`, `pickup_confirmed_at`) VALUES (20, 1, 1, 6, 8, '2026-10-12 00:00:00', '08:00:00', '17:00:00', 'Scheduled', NULL);
INSERT IGNORE INTO `truck_schedule` (`truck_schedule_id`, `route_id`, `truck_id`, `driver_id`, `assistant_id`, `scheduled_date`, `start_time`, `end_time`, `status`, `pickup_confirmed_at`) VALUES (21, 1, 2, 6, 8, '2026-10-13 00:00:00', '08:00:00', '17:00:00', 'Scheduled', NULL);
INSERT IGNORE INTO `truck_schedule` (`truck_schedule_id`, `route_id`, `truck_id`, `driver_id`, `assistant_id`, `scheduled_date`, `start_time`, `end_time`, `status`, `pickup_confirmed_at`) VALUES (22, 1, 3, 6, 8, '2026-10-14 00:00:00', '08:00:00', '17:00:00', 'Scheduled', NULL);
INSERT IGNORE INTO `truck_schedule` (`truck_schedule_id`, `route_id`, `truck_id`, `driver_id`, `assistant_id`, `scheduled_date`, `start_time`, `end_time`, `status`, `pickup_confirmed_at`) VALUES (23, 1, 1, 6, 8, '2026-10-15 00:00:00', '08:00:00', '17:00:00', 'Scheduled', NULL);
INSERT IGNORE INTO `truck_schedule` (`truck_schedule_id`, `route_id`, `truck_id`, `driver_id`, `assistant_id`, `scheduled_date`, `start_time`, `end_time`, `status`, `pickup_confirmed_at`) VALUES (24, 2, 2, 5, 8, '2026-10-16 00:00:00', '08:00:00', '18:00:00', 'Scheduled', NULL);
INSERT IGNORE INTO `truck_schedule` (`truck_schedule_id`, `route_id`, `truck_id`, `driver_id`, `assistant_id`, `scheduled_date`, `start_time`, `end_time`, `status`, `pickup_confirmed_at`) VALUES (25, 2, 3, 5, 8, '2026-10-17 00:00:00', '08:00:00', '18:00:00', 'Scheduled', NULL);

-- ------------------------------------------------------------
-- Table: `truck_allocation` (5 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `truck_allocation` (`truck_allocation_id`, `truck_schedule_id`, `order_id`, `route_stop_id`, `delivery_status`, `delivered_at`, `delivery_note`) VALUES (1, 1, 101, 1, 'Delivered', '2026-10-08 09:10:00', 'Handed directly to recipient Mr. Perera. Signed on glass.');
INSERT IGNORE INTO `truck_allocation` (`truck_allocation_id`, `truck_schedule_id`, `order_id`, `route_stop_id`, `delivery_status`, `delivered_at`, `delivery_note`) VALUES (2, 1, 102, 2, 'Attempted', '2026-10-08 10:25:00', 'Customer gate locked. Attempted phone call 3 times without answer.');
INSERT IGNORE INTO `truck_allocation` (`truck_allocation_id`, `truck_schedule_id`, `order_id`, `route_stop_id`, `delivery_status`, `delivered_at`, `delivery_note`) VALUES (3, 1, 103, 3, 'Pending', NULL, NULL);
INSERT IGNORE INTO `truck_allocation` (`truck_allocation_id`, `truck_schedule_id`, `order_id`, `route_stop_id`, `delivery_status`, `delivered_at`, `delivery_note`) VALUES (4, 2, 104, 4, 'Pending', NULL, NULL);
INSERT IGNORE INTO `truck_allocation` (`truck_allocation_id`, `truck_schedule_id`, `order_id`, `route_stop_id`, `delivery_status`, `delivered_at`, `delivery_note`) VALUES (5, 2, 105, 5, 'Pending', NULL, NULL);

-- ------------------------------------------------------------
-- Table: `roster_log` (1 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `roster_log` (`roster_log_id`, `truck_schedule_id`, `actual_start_time`, `actual_end_time`) VALUES (1, 4, '2026-10-07 08:05:00', '2026-10-07 12:20:00');

-- ------------------------------------------------------------
-- Table: `notification` (11 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `notification` (`notification_id`, `user_id`, `type`, `message`, `is_read`, `created_at`) VALUES (1, 5, 'Delivery', 'You have been assigned to Run #1 on Colombo Metro North today.', 0, '2026-10-08 09:53:17');
INSERT IGNORE INTO `notification` (`notification_id`, `user_id`, `type`, `message`, `is_read`, `created_at`) VALUES (2, 7, 'Delivery', 'You are assigned as assistant on Run #1 with driver Kamal Gunaratne.', 0, '2026-10-08 09:53:17');
INSERT IGNORE INTO `notification` (`notification_id`, `user_id`, `type`, `message`, `is_read`, `created_at`) VALUES (3, 9, 'Delivery', 'Your order #101 has been delivered successfully!', 1, '2026-10-08 09:53:17');
INSERT IGNORE INTO `notification` (`notification_id`, `user_id`, `type`, `message`, `is_read`, `created_at`) VALUES (30001, 9, 'Order Placed', 'Your order #150103 has been successfully placed and is awaiting dispatch.', 1, '2026-10-10 06:49:05');
INSERT IGNORE INTO `notification` (`notification_id`, `user_id`, `type`, `message`, `is_read`, `created_at`) VALUES (30002, 2, 'New Order', 'New order #150103 was just placed and needs to be scheduled.', 0, '2026-10-10 06:49:05');
INSERT IGNORE INTO `notification` (`notification_id`, `user_id`, `type`, `message`, `is_read`, `created_at`) VALUES (30003, 9, 'Test', 'Test message', 1, '2026-10-10 06:55:40');
INSERT IGNORE INTO `notification` (`notification_id`, `user_id`, `type`, `message`, `is_read`, `created_at`) VALUES (30004, 9, 'Order Placed', 'Your order #150104 has been successfully placed and is awaiting dispatch.', 0, '2026-10-10 07:00:42');
INSERT IGNORE INTO `notification` (`notification_id`, `user_id`, `type`, `message`, `is_read`, `created_at`) VALUES (30005, 2, 'New Order', 'New order #150104 was just placed and needs to be scheduled.', 0, '2026-10-10 07:00:43');
INSERT IGNORE INTO `notification` (`notification_id`, `user_id`, `type`, `message`, `is_read`, `created_at`) VALUES (60001, 1, 'Order Placed', 'Your order #180104 has been successfully placed and is awaiting dispatch.', 0, '2026-10-10 08:49:31');
INSERT IGNORE INTO `notification` (`notification_id`, `user_id`, `type`, `message`, `is_read`, `created_at`) VALUES (60002, 2, 'New Order', 'New order #180104 was just placed and needs to be scheduled.', 0, '2026-10-10 08:49:31');
INSERT IGNORE INTO `notification` (`notification_id`, `user_id`, `type`, `message`, `is_read`, `created_at`) VALUES (90001, 1, 'Daily Summary', 'Total successful deliveries today: 0', 0, '2026-10-11 12:30:02');

-- ------------------------------------------------------------
-- Table: `audit_log` (16 rows)
-- ------------------------------------------------------------
INSERT IGNORE INTO `audit_log` (`log_id`, `user_id`, `action`, `table_affected`, `record_id`, `timestamp`, `details`) VALUES (1, 2, 'ROSTER_OVERRIDE', 'truck_schedule', 10, '2026-10-08 09:53:17', 'Justification: "Emergency courier demand during festival week. Driver approved 1.5h rest gap." Overrode: [REQ-SCHED-02: Driver Minimum Rest Gap]');
INSERT IGNORE INTO `audit_log` (`log_id`, `user_id`, `action`, `table_affected`, `record_id`, `timestamp`, `details`) VALUES (2, 2, 'ROSTER_OVERRIDE', 'truck_schedule', 11, '2026-10-08 09:53:17', 'Justification: "Senior management authorization for express hospital medical supplies shipment." Overrode: [REQ-SCHED-03: Assistant Max Routes]');
INSERT IGNORE INTO `audit_log` (`log_id`, `user_id`, `action`, `table_affected`, `record_id`, `timestamp`, `details`) VALUES (30001, 9, 'Placed order', 'order', 90102, '2026-10-08 13:21:35', 'Total value: 1290.00, total items: 2');
INSERT IGNORE INTO `audit_log` (`log_id`, `user_id`, `action`, `table_affected`, `record_id`, `timestamp`, `details`) VALUES (30002, 9, 'Placed order', 'order', 90103, '2026-10-08 13:23:27', 'Total value: 850.00, total items: 1');
INSERT IGNORE INTO `audit_log` (`log_id`, `user_id`, `action`, `table_affected`, `record_id`, `timestamp`, `details`) VALUES (30003, NULL, 'Order modified', 'order', 90103, '2026-10-08 13:23:28', 'new address=[Updated Delivery Address, Colombo 07], new delivery date=2026-11-05');
INSERT IGNORE INTO `audit_log` (`log_id`, `user_id`, `action`, `table_affected`, `record_id`, `timestamp`, `details`) VALUES (30004, NULL, 'Order cancelled', 'order', 90103, '2026-10-08 13:23:29', 'Status Placed -> Cancelled, stock restored');
INSERT IGNORE INTO `audit_log` (`log_id`, `user_id`, `action`, `table_affected`, `record_id`, `timestamp`, `details`) VALUES (60001, 9, 'Placed order', 'order', 120102, '2026-10-08 13:34:09', 'Total value: 1300.00, total items: 2');
INSERT IGNORE INTO `audit_log` (`log_id`, `user_id`, `action`, `table_affected`, `record_id`, `timestamp`, `details`) VALUES (90001, 1, 'Physical loading shortfall requeued', 'cargo_allocation', 30001, '2026-10-10 06:17:35', 'order_item_id=1005 shortfall of 7 from trip 1 -> next trip 30001');
INSERT IGNORE INTO `audit_log` (`log_id`, `user_id`, `action`, `table_affected`, `record_id`, `timestamp`, `details`) VALUES (90002, 9, 'Placed order', 'order', 150102, '2026-10-10 06:45:40', 'Total value: 1950.00, total items: 2');
INSERT IGNORE INTO `audit_log` (`log_id`, `user_id`, `action`, `table_affected`, `record_id`, `timestamp`, `details`) VALUES (90003, 9, 'Placed order', 'order', 150103, '2026-10-10 06:49:04', 'Total value: 220.00, total items: 1');
INSERT IGNORE INTO `audit_log` (`log_id`, `user_id`, `action`, `table_affected`, `record_id`, `timestamp`, `details`) VALUES (90004, 9, 'Placed order', 'order', 150104, '2026-10-10 07:00:42', 'Total value: 450.00, total items: 1');
INSERT IGNORE INTO `audit_log` (`log_id`, `user_id`, `action`, `table_affected`, `record_id`, `timestamp`, `details`) VALUES (120001, 9, 'Placed order', 'order', 180102, '2026-10-10 07:49:01', 'Total value: 2220.00, total items: 3');
INSERT IGNORE INTO `audit_log` (`log_id`, `user_id`, `action`, `table_affected`, `record_id`, `timestamp`, `details`) VALUES (120002, 9, 'Placed order', 'order', 180103, '2026-10-10 08:11:50', 'Total value: 1070.00, total items: 2');
INSERT IGNORE INTO `audit_log` (`log_id`, `user_id`, `action`, `table_affected`, `record_id`, `timestamp`, `details`) VALUES (120003, NULL, 'Order cancelled', 'order', 180103, '2026-10-10 08:12:28', 'Status Placed -> Cancelled, stock restored');
INSERT IGNORE INTO `audit_log` (`log_id`, `user_id`, `action`, `table_affected`, `record_id`, `timestamp`, `details`) VALUES (120004, NULL, 'Order modified', 'order', 180102, '2026-10-10 08:13:05', 'new address=[126,mahahena], new delivery date=2026-10-22');
INSERT IGNORE INTO `audit_log` (`log_id`, `user_id`, `action`, `table_affected`, `record_id`, `timestamp`, `details`) VALUES (120005, 1, 'Placed order', 'order', 180104, '2026-10-10 08:49:30', 'Total value: 850.00, total items: 1');

SET FOREIGN_KEY_CHECKS = 1;
