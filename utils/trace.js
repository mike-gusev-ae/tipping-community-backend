const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { Trace: TraceModel } = require('../models');
const logger = require('./logger')(module);
const { TRACE_STATES } = require('../models/enums/trace');

module.exports = class Trace {
  constructor() {
    this.id = uuidv4();
    this.data = [];
    this.writeToJSON();
    this.saveToDisk = false;
  }

  update(update) {
    logger.debug(`Updating trace ${this.id} with data: ${JSON.stringify(update)}`);
    this.data.push(Object.assign(update, { date: Date.now() }));
    if (this.saveToDisk) this.writeToJSON();
  }

  setMetaData(url, publicKey) {
    TraceModel.create({
      url,
      publicKey,
      uuid: this.id,
    });
    this.saveToDisk = true;
  }

  writeToJSON() {
    fs.writeFileSync(`./traces/${this.id}.json`, JSON.stringify(this.data));
  }

  catchError(returnValue) {
    return e => {
      this.update({ state: TRACE_STATES.CAUGHT_ERROR, error: { ...e } });
      return returnValue;
    };
  }

  finished(result) {
    this.update({ state: TRACE_STATES.FINISHED, ...result });
    this.writeToJSON();
    logger.info(`finished trace ${this.id}`);
  }
};
