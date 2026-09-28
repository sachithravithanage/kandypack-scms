USE kandypack;

create table train (
  train_id int auto_increment primary key,
  name varchar(100) not null
);

create table train_trip (
  trip_id int auto_increment primary key,
  train_id int not null,
  destination_city_id int not null,
  departure_datetime datetime not null,
  total_capacity DECIMAL(10,2) not null,
  status varchar(30) default 'Scheduled',
  foreign key (train_id) references train(train_id),
  foreign key (destination_city_id) references city(city_id)
);

create table store (
  store_id int auto_increment primary key,
  city_id int not null,
  name varchar(150) not null,
  address varchar(255),
  foreign key (city_id) references city(city_id)
);

create table cargo_allocation (
  cargo_allocation_id int auto_increment primary key,
  order_item_id int not null,
  trip_id int not null,
  allocated_quantity int not null,
  discrepancy_flag BOOLEAN default FALSE,
  discrepancy_note TEXT,
  foreign key (order_item_id) references order_item(order_item_id),
  foreign key (trip_id) references train_trip(trip_id)
);

create table store_inventory (
  store_inventory_id int auto_increment primary key,
  store_id int not null,
  product_id int not null,
  cargo_allocation_id int not null UNIQUE,
  quantity_on_hand int not null default 0,
  foreign key (store_id) references store(store_id),
  foreign key (product_id) references product(product_id),
  foreign key (cargo_allocation_id) references cargo_allocation(cargo_allocation_id)
);

alter table route add foreign key (store_id) references store(store_id);
