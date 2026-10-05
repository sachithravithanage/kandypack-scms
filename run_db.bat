mysql -u root -p15039@abcD -e "DROP DATABASE IF EXISTS kandypack;"
mysql -u root -p15039@abcD < db\01_users_schema.sql
mysql -u root -p15039@abcD kandypack < db\02_orders_schema.sql
mysql -u root -p15039@abcD kandypack < db\03_rail_store_schema.sql
mysql -u root -p15039@abcD kandypack < db\03b_rail_store_procedures.sql
mysql -u root -p15039@abcD kandypack < db\03c_rail_store_seed.sql
mysql -u root -p15039@abcD kandypack < db\04_roster_delivery_schema.sql
mysql -u root -p15039@abcD kandypack < db\05_notifications_schema.sql
mysql -u root -p15039@abcD kandypack < db\06_inventory_schema.sql
mysql -u root -p15039@abcD kandypack < db\99_seed_dummy_data.sql
