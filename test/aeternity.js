// Require the dev-dependencies
const chai = require('chai');
const chaiHttp = require('chai-http');
const { describe, it, before } = require('mocha');
const sinon = require('sinon');

const ae = require('../utils/aeternity.js');
const Trace = require('../utils/trace');

chai.should();
chai.use(chaiHttp);
// Our parent block
describe('Aeternity', () => {
  let sandbox;

  before(() => {
    sandbox = sinon.createSandbox();
  });

  it('it should init', async function () {
    this.timeout(5000);
    await ae.init();
  });

  it('it should get the network id', async () => {
    const result = await ae.networkId();
    result.should.equal('ae_uat');
  });

  it('it should get the oracle state', async function () {
    this.timeout(30000);
    const result = await ae.fetchOracleState();
    result.should.be.an('object');
    result.should.have.property('minimum_amount_of_oracles');
    result.should.have.property('oracle_queries');
    result.should.have.property('owner');
    result.should.have.property('success_claimed_urls');
    result.should.have.property('trusted_oracle_seq');
    result.should.have.property('trusted_oracles');
  });

  it('it should get the tips', async function () {
    this.timeout(10000);
    const result = await ae.fetchTips();
    result.should.be.an('array');
    if (result.length > 0) {
      const firstEntry = result[0];
      firstEntry.should.have.property('amount');
      firstEntry.should.have.property('claim_gen');
      firstEntry.should.have.property('sender');
      firstEntry.should.have.property('timestamp');
      firstEntry.should.have.property('title');
      firstEntry.should.have.property('url_id');
      firstEntry.should.have.property('id');
      firstEntry.id.should.be.an('String');
      firstEntry.should.have.property('url');
      firstEntry.should.have.property('topics');
      firstEntry.should.have.property('retips');
      firstEntry.should.have.property('claim');
      firstEntry.should.have.property('amount_ae');
      firstEntry.should.have.property('retip_amount_ae');
      firstEntry.should.have.property('total_amount');
      firstEntry.should.have.property('total_unclaimed_amount');
    }
  });

  it('it should get the tipping contract source', async () => {
    const result = await ae.getContractSource();
    result.should.be.an('string');
  });

  it('it should get the oracle contract source', async () => {
    const result = await ae.getOracleContractSource();
    result.should.be.an('string');
  });

  it('it should fail pre-claiming an non existing tip', async function () {
    this.timeout(10000);

    const result = await ae.preClaim('not_a_real_account', 'https://probably.not.an.existing.tip', new Trace());

    result.should.be.a('boolean');
    result.should.eql(false);
  });

  const url = 'https://probably.not.an.existing.tip';
  const address = 'ak_YCwfWaW5ER6cRsG9Jg4KMyVU59bQkt45WvcnJJctQojCqBeG2';
  it('it should succeed pre-claiming with stubs', async function () {
    this.timeout(10000);
    const unclaimdForUrl = sandbox.stub(ae.contract.methods, 'unclaimed_for_url').callsFake(async () => ({ decodedResult: 1 }));
    const checkClaim = sandbox.stub(ae.contract.methods, 'check_claim').callsFake(async () => ({ decodedResult: { success: true } }));
    await ae.preClaim(address, url, new Trace());
    unclaimdForUrl.called.should.equal(true);
    sinon.assert.alwaysCalledWith(unclaimdForUrl, url);
    checkClaim.called.should.equal(true);
    sinon.assert.alwaysCalledWith(checkClaim, url, address);
  });

  it('it should allow to claim if all goes well (with stubs)', async function () {
    this.timeout(10000);
    const claim = sandbox.stub(ae.contract.methods, 'claim').callsFake(async () => ({ decodedResult: true }));
    const result = await ae.claimTips(address, url, new Trace());
    result.should.equal(true);
    claim.called.should.equal(true);
    sinon.assert.alwaysCalledWith(claim, url, address);
  });

  after(() => {
    sandbox.restore();
  });
});
