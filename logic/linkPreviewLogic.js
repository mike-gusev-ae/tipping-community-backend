const { LinkPreview } = require('../models');
const DomLoader = require('../utils/domLoader.js');
const axios = require('axios');
const lngDetector = new (require('languagedetect'));
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

lngDetector.setLanguageType('iso2');

const metascraper = require('metascraper')([
  require('metascraper-description')(),
  require('metascraper-image')(),
  require('metascraper-lang')(),
  require('metascraper-title')(),
  require('metascraper-url')(),
]);

module.exports = class LinkPreviewLogic {

  static async fetchAllLinkPreviews () {
    return LinkPreview.findAll({ raw: true });
  }

  // API Functions
  static async getLinkPreview (req, res) {
    const url = req.params.url ? req.params.url : (req.query.url ? req.query.url : null);
    if (url) {
      const result = await LinkPreview.findOne({ where: { requestUrl: url }, raw: true });
      return result ? res.send(result) : res.sendStatus(404);
    }
    res.send(await LinkPreviewLogic.fetchAllLinkPreviews());
  }

  static async getImage (req, res) {
    if (!req.params.filename) return res.sendStatus(404);
    const filepath = path.resolve(__dirname, '../images', req.params.filename.replace('/linkpreview/image', ''));
    if (!fs.existsSync(filepath)) return res.sendStatus(404);
    res.sendFile(filepath);
  }

  // General Functions
  static async generatePreview (url) {
    // Try easy version first
    let queryResult = await LinkPreviewLogic.createPreviewForUrl(url, LinkPreviewLogic.querySimpleCustomCrawler);
    // if it fails try more costly version
    if (!queryResult.querySucceeded)
      queryResult = LinkPreviewLogic.createPreviewForUrl(url, LinkPreviewLogic.queryCostlyCustomCrawler);
    return queryResult;
  }

  static async fetchImage (requestUrl, imageUrl) {

    let newUrl = null;

    // Get Ext name
    let extension = path.extname(imageUrl);
    // Remove any query / hash params
    extension = extension.match(/(^[a-zA-Z0-9]+)/);
    let filename = `preview-${uuidv4()}${extension ? extension[1] : '.jpg'}`;

    try {
      const response = await axios.get(imageUrl, { responseType: 'stream' });
      const writer = response.data.pipe(fs.createWriteStream(path.resolve(__dirname, '../images', filename)));
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      newUrl = `/linkpreview/image/${filename}`;

      // Image too small
      const metaData = await sharp(path.resolve(__dirname, '../images', filename)).metadata();
      if(metaData.width < 300 && metaData.height < 200) newUrl = null;

    } catch (e) {
      console.error('Could not appropriate fetch image');
    }

    // Get Screenshot if needed
    if (!newUrl) {
      try {
        const { screenshot } = await DomLoader.getScreenshot(requestUrl);
        filename = screenshot;
        newUrl = `/linkpreview/image/${filename}`;
        console.log('Got image snapshot preview for', filename);
      } catch (e) {
        console.log(e);
        console.error('screen shot api failed as well for ', requestUrl);
      }
    }

    // Reduce image size
    if(newUrl) {
      try {
        const metaData = await sharp(path.resolve(__dirname, '../images', filename)).metadata();
        if(metaData.width > 500 || metaData.height > 300)  {
          await sharp(path.resolve(__dirname, '../images', filename))
            .resize({width: 500, height: 300, fit: 'inside'})
            .toFile(path.resolve(__dirname, '../images', 'compressed-' + filename))
          newUrl = `/linkpreview/image/compressed-${filename}`;
        }
      } catch (e) {
        console.error('Could not compress image');
      }
    }
    return newUrl;
  }

  static async createPreviewForUrl (url, crawler) {

    try {
      // VERIFY URL
      await metascraper({ url });
      const html = await crawler(url);
      const result = await metascraper({ url, html });
      const data = {
        ...result,
        responseUrl: result.url,
        requestUrl: url,
        querySucceeded: (!!result.title && (!!result.description || !!result.image)),
      };

      if (data.querySucceeded && data.lang === null) {
        const probability = data.description ? lngDetector.detect(data.description, 1) : lngDetector.detect(data.title, 1);
        if (probability && probability.length > 0 && probability[0][1] > 0.1) data.lang = probability[0][0];
      }

      // Remove HTML Tags from text
      data.title = data.title ? data.title.replace(/<(.|\n)*?>/g, '') : data.title;
      data.description = data.description ? data.description.replace(/<(.|\n)*?>/g, '') : data.description;

      // Fetch image
      if (data.image) data.image = await LinkPreviewLogic.fetchImage(data.requestUrl, data.image);

      const existingEntry = await LinkPreview.findOne({ where: { requestUrl: url } });

      if (existingEntry) {
        return await LinkPreview.update({ ...data, failReason: null }, { where: { requestUrl: url }, raw: true });
      } else {
        return await LinkPreview.create(data, { raw: true });
      }
    } catch (err) {
      console.error(`Crawling ${url} failed with "${err.message}"`);

      return LinkPreview.create({
        requestUrl: url,
        querySucceeded: false,
        failReason: err.message ? err.message : err,
      }, { raw: true });
    }
  }

  static async querySimpleCustomCrawler (url) {
    return (await axios.get(url, {
      headers: {
        'Accept-Language': 'en-US'
      }
    })).data;
  };

  static async queryCostlyCustomCrawler (url) {
    return (await DomLoader.getHTMLfromURL(url) || {}).html;
  }
};
