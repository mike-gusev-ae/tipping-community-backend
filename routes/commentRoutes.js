const Router = require('express').Router;
const CommentLogic = require('../logic/commentLogic.js');
const { basicAuth, signatureAuth } = require('../utils/auth.js');

const router = new Router();

// Open api routes
router.get('/api', CommentLogic.getAllItems);
router.get('/api/:id', CommentLogic.getSingleItem);
router.get('/api/tip/:tipId', CommentLogic.getAllItemsForThread);

// Restricted api routes
router.put('/api/:id', signatureAuth, CommentLogic.updateItem);
router.post('/api', signatureAuth, CommentLogic.addItem);
router.delete('/api/:id', signatureAuth, CommentLogic.removeItem);

module.exports = router;
