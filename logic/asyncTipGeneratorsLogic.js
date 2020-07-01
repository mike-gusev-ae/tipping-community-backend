const LinkPreviewLogic = require('./linkPreviewLogic.js');
const TipLogic = require('./tipLogic');
const aeternity = require('../utils/aeternity.js');

var AsyncLock = require('async-lock');
var lock = new AsyncLock();

const lngDetector = new (require('languagedetect'));
lngDetector.setLanguageType('iso2');

const cld = require('cld');

module.exports = class AsyncTipGeneratorsLogic {

  static async triggerGeneratePreviews(tips) {
    lock.acquire("AsyncTipGeneratorsLogic.triggerGeneratePreviews", async () => {
      const previews = await LinkPreviewLogic.fetchAllLinkPreviews();
      const tipUrls = [...new Set(tips.map(tip => tip.url))];
      const previewUrls = [...new Set(previews.map(preview => preview.requestUrl))];

      const difference = tipUrls.filter(url => !previewUrls.includes(url));

      await difference.asyncMap(async (url) => {
        await LinkPreviewLogic.generatePreview(url).catch(console.error);
      })
    });
  }

  static async triggerLanguageDetection(tips) {
    lock.acquire("AsyncTipGeneratorsLogic.triggerLanguageDetection", async () => {
      const languages = await TipLogic.fetchAllLocalTips();
      const tipIds = [...new Set(tips.map(tip => tip.id))];
      const languageIds = [...new Set(languages.map(preview => preview.id))];

      const difference = tipIds.filter(url => !languageIds.includes(url));

      const result = await difference.asyncMap(async (id) => {
        let tip = tips.find(tip => tip.id === id)
        let title = tip.title.replace(/[!0-9#.,?)-:'“@\/\\]/g, '');
        //const probability = lngDetector.detect(title, 1);
        const probability2 = await cld.detect(title).catch(() => ({}));
        //const lang1 = probability[0] ? probability[0][0] !== null ? probability[0][0] : null : null;
        const lang2 = probability2.languages ? probability2.languages[0].code : null;
        return {id, lang2, title}
      });

      await TipLogic.bulkCreate(result.map(({id, lang2}) => ({
        id,
        language: lang2
      })));
    });
  }

  static async triggerGetTokenContractIndex(tips) {
    return lock.acquire("AsyncTipGeneratorsLogic.triggerTokenContractIndex", async () => {
      const tokenContracts = tips.filter(t => t.token).map(t => t.token);

      await aeternity.init();
      const tokenRegistryContracts = await aeternity.getTokenRegistryState()
        .then(state => state.map(([token, _]) => token));

      return [...new Set(tokenContracts.concat(tokenRegistryContracts))]
        .reduce(async (promiseAcc, address) => {
          const acc = await promiseAcc;
          acc[address] = await aeternity.getTokenMetaInfoCacheAccounts(address);
          return acc;
        }, Promise.resolve({}));
    });
  }
};