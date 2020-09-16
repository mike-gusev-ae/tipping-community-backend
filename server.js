const express = require('express');
const cors = require('cors');
const fs = require('fs');
const exphbs = require('express-handlebars');
const { handleResponses, handleRequests } = require('express-oas-generator');

const app = express();
const logger = require('./utils/logger')(module);

const openAPIFilePath = './api.json';

// VIEWS
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

app.use(express.json()); // for parsing application/json
/** handle the responses */
if (process.env.NODE_ENV !== 'production') {
  let predefinedSpec;

  try {
    predefinedSpec = JSON.parse(
      fs.readFileSync(openAPIFilePath, { encoding: 'utf-8' }),
    );
  } catch (e) {
    //
  }

  /** work-arounds done. Now handle responses - MUST be the FIRST middleware */
  handleResponses(app, {
    specOutputPath: openAPIFilePath,
    writeIntervalMs: 0,
    predefinedSpec: predefinedSpec ? () => predefinedSpec : undefined,
  });
}
app.use(cors({
  origin: '*',
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
// ROUTES
app.use('/blacklist', require('./routes/blacklistRoutes.js'));
app.use('/comment', require('./routes/commentRoutes.js'));
app.use('/linkpreview', require('./routes/linkPreviewRoutes.js'));
app.use('/verified', require('./routes/verifiedRoutes.js'));
app.use('/cache', require('./routes/cacheRoutes.js'));
app.use('/claim', require('./routes/payForTxRoutes.js'));
app.use('/static', require('./routes/staticRoutes.js'));
app.use('/profile', require('./routes/profileRoutes.js'));
app.use('/errorreport', require('./routes/errorReportRoutes.js'));
app.use('/tracing', require('./routes/tipTracingRoutes.js'));
app.use('/health', require('./routes/healthRoutes.js'));
app.use('/pin', require('./routes/pinRoutes.js'));
app.use('/notification', require('./routes/notificationRoutes.js'));

app.use('/images', express.static('./images'));

/** lastly - add the express-oas-generator request handler (MUST be the LAST middleware) */
if (process.env.NODE_ENV !== 'production') {
  handleRequests();
}
app.use((req, res, next) => {
  res.sendStatus(404);
  next();
});

app.listen(3000, () => {
  logger.info('Server started');
});

process
  .on('unhandledRejection', (reason, p) => {
    logger.error(`${reason} Unhandled Rejection at Promise ${p}`);
  })
  .on('uncaughtException', err => {
    logger.error(err);
  });

module.exports = app;
