const express = require('express');
const db = require('../../../db');
const router = express.Router();


router.post('/train-trips', async (req, res) => {
        try {
                const { trainId, destinationCityId, departureDatetime, arrivalDatetime, totalCapacity } = req.body;

                const [result] = await db.query(
                        'insert into train_trip (train_id, destination_city_id, departure_datetime, arrival_datetime, total_capacity) values(?, ?, ?, ?, ?)',
                        [trainId, destinationCityId, departureDatetime, arrivalDatetime, totalCapacity]
                );
                res.status(201).json({ tripId: result.insertId });
        } catch (err) {
                res.status(400).json({ error: err.massage });
        }
});

router.get('train-trips', async (req, res) => {
        const [rows] = await db.query(
                'select tt.*, c.name as destination_city, t.name as train_name \
                from train_trip tt \
                join city c on tt.destination_city_id = c.city_id \
                join train t on tt.train_id = t.train_id \
                order by tt.departure_datetime'
        );
        res.json(rows);
});

router.post('train-trips/:id/allocate', async (req, res) => {
        const connection = await db.getConnection();

        try {
                await connection.beginTransaction();

                const { orderItemId, quantity } = req.body;
                const tripId = req.params.id;


                const [tripRows] = await connection.query(
                        'select * from train_trip where trip_id = ? for update', [tripId]
                );

                const trip = tripRows[0];

                const [allocateRows] = await connection.query(
                        'select coalesce(sum(allocated_quantity), 0) as  used from cargo_allocation where trip_id = ?', [tripId]
                );

                const usedCapacity = allocateRows[0].used;
                const remaining = trip.total_capacity - usedCapacity;

                if (quantity > remaining) {
                        await connection.rollback();
                        return res.status(400).json({ error: 'Not enough capacity. Only ${remaining} remaining.', remaining });
                }

                await connection.query(
                        'insert into cargo_allocation (order_item_id, trip_id, allocated_quantity) values (?, ?, ?)',
                        [orderItemId, tripId, quantity]
                );

                await connection.commit();
                res.status(201).json({ message: 'Allocated successfully' });
        } catch (err) {
                await connection.rollback();
                res.status(400).json({ error: err.massage });
        } finally {
                connection.release();
        }

});

router.put('/allocations/:id/loading-status', async (req, res) => {
        const { status } = req.body;

        await db.query('update cargo_allocation set status = ? where cargo_allocation_id = ?', [status, req.params.id]);

        if (status == 'Loaded') {
                const [allocRow] = await db.query('select order_item_id from cargo_allocation where \
                        cargo_allocation_id=?', [req.params.id]);
                await db.query("update order_item set status = 'Out for Delivery' where order_item_id = ?", [allocRow[0].order_item_id]);
        }

        const [allocRow2] = await db.query('select trip_id from cargo_allocation where cargo_allocation_id=?', [req.params.id]);
        const tripId = allocRow2[0].trip_id;

        const [remaining] = await db.query(
                "select count(*) as cnt from cargo_allocation where trip_id=? and status != 'Loaded'",
                [tripId]
        );

        if (remaining[0].cnt == 0) {
                await db.query("update train_trip set status='Loaded' where trip_id=?", [tripId]);
                await db.query(
                        `update \`order\` set status = 'In transit' 
                        where order_id in ( select oi.oder_id from order_item oi 
                        join cargo_allocation ca on ca.order_item_id= oi.order_item_id 
                        where ca.trip_id=?) and status='Scheduled'`, [tripId]
                );
        }

        res.json({ message: 'Loading status updated' });
});

module.exports = router;



