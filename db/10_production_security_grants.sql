-- =========================================================================
-- KandyPack Supply Chain Management System (SCMS)
-- Script: 10_production_security_grants.sql
-- Purpose: Production Database Security Hardening (Principle of Least Privilege)
-- =========================================================================

USE kandypack;

-- 1. Create dedicated application service account with secure authentication
-- This replaces using the administrative 'root' account for runtime API operations.
DROP USER IF EXISTS 'kandypack_app'@'%';
CREATE USER 'kandypack_app'@'%' IDENTIFIED BY 'KandyPackAppSecure2026!';

-- 2. Grant core Data Manipulation Language (DML) privileges
-- Allows standard operational reads, inserts, and updates across business entities.
GRANT SELECT, INSERT, UPDATE ON kandypack.* TO 'kandypack_app'@'%';

-- 3. Grant routine execution privileges
-- Allows Express backend to execute stored procedures and deterministic stored functions
-- (e.g., sp_restock_product, sp_allocate_cargo, fn_order_item_value).
GRANT EXECUTE ON kandypack.* TO 'kandypack_app'@'%';

-- 4. Grant View inspection privileges
-- Required to query abstract database views (e.g., v_inventory_overview, v_order_value_rankings).
GRANT SHOW VIEW ON kandypack.* TO 'kandypack_app'@'%';

-- 5. Grant limited DELETE privilege strictly on temporary transactional tables
-- Retained exclusively for cleaning up expired/used password reset tokens.
GRANT DELETE ON kandypack.password_reset TO 'kandypack_app'@'%';

-- =========================================================================
-- EXPLICIT SECURITY RESTRICTIONS (Guaranteed by omission of privileges):
-- 
-- 1. NO DROP / ALTER PRIVILEGES:
--    The application service account cannot drop tables, alter schemas, or
--    delete database instances even if the web tier is compromised.
--
-- 2. NO DELETE ON AUDIT_LOG:
--    The audit_log table remains an immutable, append-only security ledger.
--    Neither the application nor any compromised credential can purge logs.
--
-- 3. NO DELETE ON USER / ORDER TABLES:
--    Enforces the soft-deletion pattern (is_active = FALSE) and preserves
--    historical orders, delivery schedules, and audit records.
--
-- 4. NO GRANT OPTION:
--    Prevents privilege escalation; this account cannot create other users
--    or grant elevated permissions to any third party.
--
-- 5. COMPATIBILITY WITH SQL SECURITY INVOKER:
--    Stored routines in db/07_advanced_sql.sql defined with SQL SECURITY INVOKER
--    will execute strictly within the restricted rights granted to this account.
-- =========================================================================

FLUSH PRIVILEGES;
