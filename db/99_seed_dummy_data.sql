USE kandypack;

-- 1. Insert Fake Products (if they don't exist yet)
INSERT IGNORE INTO product (product_id, name, unit_price, space_consumption_rate) VALUES
(101, 'Kandypack Milk Powder 400g', 850.00, 1.2),
(102, 'Kandypack Tea Leaves 200g', 450.00, 0.5),
(103, 'Kandypack Chocolate Biscuits', 220.00, 0.8),
(104, 'Kandypack Sugar 1kg', 300.00, 1.0);

-- 2. Insert a Fake Customer User (Password is 'password123')
INSERT IGNORE INTO user (user_id, name, email, password_hash, role_id) VALUES
(999, 'Test Shop', 'shop@test.com', '$2b$10$374Bl.tHpkS2hhlC.2wbNebqy7YMV3f/u6ayVmCI3VVEdHurSIa2O', 6);

INSERT IGNORE INTO customer (user_id, phone, address, city_id) VALUES
(999, '0771234567', '45 Galle Road, Colombo', 1);

-- 3. Insert Fake Orders over different dates (for the Quarterly Sales report)
INSERT IGNORE INTO `order` (order_id, customer_id, route_id, order_date, requested_delivery_date, status, total_value, total_volume) VALUES
(1001, 999, NULL, '2026-07-15', '2026-07-22', 'Delivered', 12500.00, 25.5),
(1002, 999, NULL, '2026-08-10', '2026-08-17', 'Delivered', 8400.00, 14.2),
(1003, 999, NULL, '2026-09-05', '2026-09-12', 'In Transit', 45000.00, 60.0),
(1004, 999, NULL, '2026-10-01', '2026-10-08', 'Placed', 15000.00, 20.0);

-- 4. Insert Fake Order Items (for the Top Selling Products report)
INSERT IGNORE INTO order_item (order_id, product_id, quantity, status) VALUES
(1001, 101, 10, 'Delivered'),
(1001, 103, 20, 'Delivered'),
(1002, 102, 15, 'Delivered'),
(1002, 104, 5, 'Delivered'),
(1003, 101, 40, 'Out for Delivery'),
(1003, 104, 35, 'Out for Delivery'),
(1004, 103, 50, 'Pending');

-- 5. Insert Fake Notifications for this user
INSERT IGNORE INTO notification (user_id, type, message, is_read, created_at) VALUES
(999, 'Order', 'Your order #1003 has been shipped.', FALSE, '2026-10-03 10:00:00'),
(999, 'System', 'Welcome to Kandypack SCMS!', TRUE, '2026-07-01 08:00:00'),
(999, 'Delivery', 'Driver is arriving soon for order #1003.', FALSE, '2026-10-04 09:30:00');
