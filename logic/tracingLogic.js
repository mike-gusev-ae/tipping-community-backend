const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { Trace: TraceModel } = require('../models');

module.exports = {
  Trace: class Trace {

    constructor () {
      this.id = uuidv4();
      // TODO create new entry
      this.data = [];
      this.writeToJSON();
    }

    update (update) {
      console.log('UPDATE TRACE', this.id, update);
      this.data.push(Object.assign(update, { date: new Date() }));
      this.writeToJSON();
    }

    setUrl (url) {
      TraceModel.create({
        url,
        uuid: this.id,
      });
    }

    writeToJSON () {
      fs.writeFileSync(`./traces/${this.id}.json`, JSON.stringify(this.data));
    }

    catchError (returnValue) {
      return (e) => {
        this.update({ state: Trace.state.CAUGHT_ERROR, error: Object.assign({}, e) });
        return returnValue;
      };
    }

    finished (result) {
      this.update(Object.assign({ state: Trace.state.FINISHED }, result));
      this.writeToJSON();
      console.log('TRACE', this.id);
      console.log(this.data);
    }

    static state = {
      REQUEST_RECEIVED: 'REQUEST_RECEIVED',
      BODY_RECEIVED: 'BODY_RECEIVED',
      DATA_PARSED: 'DATA_PARSED',
      CLAIM_AMOUNT: 'CLAIM_AMOUNT',
      INITIAL_PRECLAIM_RESULT: 'INITIAL_PRECLAIM_RESULT',
      ESTIMATED_FEE: 'ESTIMATED_FEE',
      PRECLAIM_STARTED: 'PRECLAIM_STARTED',
      STARTED_PRE_CLAIM: 'STARTED_PRE_CLAIM',
      CAUGHT_ERROR: 'CAUGHT_ERROR',
      REQUEST_ANSWERED: 'REQUEST_ANSWERED',
      FINAL_PRECLAIM_RESULT: 'FINAL_PRECLAIM_RESULT',
      CLAIM_RESULT: 'CLAIM_RESULT',
      ERROR: 'ERROR',
      FINISHED: 'FINISHED',
    };
  },
  TracingLogic: class TracingLogic {
    static async readTraces () {
      const traceFolder = path.resolve(`./trace/`);
      const traceFiles = await fs.readdirSync(traceFolder);
      const traces = traceFiles
        .reduce((allTraces, file) => allTraces.push(JSON.parse(fs.readFileSync(`${traceFolder}/${file}`, 'utf-8'))), [])
        .filter(line => !!line)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return traces;
    }

    static async getAllTraces (req, res) {
      const traceFolder = path.resolve(`./trace/`);
      const allTracesDB = await TraceModel.findAll({ raw: true });
      const allTraces = allTracesDB.reduce((acc, trace) => acc.push(JSON.parse(fs.readFileSync(`${traceFolder}/${trace.uuid}.json`, 'utf-8'))), []);
      res.send(allTraces);
    }
  },
};
