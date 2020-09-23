const { Router } = require('express');
const EventLogic = require('../logic/eventsLogic.js');

const router = new Router();

router.get('/events', EventLogic.getAllItems);
router.get('/events/:eventId', EventLogic.getSingleItem);
router.post('/events', EventLogic.addItem);
router.delete('/events/:eventId', EventLogic.removeItem);
router.post('/events/:eventId', EventLogic.editItem);

module.exports = router;
