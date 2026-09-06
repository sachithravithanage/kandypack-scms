# Kandypack, Day in the Life: One Order, Start to Finish

A practical walkthrough of a single customer order moving through the entire Kandypack system — every screen, every role, every database table — told as a simple story rather than a spec. Use this alongside the ER diagram and SRS to sanity-check that the schema actually supports a real, ordinary use case end to end.

**Cast:**
- **Waruni** — a customer in Colombo
- **Arjun** — System Administrator
- **Shalini** — Logistics Dispatcher
- **Rohan** — Regional Store Manager, Colombo
- **Nimal** — Truck Driver
- **Priya** — Delivery Assistant

---

## Scene 1 — Waruni places an order

Waruni opens the Kandypack site, logs in (her `user` + `customer` rows already exist from when she registered — that registration created both in one go). She searches for soap and milk powder, adds them to her cart, picks her saved delivery address, and picks a delivery date 8 days out. She clicks **Place Order**.

**Behind the screen:** the server checks her date is far enough out (7-day rule — fine, she picked 8). It checks stock: `main_inventory` has enough Sunlight Soap and Milo, so it locks those rows, confirms enough is available, and reserves it (subtracts the quantity immediately — nobody else can "steal" that stock while her order is being created). It looks up her `city_id` (Colombo), finds a `route` whose `store` is also in Colombo, and matches her order to it. A new `order` row is born: status `Placed`, route filled in, total value and volume calculated from the products' prices and space rates. Two `order_item` rows sit underneath it — one per product, each starting at status `Pending`.

Waruni sees her order appear on **My Orders**, tagged "Placed."

