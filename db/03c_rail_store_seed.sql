USE kandypack;

-- ============================================================
-- Trains
-- ============================================================
INSERT INTO train (name) VALUES
  ('Udarata Menike'),
  ('Intercity Express'),
  ('Rajarata Rajini');

-- ============================================================
-- Train Trips
-- destination_city_id: 1=Colombo, 2=Negombo, 3=Galle,
--                      4=Matara, 5=Jaffna, 6=Trincomalee
-- Covers 2026-09-23 → 2026-10-10 to exercise allocation,
-- overflow, and manifest locking logic.
-- ============================================================
INSERT INTO train_trip
  (train_id, destination_city_id, departure_datetime, arrival_datetime, total_capacity, status)
VALUES
  -- Colombo (city 1)
  (1, 1, '2026-09-23 06:00:00', '2026-09-23 09:00:00', 1000.00, 'Scheduled'),
  (1, 1, '2026-09-26 06:00:00', '2026-09-26 09:00:00', 1000.00, 'Scheduled'),
  (2, 1, '2026-09-30 06:00:00', '2026-09-30 09:00:00', 1200.00, 'Scheduled'),
  (3, 1, '2026-10-07 06:00:00', '2026-10-07 09:00:00', 1000.00, 'Scheduled'),
  -- Negombo (city 2)
  (2, 2, '2026-09-24 07:00:00', '2026-09-24 10:00:00',  800.00, 'Scheduled'),
  (2, 2, '2026-10-01 07:00:00', '2026-10-01 10:00:00',  800.00, 'Scheduled'),
  -- Galle (city 3)
  (3, 3, '2026-09-25 08:00:00', '2026-09-25 12:00:00',  600.00, 'Scheduled'),
  (3, 3, '2026-10-02 08:00:00', '2026-10-02 12:00:00',  600.00, 'Scheduled'),
  -- Matara (city 4)
  (1, 4, '2026-09-27 08:00:00', '2026-09-27 13:00:00',  500.00, 'Scheduled'),
  (1, 4, '2026-10-04 08:00:00', '2026-10-04 13:00:00',  500.00, 'Scheduled'),
  -- Jaffna (city 5)
  (2, 5, '2026-09-28 05:00:00', '2026-09-28 12:00:00',  700.00, 'Scheduled'),
  (2, 5, '2026-10-05 05:00:00', '2026-10-05 12:00:00',  700.00, 'Scheduled'),
  -- Trincomalee (city 6)
  (3, 6, '2026-09-29 05:30:00', '2026-09-29 13:00:00',  650.00, 'Scheduled'),
  (3, 6, '2026-10-06 05:30:00', '2026-10-06 13:00:00',  650.00, 'Scheduled');

-- ============================================================
-- Stores — one per city
-- ============================================================
INSERT INTO store (city_id, name, address) VALUES
  (1, 'Kandypack Colombo Store',     '42 Galle Road, Colombo 03'),
  (2, 'Kandypack Negombo Store',     '15 Beach Road, Negombo'),
  (3, 'Kandypack Galle Store',       '7 Lighthouse Street, Galle Fort'),
  (4, 'Kandypack Matara Store',      '22 Station Road, Matara'),
  (5, 'Kandypack Jaffna Store',      '5 KKS Road, Jaffna'),
  (6, 'Kandypack Trincomalee Store', '88 Inner Harbour Road, Trincomalee');

-- NOTE: Routes must be linked to stores after route seed data exists.
-- Member B's feature/order-placement branch owns route seed data.
-- Once merged, run e.g.:
--   UPDATE route SET store_id = 1 WHERE name LIKE '%Colombo%';
