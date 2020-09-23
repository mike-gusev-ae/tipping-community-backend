const { Router } = require('express');
const EventLogic = require('../logic/eventLogic.js');

const router = new Router();

router.get('/event', EventLogic.getAllItems);
router.get('/event/:eventId', EventLogic.getSingleItem);
router.post('/event', EventLogic.addItem);
router.delete('/event/:eventId', EventLogic.removeItem);
router.post('/event/:eventId', EventLogic.editItem);

module.exports = router;