*(If Waruni had lived in a city with no route yet — say a brand-new town Kandypack hasn't built delivery coverage for — her order would still save, just tagged `Unroutable`, and Arjun/Shalini would get pinged to sort it out manually rather than her order vanishing into an error message.)*

---

## Scene 2 — Arjun sets the stage (this actually happened earlier, but matters now)

Days before any of this, Arjun (Admin) did the master-data setup: he added the six destination cities, entered the product catalog with prices and space rates, defined delivery routes and which store each covers, registered the trucks, and — importantly — used **Restock** to tell the system how much stock Kandypack's factory has of each product. That's the `main_inventory` numbers Waruni's order just drew down from.

He also created Shalini's Dispatcher account, Rohan's Store Manager account, and Nimal's/Priya's Driver/Assistant accounts. For Nimal and Priya specifically, creating their accounts didn't just make a `user` row — it also silently created matching `employee` and `driver`/`assistant` rows, which is what lets them later be assigned to a truck run at all.

---

## Scene 3 — Shalini loads the train

A few days before Waruni's delivery date, Shalini (Dispatcher) opens **Train Loading**. She sees a train trip scheduled for Colombo tomorrow, with some capacity already claimed by other orders. She sees Waruni's order sitting in the queue, waiting for space.

She allocates Waruni's soap and milk powder onto that trip. The system checks the trip's remaining capacity (locking the row so two dispatchers allocating at the same second can't both think there's room for the last few units), confirms there's space, and creates a `cargo_allocation` row for each item — this is what makes REQ-RAIL-03's "split an order across trips" actually possible, since her soap and her milk could in theory end up on *different* trips if one ran out of room first.

The moment that first allocation lands, Waruni's `order` quietly advances from `Placed` to `Scheduled` — she'd see that if she refreshed her order page.

Later that day, warehouse staff physically load the goods. Shalini marks each allocation **Loaded** as it happens. Once every single item on that trip shows Loaded, two things happen automatically: the trip itself flips to `Loaded`, and every order riding on it — including Waruni's — jumps to `In Transit`. Her `order_item` rows for soap and milk also flip to `Out for Delivery`, which is the exact word she now sees next to her items on **My Orders**.

---

## Scene 4 — Rohan receives the shipment in Colombo

The train arrives. Rohan (Store Manager, Colombo) opens **Incoming Shipment Receipt**, picks that trip, and sees the manifest: what's *supposed* to be in this shipment, allocation by allocation.

He counts. Waruni's soap: manifest said 24, he counts 24 — matches. Waruni's milk powder: manifest said 6 tins, he counts only 5 — one's gone missing, maybe damaged in transit.

For the soap, he records "received 24," no discrepancy — a fresh row lands in `store_inventory` (24 units, tied to that specific shipment), and Waruni's soap `order_item` becomes `Out for Delivery`.

For the milk powder, he records "received 5," and the system itself notices 5 < 6, flags `cargo_allocation.discrepancy_flag = true`, writes his note ("1 tin damaged"), and — this is the part that matters for Waruni — sets that `order_item`'s status to `Discrepant` instead of `Out for Delivery`. Shalini and Arjun get a notification about it. Waruni herself would see something's off with just that one item if she checked closely, rather than the whole order silently pretending to be fine.

*(This is the discrepancy scenario in miniature — the manifest number and the counted number, compared, and a gap between them that someone gets told about.)*

---

## Scene 5 — Rohan dispatches today's runs

Separately, Rohan looks at **Daily Dispatch** — today's truck runs covering Colombo. He sees a `truck_schedule` already exists for the Colombo Central route today (Shalini built this into the roster a week earlier — more on that in a second). He assigns Waruni's order onto that run. This is the step that creates the actual `delivery_stop` row — the thing that turns "we have a truck going out" into "and specifically, it's stopping at Waruni's address with her stuff."

---

## Scene 6 — Shalini built the roster, a week earlier

Rewind a week: Shalini opened **Weekly Roster Builder**. The system suggested how many trucks Colombo's routes would likely need, based on recent order volume. She assigned truck `CAB-3421`, driver Nimal, and assistant Priya to the Colombo Central route for today.

Before saving, the system silently ran through every rule: is this truck/driver/assistant already booked elsewhere at an overlapping time? No. Does Nimal have at least 2 hours' rest since any other run he's doing that day? Yes. Is Priya being asked for a third consecutive route in a row? No. Have Nimal or Priya already hit their weekly hour cap (40 for drivers, 60 for assistants)? Checked by adding up everything already logged for them that week — no, still under. The assignment goes through, and a `roster_log` entry records exactly how many hours this run adds to each of their weekly totals — the same log Arjun could later pull a report from to check nobody's being overworked.

---

## Scene 7 — Nimal and Priya's day

Nimal opens his phone. **Today's Run**: Colombo Central, truck CAB-3421, partnered with Priya, a handful of stops — Waruni's among them, now that Rohan dispatched it. He taps **Confirm Pickup & Start Run** once the truck is loaded at the store. That single tap confirms pickup for every stop on this run at once — nobody can mark an individual delivery complete before the truck has actually left the store, by design.

He drives. At Waruni's address, he hands over her soap and (an apologetic) partial delivery of milk powder, and taps **Delivered**. The system updates that stop, flips *every* item on Waruni's order to `Delivered`, and moves her whole `order` to `Delivered` too.

*(If instead her address had been empty and Nimal tapped **Failed**, the system wouldn't just leave that order stranded — it automatically looks for the next scheduled run on the same route and re-queues a fresh delivery attempt onto it, so someone tries again rather than the order silently dying.)*

---

## Scene 8 — Waruni confirms, and the loop closes

Waruni gets a notification her order was delivered. She opens **My Orders**, sees "Delivered," and taps **Confirm Receipt**. Her order moves to `Closed` — the very last stage.

*(If she'd gotten distracted and never tapped it, the system would auto-close it for her 48 hours after Nimal marked it delivered, logging that it closed itself rather than by her hand — so orders don't sit "Delivered but not Closed" forever.)*

---

## Scene 9 — Arjun looks at the big picture

At the end of the month, Arjun opens **Reports**. He sees this quarter's total sales (pulled straight from every `order`'s value), which products sold best, a city-by-city breakdown, Nimal's and Priya's logged hours with no violations flagged, how well each truck's been utilized, and — if he searches Waruni specifically — her whole order history, this one included, discrepancy and all.

---

## Every table, touched once

| Table | Where it showed up above |
|---|---|
| `user`, `customer` | Waruni's login and profile |
| `role` | What lets the system tell Arjun/Shalini/Rohan/Nimal/Priya/Waruni apart |
| `city` | Matching Waruni's address to a route |
| `product`, `main_inventory` | What she ordered, and stock being reserved |
| `route`, `store` | Which route and store cover Colombo |
| `order`, `order_item` | Her order and its two line items, status all the way through |
| `train`, `train_trip` | The trip her goods rode on |
| `cargo_allocation` | Loading status, plus the discrepancy on her milk powder |
| `store_inventory` | Rohan's stock ledger entry after receiving |
| `employee`, `driver`, `assistant` | Nimal and Priya existing as roster-able people |
| `truck`, `truck_schedule`, `roster_log` | Shalini's weekly roster and hour tracking |
| `delivery_stop` | Rohan's dispatch assigning her order to Nimal's run |
| `notification` | The discrepancy alert to Shalini/Arjun, the delivery alert to Waruni |
| `audit_log` | Arjun creating accounts, any rule overrides |
| `system_parameter` | The 2-hour driver rest rule Shalini's roster respected without her thinking about it |

Every table earns its place in one ordinary order — nothing in the schema is decorative.
