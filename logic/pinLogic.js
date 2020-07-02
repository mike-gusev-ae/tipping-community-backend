const { Pin } = require('../models');
const { PINNED_CONTENT_TYPES } = require('../models/enums/pin');

module.exports = class PinLogic {

  static async addItem(req, res) {
    try {
      const { entryId, type, signature, challenge } = req.body;
      const author = req.params.author;
      if (!entryId || !type || !author || !signature || !challenge) throw new Error('Missing required field');
      if (!PINNED_CONTENT_TYPES.hasOwnProperty(type)) throw new Error('Send type is invalid ' + type);
      const entry = await Pin.create({ entryId, type, author, signature, challenge });
      res.send(entry);
    } catch (e) {
      console.error(e);
      res.status(500).send(e.message);
    }
  };

  static async removeItem(req, res) {
    const result = await Pin.destroy({
      where: {
        entryId: req.body.entryId,
        author: req.params.author,
        type: req.body.type,
      },
    });
    return result === 1 ? res.sendStatus(200) : res.sendStatus(404);
  };

  static async getAllItemsPerUser(req, res) {
    res.send(await Pin.findAll({ where: { author: req.params.author }, raw: true }));
  };
};