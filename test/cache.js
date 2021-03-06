// Require the dev-dependencies
const chai = require('chai');
const chaiHttp = require('chai-http');
const { describe, it, before } = require('mocha');
const sinon = require('sinon');

const server = require('../server');
const cache = require('../utils/cache');
const CacheLogic = require('../logic/cacheLogic.js');
const BlacklistLogic = require('../logic/blacklistLogic.js');
const aeternity = require('../utils/aeternity');

chai.should();
chai.use(chaiHttp);
// Our parent block
describe('Cache', () => {
  before(async function () {
    this.timeout(20000);
    await cache.del(['getTips']);
    await cache.del(['fetchPrice']);
    await cache.del(['getChainNames']);
    await cache.del(['fetchStats']);
    await cache.del(['oracleState']);
    await aeternity.init();
  });

  const checkCachedRoute = (route, type, done) => {
    chai.request(server).get(route).end((err, res) => {
      res.should.have.status(200);
      res.body.should.be.a(type);
      done();
    });
  };
  const minimalTimeout = 200;

  describe('API', () => {
    it('it should GET all cache items', function (done) {
      this.timeout(5000);
      checkCachedRoute('/cache/tips', 'array', done);
    });

    it('it should GET all cache items with filters', async () => {
      const stub = sinon.stub(CacheLogic, 'getAllTips').callsFake(() => [
        {
          sender: 'ak_y87WkN4C4QevzjTuEYHg6XLqiWx3rjfYDFLBmZiqiro5mkRag',
          title: '#test tip',
          id: 1,
          url: 'https://github.com/thepiwo',
          topics: [
            '#test',
          ],
          preview: {
            title: 'thepiwo - Overview',
            description: 'Blockchain Engineer / Full-Stack Developer justaverylongtestingname.chain - thepiwo',
          },
          chainName: 'justaverylongtestingname.chain',
        },
        {
          sender: 'ak_taR2fRi3cXYn7a7DaUNcU2KU41psa5JKmhyPC9QcER5T4efqp',
          title: '#other test',
          id: 2,
          url: 'https://github.com/mradkov',
          topics: [
            '#other',
          ],
        },
      ]);

      const resTest = await chai.request(server).get('/cache/tips?search=test');
      resTest.should.have.status(200);
      resTest.body.should.be.a('array');
      resTest.body.should.have.length(2);
      stub.callCount.should.eql(1);

      const resGithub = await chai.request(server).get('/cache/tips?search=github.com');
      resGithub.should.have.status(200);
      resGithub.body.should.be.a('array');
      resGithub.body.should.have.length(2);
      stub.callCount.should.eql(2);

      // only find topic with #
      const resTopic = await chai.request(server).get('/cache/tips?search=%23test');
      resTopic.should.have.status(200);
      resTopic.body.should.be.a('array');
      resTopic.body.should.have.length(1);
      resTopic.body[0].id.should.equal(1);
      stub.callCount.should.eql(3);

      stub.restore();
    });

    it('it should GET all cache items with language filters', async () => {
      const stub = sinon.stub(CacheLogic, 'getAllTips').callsFake(() => [
        {
          id: 1,
          contentLanguage: 'en',
          preview: {
            lang: 'en',
          },
        },
        {
          id: 2,
          contentLanguage: null,
          preview: {
            lang: 'en',
          },
        },
        {
          id: 3,
          contentLanguage: 'zh',
          preview: {
            lang: 'en',
          },
        },
        {
          id: 4,
          contentLanguage: 'zh',
          preview: {
            lang: 'zh',
          },
        },
      ]);

      // filter by english lang
      const resLanguageEN = await chai.request(server).get('/cache/tips?language=en');
      resLanguageEN.should.have.status(200);
      resLanguageEN.body.should.be.a('array');
      resLanguageEN.body.should.have.length(2);
      resLanguageEN.body[0].id.should.equal(1);
      stub.callCount.should.eql(1);

      // filter by chinese lang
      const resLanguageZH = await chai.request(server).get('/cache/tips?language=zh');
      resLanguageZH.should.have.status(200);
      resLanguageZH.body.should.be.a('array');
      resLanguageZH.body.should.have.length(1);
      resLanguageZH.body[0].id.should.equal(4);
      stub.callCount.should.eql(2);

      // filter by chinese lang
      const resLanguageZHEN = await chai.request(server).get('/cache/tips?language=zh|en');
      resLanguageZHEN.should.have.status(200);
      resLanguageZHEN.body.should.be.a('array');
      resLanguageZHEN.body.should.have.length(4);
      resLanguageZHEN.body[0].id.should.equal(1);
      stub.callCount.should.eql(3);

      stub.restore();
    });

    it('it should GET all cache items in less than 200ms', function (done) {
      this.timeout(200);
      checkCachedRoute('/cache/tips', 'array', done);
    });

    it('it should GET all oracle cache items', function (done) {
      this.timeout(10000);
      checkCachedRoute('/cache/oracle', 'object', done);
    });

    it(`it should GET all oracle cache items in less than ${minimalTimeout}ms`, function (done) {
      this.timeout(minimalTimeout);
      checkCachedRoute('/cache/oracle', 'object', done);
    });

    it(`it should GET a single tip cache item in less than ${minimalTimeout}ms`, function (done) {
      this.timeout(minimalTimeout);
      checkCachedRoute('/cache/tip?id=0', 'object', done);
    });

    it('it should 404 on a non existing tip', done => {
      chai.request(server).get('/cache/tip?id=15687651684785').end((err, res) => {
        res.should.have.status(404);
        done();
      });
    });

    it('it should not GET a flagged / blacklisted tip when requesting the full list', done => {
      const stub = sinon.stub(BlacklistLogic, 'getBlacklistedIds').callsFake(() => [0]);
      chai.request(server).get('/cache/tips').end((err, res) => {
        res.should.have.status(200);
        const tipIds = res.body.map(({ id }) => id);
        tipIds.should.not.contain(0);
        stub.callCount.should.eql(1);
        stub.restore();
        done();
      });
    });

    it('it should GET a flagged / blacklisted tip when requesting the full list explicitly', done => {
      const stub = sinon.stub(BlacklistLogic, 'getBlacklistedIds').callsFake(() => [1]);
      chai.request(server).get('/cache/tips?blacklist=false').end((err, res) => {
        res.should.have.status(200);
        const tipIds = res.body.map(tip => tip.id);
        tipIds.should.contain('0');
        stub.callCount.should.eql(1);
        stub.restore();
        done();
      });
    });

    it(`it should GET all user stats for a single user in less than ${minimalTimeout}ms`, function (done) {
      this.timeout(minimalTimeout);
      checkCachedRoute('/cache/userStats?address=ak_fUq2NesPXcYZ1CcqBcGC3StpdnQw3iVxMA3YSeCNAwfN4myQk', 'object', done);
    });

    it(`it should GET all chainnames cache items in less than ${minimalTimeout}ms`, function (done) {
      this.timeout(minimalTimeout);
      checkCachedRoute('/cache/chainnames', 'object', done);
    });

    it('it should GET the cached price', done => {
      checkCachedRoute('/cache/price', 'object', done);
    });

    it(`it should GET the cached price in less than ${minimalTimeout}ms`, function (done) {
      this.timeout(minimalTimeout);
      checkCachedRoute('/cache/price', 'object', done);
    });

    it(`it should GET all cached topics in less than ${minimalTimeout}ms`, function (done) {
      this.timeout(minimalTimeout);
      checkCachedRoute('/cache/topics', 'array', done);
    });

    it('it should GET all cached events', function (done) {
      this.timeout(25000);
      checkCachedRoute('/cache/events', 'array', done);
    });

    it(`it should GET all cached events in less than ${minimalTimeout}ms`, function (done) {
      this.timeout(minimalTimeout);
      checkCachedRoute('/cache/events', 'array', done);
    });

    it('it should invalidate the tips cache', done => {
      checkCachedRoute('/cache/invalidate/tips', 'object', done);
    });

    it('it should invalidate the oracle cache', done => {
      checkCachedRoute('/cache/invalidate/oracle', 'object', done);
    });

    it('it should invalidate the events cache', done => {
      checkCachedRoute('/cache/invalidate/events', 'object', done);
    });

    it('it should GET all cached stats', async () => {
      await cache.del(['fetchStats']);
      const stub = sinon.stub(CacheLogic, 'getTips').callsFake(() => [
        {
          amount: '1000000000000000000',
          claim_gen: 1,
          sender: 'ak_tip1',
          url_id: 0,
          id: 0,
          url: 'url1',
          retips: [],
          claim: { unclaimed: false, claim_gen: 2, unclaimed_amount: 0 },
          amount_ae: '1',
          retip_amount_ae: '0',
          total_amount: '1',
          total_unclaimed_amount: '0',
          total_claimed_amount: '1',
        },
        {
          amount: '1000000000000000000',
          claim_gen: 2,
          sender: 'ak_tip2',
          timestamp: 1589530325248,
          title: '#test',
          url_id: 0,
          id: 0,
          url: 'https://github.com/thepiwo',
          topics: ['#test'],
          retips: [{
            amount: '1000000000000000000',
            claim_gen: 2,
            sender: 'ak_retip1',
            tip_id: 0,
            id: 0,
            claim: { unclaimed: true, claim_gen: 2, unclaimed_amount: 1 },
            amount_ae: '1',
          }],
          claim: { unclaimed: true, claim_gen: 2, unclaimed_amount: 1 },
          amount_ae: '1',
          retip_amount_ae: '1',
          total_amount: '2',
          total_unclaimed_amount: '1',
          total_claimed_amount: '1',
        },
      ]);
      const res = await chai.request(server).get('/cache/stats');
      stub.restore();
      res.should.have.status(200);

      res.body.should.have.property('tips_length', 2);
      res.body.should.have.property('retips_length', 1);
      res.body.should.have.property('total_tips_length', 3);
      res.body.should.have.property('total_amount', '3');
      res.body.should.have.property('total_unclaimed_amount', '1');
      res.body.should.have.property('senders');
      res.body.senders.should.eql(['ak_tip1', 'ak_tip2', 'ak_retip1']);
      res.body.should.have.property('senders_length', 3);
      res.body.should.have.property('by_url');
      res.body.by_url.should.be.an('Array');
      res.body.by_url.should.have.length(2);
    });

    it(`it should GET all cached stats in less than ${minimalTimeout}ms`, function (done) {
      this.timeout(minimalTimeout);
      checkCachedRoute('/cache/stats', 'object', done);
    });

    it('it should update the stats when the tip cache is invalidated', async () => {
      await cache.del(['getTips']);
      const stub = sinon.stub(CacheLogic, 'statsForTips').callsFake(() => []);
      // Fake keep hot
      await CacheLogic.getTips();
      // Request stats
      const res = await chai.request(server).get('/cache/stats');
      res.should.have.status(200);

      stub.called.should.equal(true);
      stub.restore();
    });
  });
});
