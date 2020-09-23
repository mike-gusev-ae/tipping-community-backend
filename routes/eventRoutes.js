const { Router } = require('express');
const CrowdcastLogic = require('../logic/crowdcastLogic.js');

const router = new Router();

router.get('/event', CrowdcastLogic.getAllItems);
router.get('/event/:eventId', CrowdcastLogic.getSingleItem);
router.post('/event', CrowdcastLogic.addItem);
router.delete('/event/:eventId', CrowdcastLogic.removeItem);
router.post('/event/:eventId', CrowdcastLogic.editItem);

module.exports = router;
