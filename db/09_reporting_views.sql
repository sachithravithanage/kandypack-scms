USE kandypack;

-- REQ-RPT-02: Top Selling Products View
CREATE OR REPLACE VIEW vw_top_selling_products AS
SELECT 
  p.product_id,
  p.name AS product_name,
  p.unit_price,
  COALESCE(SUM(oi.quantity), 0) AS total_quantity_sold,
  COALESCE(SUM(oi.quantity * p.unit_price), 0) AS total_revenue
FROM product p
LEFT JOIN order_item oi ON p.product_id = oi.product_id
GROUP BY p.product_id, p.name, p.unit_price;

-- REQ-RPT-05: Truck Utilization View
CREATE OR REPLACE VIEW vw_truck_utilization AS
SELECT 
  t.truck_id,
  t.plate_number,
  t.capacity,
  COUNT(ts.truck_schedule_id) AS total_trips_assigned,
  SUM(CASE WHEN ts.status = 'Completed' THEN 1 ELSE 0 END) AS completed_trips,
  COALESCE(SUM(rl.actual_hours_worked), 0) AS total_hours_operated
FROM truck t
LEFT JOIN truck_schedule ts ON t.truck_id = ts.truck_id
LEFT JOIN roster_log rl ON ts.truck_schedule_id = rl.truck_schedule_id
GROUP BY t.truck_id, t.plate_number, t.capacity;

-- REQ-RPT-08: Complete System Summary View
CREATE OR REPLACE VIEW vw_complete_system_summary AS
SELECT 
  ta.truck_allocation_id,
  ta.truck_schedule_id,
  ts.scheduled_date,
  ts.status AS schedule_status,
  t.plate_number AS truck_plate,
  ud.name AS driver_name,
  ua.name AS assistant_name,
  r.name AS route_name,
  s.name AS store_name,
  o.order_id,
  uc.name AS customer_name,
  ta.delivery_status,
  ta.delivered_at
FROM truck_allocation ta
JOIN truck_schedule ts ON ta.truck_schedule_id = ts.truck_schedule_id
JOIN truck t ON ts.truck_id = t.truck_id
JOIN `user` ud ON ts.driver_id = ud.user_id
JOIN `user` ua ON ts.assistant_id = ua.user_id
JOIN route r ON ts.route_id = r.route_id
JOIN store s ON r.store_id = s.store_id
JOIN `order` o ON ta.order_id = o.order_id
JOIN `user` uc ON o.customer_id = uc.user_id;

-- REQ-DEL-01: Driver Assigned Runs View
CREATE OR REPLACE VIEW v_driver_assigned_runs AS
SELECT 
  ts.truck_schedule_id,
  ts.route_id,
  r.name AS route_name,
  ts.truck_id,
  tk.plate_number,
  ts.driver_id,
  ud.name AS driver_name,
  ts.assistant_id,
  ua.name AS assistant_name,
  ts.scheduled_date,
  ts.start_time,
  ts.end_time,
  ts.status,
  ts.pickup_confirmed_at,
  COUNT(ta.truck_allocation_id) AS total_stops,
  SUM(CASE WHEN ta.delivery_status = 'Delivered' THEN 1 ELSE 0 END) AS delivered_stops,
  SUM(CASE WHEN ta.delivery_status = 'Failed' THEN 1 ELSE 0 END) AS failed_stops,
  SUM(CASE WHEN ta.delivery_status = 'Attempted' THEN 1 ELSE 0 END) AS attempted_stops,
  SUM(CASE WHEN ta.delivery_status = 'Pending' THEN 1 ELSE 0 END) AS pending_stops
FROM truck_schedule ts
JOIN route r ON ts.route_id = r.route_id
JOIN truck tk ON ts.truck_id = tk.truck_id
JOIN `user` ud ON ts.driver_id = ud.user_id
JOIN `user` ua ON ts.assistant_id = ua.user_id
LEFT JOIN truck_allocation ta ON ts.truck_schedule_id = ta.truck_schedule_id
GROUP BY 
  ts.truck_schedule_id, ts.route_id, r.name, ts.truck_id, tk.plate_number,
  ts.driver_id, ud.name, ts.assistant_id, ua.name, ts.scheduled_date,
  ts.start_time, ts.end_time, ts.status, ts.pickup_confirmed_at;
