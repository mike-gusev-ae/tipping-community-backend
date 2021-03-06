// Require the dev-dependencies
const chai = require('chai');
const chaiHttp = require('chai-http');
const { describe, it, before } = require('mocha');

const ae = require('../utils/aeternity.js');
const server = require('../server.js');
const { publicKey } = require('../utils/testingUtil.js');

chai.should();
chai.use(chaiHttp);
// Our parent block
describe('Pay for TX', () => {
  describe('Flat API Tests', () => {
    it('it should fail without body', done => {
      chai.request(server).post('/claim/submit').send({}).end((err, res) => {
        res.should.have.status(400);
        done();
      });
    });

    it('it should fail without address', done => {
      chai.request(server).post('/claim/submit').send({
        url: 'https://aeternity.com',
      }).end((err, res) => {
        res.should.have.status(400);
        done();
      });
    });

    it('it should fail without url', done => {
      chai.request(server).post('/claim/submit').send({
        address: publicKey,
      }).end((err, res) => {
        res.should.have.status(400);
        done();
      });
    });
  });

  describe('valid request', () => {
    before(async function () {
      this.timeout(25000);
      await ae.init();
    });

    it('it should reject on website not in contract', done => {
      chai.request(server).post('/claim/submit').send({
        address: publicKey,
        url: 'https://complicated.domain.test',
      }).end((err, res) => {
        res.should.have.status(400);
        res.body.should.have.property('error', 'No zero amount claims');
        done();
      });
    }).timeout(10000);
  });
});
