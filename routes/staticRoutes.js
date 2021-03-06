const { Router } = require('express');
const StaticLogic = require('../logic/staticLogic.js');

const router = new Router();

// Open api routes
router.get('/contract', StaticLogic.getContract);
router.get('/stats', StaticLogic.deliverStats);
router.get('/wallet/graylist', StaticLogic.getGrayList);

module.exports = router;
