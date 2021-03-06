// Require the dev-dependencies
const chai = require('chai');
const chaiHttp = require('chai-http');
const { describe, it, before } = require('mocha');
const server = require('../server');
const { ErrorReport } = require('../models');

chai.should();
chai.use(chaiHttp);
// Our parent block
describe('Error Reports', () => {
  before(done => { // Before each test we empty the database
    ErrorReport.destroy({
      where: {},
      truncate: true,
    }).then(() => done());
  });

  const testData = {
    appVersion: '0.0.21',
    browser: {
      name: 'chrome',
      os: 'Windows 10',
      version: '81.0.4044',
    },
    error: {
      message: 'Ooops something went very wrong somehwere',
      stack: `
      Some
      Multiline
      Info`,
      other: 'fields',
    },
    time: 143489512334,
    platform: 'extension',
    description: 'description',
  };

  describe('Error Report API', () => {
    it('it should GET all reports (empty)', done => {
      chai.request(server).get('/errorreport').auth(process.env.AUTHENTICATION_USER, process.env.AUTHENTICATION_PASSWORD).end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('array');
        res.body.length.should.be.eql(0);
        done();
      });
    });
    let reportId = null;
    it('it should CREATE a new error report', done => {
      chai.request(server).post('/errorreport').send(testData).end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('id');
        res.body.should.have.property('appVersion', testData.appVersion);
        res.body.should.have.property('browser', JSON.stringify(testData.browser));
        res.body.should.have.property('error', JSON.stringify(testData.error));
        res.body.should.have.property('time', String(testData.time));
        res.body.should.have.property('platform', testData.platform);
        res.body.should.have.property('description', testData.description);
        res.body.should.have.property('createdAt');
        res.body.should.have.property('updatedAt');
        reportId = res.body.id;
        done();
      });
    });

    it('it should GET all reports (1 result)', done => {
      chai.request(server).get('/errorreport').auth(process.env.AUTHENTICATION_USER, process.env.AUTHENTICATION_PASSWORD).end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('array');
        res.body.length.should.be.eql(1);
        res.body[0].should.have.property('id', reportId);
        done();
      });
    });
  });
});
