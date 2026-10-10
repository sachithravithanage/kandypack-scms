USE kandypack;

-- Product search indexes (customer "Place New Order" catalog search)
-- Run AFTER 02_orders_schema.sql (and after 02b if you use it).
--
-- Search patterns served:
--   1. by price : range (min..max) and price sort order -> B-tree index below
--   2. by name  : exact / leading-prefix lookups and name sort order
--                 -> already covered by the B-tree index MySQL creates
--                    automatically for `name VARCHAR(150) NOT NULL UNIQUE`
--                    in 02_orders_schema.sql (no extra statement needed)
--
-- Note on "contains" name search (typing "cream" to find "Pears Baby Cream"):
-- a B-tree index cannot serve LIKE '%word%', so that part of the search scans
-- the (small) product table. FULLTEXT is deliberately NOT used: it is not
-- supported by TiDB and other MySQL-compatible databases (MATCH ... AGAINST
-- fails with "UnknownType: *ast.MatchAgainst").

-- Price range filter and price sorting
-- (WHERE unit_price BETWEEN ? AND ?, ORDER BY unit_price)
CREATE INDEX idx_product_unit_price ON product (unit_price);

-- Check the indexes exist (expect PRIMARY, name, idx_product_unit_price):
--   SHOW INDEX FROM product;
--
-- If you earlier created the FULLTEXT index and SHOW INDEX lists it, remove it:
--   DROP INDEX ftx_product_name ON product;
--
-- Check the optimizer uses the price index (look at the "key" column):
--   EXPLAIN SELECT product_id, name, unit_price FROM product
--    WHERE unit_price BETWEEN 100 AND 500 ORDER BY unit_price;
--   EXPLAIN SELECT product_id, name, unit_price FROM product
--    WHERE name LIKE 'milo%';    -- prefix search uses the UNIQUE name index
--
-- With only a handful of seed rows the database may still choose a full table
-- scan, because scanning a tiny table is cheaper than using an index. The
-- indexes pay off as the catalog grows. To demonstrate it in your report,
-- seed a few thousand rows and compare EXPLAIN before and after, e.g.:
--   DROP INDEX idx_product_unit_price ON product;                 -- type: ALL (full scan)
--   CREATE INDEX idx_product_unit_price ON product (unit_price);  -- type: range
