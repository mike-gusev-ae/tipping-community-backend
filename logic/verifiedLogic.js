const CacheLogic = require('./cacheLogic.js');
const logger = require('../utils/logger')(module);

module.exports = class Verified {
  static async getAllClaimedEvents(req, res) {
    try {
      const tips = await CacheLogic.getTips();
      const allClaimedDomains = [
        ...(new Set(tips
          .filter(({ claim }) => !claim.unclaimed)
          .map(({ url }) => url)))];
      return res.send(allClaimedDomains);
    } catch (err) {
      logger.error(err);
      return res.status(500).send(err.message);
    }
  }
};
