USE kandypack;

CREATE TABLE driver (
    user_id INT PRIMARY KEY,
    license_number VARCHAR(50) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES employee (user_id) ON DELETE CASCADE,
    CONSTRAINT chk_driver_license_length CHECK (LENGTH(license_number) >= 4)
);

CREATE TABLE assistant (
    user_id INT PRIMARY KEY,
    FOREIGN KEY (user_id) REFERENCES employee (user_id) ON DELETE CASCADE
);

CREATE TABLE truck (
    truck_id INT AUTO_INCREMENT PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL UNIQUE,
    capacity DECIMAL(10, 2) NOT NULL,
    CONSTRAINT chk_truck_capacity_positive CHECK (capacity > 0.00)
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
    FOREIGN KEY (route_id) REFERENCES route (route_id),
    FOREIGN KEY (truck_id) REFERENCES truck (truck_id),
    FOREIGN KEY (driver_id) REFERENCES driver (user_id),
    FOREIGN KEY (assistant_id) REFERENCES assistant (user_id),
    CONSTRAINT chk_schedule_time_range CHECK (start_time < end_time),
    CONSTRAINT chk_schedule_status CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled'))
);

CREATE TABLE truck_allocation (
    truck_allocation_id INT AUTO_INCREMENT PRIMARY KEY,
    truck_schedule_id INT NOT NULL,
    order_id INT NOT NULL,
    route_stop_id INT NOT NULL,
    delivery_status ENUM(
        'Pending',
        'Delivered',
        'Failed',
        'Attempted'
    ) NOT NULL DEFAULT 'Pending',
    delivered_at DATETIME NULL,
    delivery_note TEXT NULL,
    FOREIGN KEY (truck_schedule_id) REFERENCES truck_schedule (truck_schedule_id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES `order` (order_id),
    FOREIGN KEY (route_stop_id) REFERENCES route_stop (route_stop_id)
);

CREATE TABLE roster_log (
    roster_log_id INT AUTO_INCREMENT PRIMARY KEY,
    truck_schedule_id INT NOT NULL UNIQUE,
    actual_start_time DATETIME NOT NULL,
    actual_end_time DATETIME NOT NULL,
    actual_hours_worked DECIMAL(5, 2) GENERATED ALWAYS AS (
        TIMESTAMPDIFF(
            MINUTE,
            actual_start_time,
            actual_end_time
        ) / 60.0
    ) STORED,
    FOREIGN KEY (truck_schedule_id) REFERENCES truck_schedule (truck_schedule_id),
    CONSTRAINT chk_roster_actual_time_range CHECK (actual_start_time < actual_end_time)
);

CREATE TABLE system_parameter (
    param_name VARCHAR(50) PRIMARY KEY,
    param_value VARCHAR(50) NOT NULL
);

INSERT INTO system_parameter VALUES ('driver_min_rest_hours', '2');

-- =========================================================================
-- VIEW: v_driver_assigned_runs
-- Provides a secure, filtered projection of scheduled runs and stop manifests
-- for Drivers and Assistants, encapsulating join complexity and exposing only
-- operational delivery data while shielding sensitive pricing and user records.
-- =========================================================================
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
    COALESCE(
        SUM(
            CASE
                WHEN ta.delivery_status = 'Delivered' THEN 1
                ELSE 0
            END
        ),
        0
    ) AS delivered_stops,
    COALESCE(
        SUM(
            CASE
                WHEN ta.delivery_status = 'Attempted' THEN 1
                ELSE 0
            END
        ),
        0
    ) AS attempted_stops,
    COALESCE(
        SUM(
            CASE
                WHEN ta.delivery_status = 'Failed' THEN 1
                ELSE 0
            END
        ),
        0
    ) AS failed_stops,
    COALESCE(
        SUM(
            CASE
                WHEN ta.delivery_status = 'Pending' THEN 1
                ELSE 0
            END
        ),
        0
    ) AS pending_stops
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

-- =========================================================================
-- USER-DEFINED FUNCTION (UDF): fn_get_driver_weekly_hours
-- (CS3043 Advanced Database Systems: Slides 19–20)
-- Reusable database function to compute actual driver weekly hours directly
-- within MySQL. Determines the Monday start of the ISO week for the specified
-- date and aggregates actual_hours_worked from roster_log.
-- =========================================================================
DELIMITER $$
DROP FUNCTION IF EXISTS fn_get_driver_weekly_hours$$
CREATE FUNCTION fn_get_driver_weekly_hours(
  p_driver_id INT,
  p_scheduled_date DATE
)
RETURNS DECIMAL(5,2)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_week_start DATE;
  DECLARE v_total_hours DECIMAL(5,2);
  
  -- Calculate Monday of the given date's week (WEEKDAY: Monday = 0)
  SET v_week_start = DATE_SUB(p_scheduled_date, INTERVAL WEEKDAY(p_scheduled_date) DAY);
  
  SELECT COALESCE(SUM(rl.actual_hours_worked), 0.00) INTO v_total_hours
  FROM roster_log rl
  JOIN truck_schedule ts ON rl.truck_schedule_id = ts.truck_schedule_id
  WHERE ts.driver_id = p_driver_id
    AND ts.scheduled_date >= v_week_start
    AND ts.scheduled_date <= p_scheduled_date;
    
  RETURN v_total_hours;
END$$
DELIMITER ;
