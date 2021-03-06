const chai = require('chai');
const { describe, it, beforeEach } = require('mocha');
const sinon = require('sinon');

const aeternity = require('../utils/aeternity');
const CacheLogic = require('../logic/cacheLogic.js');
const TipLogic = require('../logic/tipLogic.js');
const RetipLogic = require('../logic/retipLogic.js');
const cache = require('../utils/cache');
const { TIP_TYPES } = require('../models/enums/tip');
const { Tip, Retip, Notification } = require('../models');

chai.should();

describe('(Re)Tips', () => {
  describe('Invocations', () => {
    it('should call updateTipsDB on cache renewal', done => {
      cache.del(['getTips']);
      const tipStub = sinon.stub(aeternity, 'fetchTips').callsFake(() => []);
      const updateStub = sinon.stub(TipLogic, 'updateTipsDB').callsFake(() => {
        tipStub.restore();
        updateStub.restore();
        done();
      });
      CacheLogic.getTips();
    });

    it('should call updateRetipsDB on cache renewal', done => {
      cache.del(['getTips']);
      const tipStub = sinon.stub(aeternity, 'fetchTips').callsFake(() => []);
      const updateRetipsStub = sinon.stub(RetipLogic, 'updateRetipsDB').callsFake(() => {
        tipStub.restore();
        updateRetipsStub.restore();
        done();
      });
      CacheLogic.getTips();
    });
  });

  describe('DB', () => {
    beforeEach(async () => {
      await Retip.destroy({
        where: {},
        truncate: true,
      });

      await Tip.destroy({
        where: {},
        truncate: true,
        cascade: true,
      });

      await Notification.destroy({
        where: {},
        truncate: true,
        cascade: true,
      });
    });

    it('it should CREATE an unclaimed tip without retips in db', async () => {
      const fakeData = [
        {
          sender: 'ak_tip',
          title: 'test tip in english',
          id: '10',
          url: 'https://superhero.com/',
          retips: [],
          claim: {
            unclaimed: true,
          },
        },
      ];

      await TipLogic.updateTipsDB(fakeData);
      await RetipLogic.updateRetipsDB(fakeData);

      const tip = await Tip.findOne({
        where: {
          id: fakeData[0].id,
        },
      });

      tip.should.have.property('id', fakeData[0].id);
      tip.should.have.property('language', 'en');
      tip.should.have.property('type', TIP_TYPES.AE_TIP);
      tip.should.have.property('unclaimed', true);
      tip.should.have.property('sender', 'ak_tip');
    });

    it('it should CREATE a claimed tip without retips in db', async () => {
      const fakeData = [
        {
          sender: 'ak_tip',
          title: 'test tip in english',
          id: '50',
          url: 'https://superhero.com/',
          retips: [],
          claim: {
            unclaimed: false,
          },
        },
      ];

      await TipLogic.updateTipsDB(fakeData);
      await RetipLogic.updateRetipsDB(fakeData);

      const tip = await Tip.findOne({
        where: {
          id: fakeData[0].id,
        },
      });

      tip.should.have.property('id', fakeData[0].id);
      tip.should.have.property('language', 'en');
      tip.should.have.property('type', TIP_TYPES.AE_TIP);
      tip.should.have.property('unclaimed', fakeData[0].claim.unclaimed);
      tip.should.have.property('sender', 'ak_tip');
    });

    it('it should CREATE a tip with retips in db', async () => {
      const fakeData = [
        {
          sender: 'ak_tip',
          title: 'test tip in english',
          id: '33',
          url: 'https://superhero.com/',
          claim: {
            unclaimed: true,
          },
          retips: [{
            id: '4',
            sender: 'ak_retip',
            timestamp: (new Date(2020, 8, 1)).getTime(),
            claim: {
              unclaimed: true,
            },
          }],
        },
      ];

      await TipLogic.updateTipsDB(fakeData);
      await RetipLogic.updateRetipsDB(fakeData);

      const tip = await Tip.findOne({
        where: {
          id: fakeData[0].id,
        },
      });

      tip.should.have.property('id', fakeData[0].id);
      tip.should.have.property('language', 'en');
      tip.should.have.property('type', TIP_TYPES.AE_TIP);
      tip.should.have.property('unclaimed', fakeData[0].claim.unclaimed);
      tip.should.have.property('sender', 'ak_tip');

      const retip = await Retip.findOne({
        where: {
          id: fakeData[0].retips[0].id,
        },
      });

      retip.should.have.property('id', fakeData[0].retips[0].id);
      retip.should.have.property('tipId', fakeData[0].id);
      retip.should.have.property('unclaimed', fakeData[0].retips[0].claim.unclaimed);
      retip.should.have.property('sender', 'ak_retip');
    });

    it('it should CREATE retips for an old tip in db', async () => {
      await Tip.create({
        id: '33',
        language: 'en',
        unclaimed: false,
        sender: 'ak_tip',
      });

      const fakeData = [
        {
          sender: 'ak_tip',
          title: '#test tip',
          id: '33',
          url: 'https://superhero.com/',
          claim: {
            unclaimed: false,
          },
          retips: [{
            id: '4',
            sender: 'ak_retip',
            timestamp: (new Date(2020, 8, 1)).getTime(),
            claim: {
              unclaimed: true,
            },
          }],
        },
      ];

      await TipLogic.updateTipsDB(fakeData);
      await RetipLogic.updateRetipsDB(fakeData);

      const tip = await Tip.findOne({
        where: {
          id: fakeData[0].id,
        },
      });

      tip.should.have.property('id', fakeData[0].id);
      tip.should.have.property('language', 'en');
      tip.should.have.property('type', TIP_TYPES.AE_TIP);
      tip.should.have.property('unclaimed', fakeData[0].claim.unclaimed);
      tip.should.have.property('sender', 'ak_tip');

      const retip = await Retip.findOne({
        where: {
          id: fakeData[0].retips[0].id,
        },
      });

      retip.should.have.property('id', fakeData[0].retips[0].id);
      retip.should.have.property('tipId', fakeData[0].id);
      retip.should.have.property('unclaimed', fakeData[0].retips[0].claim.unclaimed);
      retip.should.have.property('sender', 'ak_retip');
    });

    it('it should UPDATE a tips claimed status db', async () => {
      await Tip.create({
        id: '33',
        language: 'en',
        unclaimed: true,
        sender: 'ak_tip',
      });

      const fakeData = [
        {
          sender: 'ak_tip',
          title: '#test tip',
          id: '33',
          url: 'https://superhero.com/',
          claim: {
            unclaimed: false,
          },
          retips: [],
        },
      ];

      await TipLogic.updateTipsDB(fakeData);
      await RetipLogic.updateRetipsDB(fakeData);

      const tip = await Tip.findOne({
        where: {
          id: fakeData[0].id,
        },
      });

      tip.should.have.property('id', fakeData[0].id);
      tip.should.have.property('language', 'en');
      tip.should.have.property('type', TIP_TYPES.AE_TIP);
      tip.should.have.property('unclaimed', fakeData[0].claim.unclaimed);
      tip.should.have.property('sender', 'ak_tip');
    });

    it('it should UPDATE a retips claimed status db', async () => {
      await Tip.create({
        id: '33',
        language: 'en',
        unclaimed: true,
        sender: 'ak_tip',
      });
      await Retip.create({
        id: '2',
        tipId: '33',
        unclaimed: true,
        sender: 'ak_retip',
      });

      const fakeData = [
        {
          sender: 'ak_tip',
          title: '#test tip',
          id: '33',
          url: 'https://superhero.com/',
          claim: {
            unclaimed: false,
          },
          retips: [{
            id: '2',
            sender: 'ak_retip',
            claim: {
              unclaimed: false,
            },
          }],
        },
      ];

      await TipLogic.updateTipsDB(fakeData);
      await RetipLogic.updateRetipsDB(fakeData);

      const tip = await Tip.findOne({
        where: {
          id: fakeData[0].id,
        },
      });

      tip.should.have.property('id', fakeData[0].id);
      tip.should.have.property('language', 'en');
      tip.should.have.property('type', TIP_TYPES.AE_TIP);
      tip.should.have.property('unclaimed', fakeData[0].claim.unclaimed);
      tip.should.have.property('sender', 'ak_tip');

      const retip = await Retip.findOne({
        where: {
          id: fakeData[0].retips[0].id,
        },
      });

      retip.should.have.property('id', fakeData[0].retips[0].id);
      retip.should.have.property('tipId', fakeData[0].id);
      retip.should.have.property('unclaimed', fakeData[0].retips[0].claim.unclaimed);
      retip.should.have.property('sender', 'ak_retip');
    });
  });
});
