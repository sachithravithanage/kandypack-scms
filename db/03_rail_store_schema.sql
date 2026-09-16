create table train(
  train_id int auto_increment primary key,
  name varchar(100) not null
);

create table train_trip (

  trip_id int auto_increment primary key,
  train_id int not null,
  destination_city_id int not null,
  depature_datetime datetime not null,
  total capacity decimal(10, 2) not null,
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

create table cargo_allocation(

  cargo_allocation_id int auto_increment primary key,
  order_item_id int not null,
  trip_id int not null,
  allocated_quantity int,
  discrepancy_flag boolean default false,
  discrepancy_note text,
  foreign key (order_item_id) references order_item(order_item_id),
  foreign key (trip_id) references train_trip(trip_id)
);

create table store_inventory(

  store_inventory_id int auto_increment primary key,
  store_id int not null,
  order_item_id int not null,
  cargo_allocation_id int not null unique,
  quantity_on_hand int not null default 0,
  foreign key (store_id) references store(store_id),
  foreign key (order_item_id) references order_item(order_item_id),
);

select sum(quantity_on_hand) as current_stock from store_inventory where store_id=? and order_item_id=?;

alter table route add foreign key (store_id) references store(store_id);
