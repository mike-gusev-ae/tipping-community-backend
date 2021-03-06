const {
  Notification, Comment, Retip, Tip,
} = require('../models');
const {
  NOTIFICATION_TYPES, ENTITY_TYPES, NOTIFICATION_STATES, SOURCE_TYPES,
} = require('../models/enums/notification');

const logger = require('../utils/logger')(module);

module.exports = class NotificationLogic {
  static async sendTypes(req, res) {
    res.send({ NOTIFICATION_TYPES, ENTITY_TYPES, NOTIFICATION_STATES });
  }

  static add = {
    [NOTIFICATION_TYPES.COMMENT_ON_TIP]: async (receiver, commentId, tipId) => Notification.create({
      receiver,
      type: NOTIFICATION_TYPES.COMMENT_ON_TIP,
      entityId: commentId,
      entityType: ENTITY_TYPES.COMMENT,
      sourceId: tipId,
      sourceType: SOURCE_TYPES.TIP,
    }),
    [NOTIFICATION_TYPES.COMMENT_ON_COMMENT]: async (receiver, commentId, parentCommentId) => Notification.create({
      receiver,
      type: NOTIFICATION_TYPES.COMMENT_ON_COMMENT,
      entityId: commentId,
      entityType: ENTITY_TYPES.COMMENT,
      sourceId: parentCommentId,
      sourceType: SOURCE_TYPES.COMMENT,
    }),
    [NOTIFICATION_TYPES.TIP_ON_COMMENT]: async (receiver, tipId, commentId) => Notification.create({
      receiver,
      type: NOTIFICATION_TYPES.TIP_ON_COMMENT,
      entityId: tipId,
      entityType: ENTITY_TYPES.TIP,
      sourceId: commentId,
      sourceType: SOURCE_TYPES.COMMENT,
    }),
    [NOTIFICATION_TYPES.RETIP_ON_TIP]: async (receiver, tipId, retipId) => Notification.create({
      receiver,
      type: NOTIFICATION_TYPES.RETIP_ON_TIP,
      entityId: tipId,
      entityType: ENTITY_TYPES.TIP,
      sourceId: retipId,
      sourceType: SOURCE_TYPES.RETIP,
    }),
    [NOTIFICATION_TYPES.CLAIM_OF_TIP]: async (receiver, tipId) => Notification.create({
      receiver,
      type: NOTIFICATION_TYPES.CLAIM_OF_TIP,
      entityId: tipId,
      entityType: ENTITY_TYPES.TIP,
    }),
    [NOTIFICATION_TYPES.CLAIM_OF_RETIP]: async (receiver, tipId, retipId) => Notification.create({
      receiver,
      type: NOTIFICATION_TYPES.CLAIM_OF_RETIP,
      entityId: tipId,
      entityType: ENTITY_TYPES.TIP,
      sourceId: retipId,
      sourceType: SOURCE_TYPES.RETIP,
    }),
  };

  static async getForUser(req, res) {
    try {
      const { author } = req.params;
      if (!author) return res.status(400).send('Missing required field author');
      const allEntries = await Notification.findAll({ where: { receiver: author }, raw: true });
      return res.send(allEntries);
    } catch (e) {
      return res.status(500).send(e.message);
    }
  }

  static async markRead(req, res) {
    try {
      const { notificationId } = req.params;
      const { status } = req.body;
      if (!notificationId) return res.status(400).send('Missing required field tipId');
      await Notification.update({ status }, { where: { id: notificationId } });
      return res.send((await Notification.findOne({ where: { id: notificationId } })).toJSON());
    } catch (e) {
      return res.status(500).send(e.message);
    }
  }

  static async handleNewTip(tip) {
    // TIP ON COMMENT
    const commentMatch = tip.url.match(/https:\/\/superhero\.com\/tip\/(\d+)\/comment\/(\d+)/);
    if (commentMatch) {
      const commentId = commentMatch[2];
      const comment = await Comment.findOne({ where: { id: commentId }, raw: true });
      try {
        await NotificationLogic.add[NOTIFICATION_TYPES.TIP_ON_COMMENT](comment.author, tip.id, commentId);
      } catch (e) {
        if (!e.message.includes('SequelizeUniqueConstraintError')) {
          logger.error(e);
        } else {
          logger.warn(`Duplicate notification for TIP_ON_COMMENT the comment ${commentId} on tip ${tip.id}`);
        }
      }
    }
  }

  static async handleNewRetip(retip) {
    // RETIP ON TIP
    try {
      await NotificationLogic.add[NOTIFICATION_TYPES.RETIP_ON_TIP](retip.parentTip.sender, retip.parentTip.id, retip.id);
    } catch (e) {
      if (!e.message.includes('SequelizeUniqueConstraintError')) {
        logger.error(e);
      } else {
        logger.warn(`Duplicate notification for RETIP_ON_TIP the retip ${retip.parentTip.id} to tip ${retip.parentTip.id}`);
      }
    }
  }

  static async handleOldTip(tip) {
    const existingTip = await Tip.findOne({
      where: {
        id: tip.id,
      },
    });

    if (existingTip.unclaimed && !tip.claim.unclaimed) {
      await NotificationLogic.add[NOTIFICATION_TYPES.CLAIM_OF_TIP](tip.sender, tip.id);
      await Tip.update({ unclaimed: false }, {
        where: {
          id: tip.id,
        },
      });
    }
  }

  static async handleOldRetip(retip) {
    const existingRetip = await Retip.findOne({
      where: {
        id: retip.id,
      },
    });

    if (existingRetip.unclaimed && !retip.claim.unclaimed) {
      await NotificationLogic.add[NOTIFICATION_TYPES.CLAIM_OF_RETIP](retip.sender, retip.parentTip.id, retip.id);
      await Retip.update({ unclaimed: false }, {
        where: {
          id: retip.id,
        },
      });
    }
  }
};
