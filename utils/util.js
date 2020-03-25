const BigNumber = require('bignumber.js');

const atomsToAe = (atoms) => (new BigNumber(atoms)).dividedBy(new BigNumber(1000000000000000000));
const aeToAtoms = (ae) => (new BigNumber(ae)).times(new BigNumber(1000000000000000000));
const wrapTry = async (f) => {
  try {
    return Promise.race([
      f().then(res => {
        if (!res.statusText === 'OK') throw new Error(`Request failed with ${res.status}`);
        return res.data;
      }),
      new Promise(function (resolve, reject) {
        setTimeout(reject, 3000, 'TIMEOUT');
      })
    ])
  } catch (e) {
    console.error("backend error", e);
    return null;
  }
};

Array.prototype.asyncMap = async function (asyncF) {
  return this.reduce(async (promiseAcc, cur) => {
    const acc = await promiseAcc;
    const res = await asyncF(cur).catch(e => {
      console.error("asyncMap asyncF", e.message);
      return null;
    });
    if (Array.isArray(res)) {
      return acc.concat(res);
    } else {
      if (res) acc.push(res);
      return acc;
    }
  }, Promise.resolve([]));
};


module.exports = {
  atomsToAe,
  aeToAtoms,
  wrapTry
};