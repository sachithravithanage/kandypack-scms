USE kandypack;
create table if not exists train (
  train_id int auto_increment primary key,
  name     varchar(100) not null
);

create table if not exists train_trip (
  trip_id               int auto_increment primary key,
  train_id              int            not null,
  destination_city_id   int            not null,
  departure_datetime    datetime       not null,
  arrival_datetime      datetime       not null,
  total_capacity        DECIMAL(10, 2) not null,
  status                varchar(30)    not null default 'Scheduled',
  foreign key (train_id)            references train(train_id),
  foreign key (destination_city_id) references city(city_id)
);

create table if not exists store (
  store_id int          auto_increment primary key,
  city_id  int          not null,
  name     varchar(150) not null,
  address  varchar(255),
  foreign key (city_id) references city(city_id)
);

create table if not exists cargo_allocation (
  cargo_allocation_id int         auto_increment primary key,
  order_item_id       int         not null,
  trip_id             int         not null,
  allocated_quantity  int         not null,
  status              varchar(30) not null default 'Not Loaded',
  received_quantity   int         default null,
  discrepancy_flag    BOOLEAN     not null default FALSE,
  discrepancy_note    TEXT        default null,
  foreign key (order_item_id) references order_item(order_item_id),
  foreign key (trip_id)       references train_trip(trip_id)
);

create table if not exists store_inventory (
  store_inventory_id  int      auto_increment primary key,
  store_id            int      not null,
  product_id          int      not null,
  cargo_allocation_id int      not null unique,
  quantity_on_hand    int      not null default 0,
  received_at         datetime not null default current_timestamp,
  foreign key (store_id)            references store(store_id),
  foreign key (product_id)          references product(product_id),
  foreign key (cargo_allocation_id) references cargo_allocation(cargo_allocation_id)
);

alter table route ADD foreign key (store_id) references store(store_id);
