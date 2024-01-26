import bomEnv from '@websolutespa/bom-env';
import express from 'express';
import * as path from 'path';
import payload from 'payload';

bomEnv().then(async () => {

  const basePath = process.env.PAYLOAD_PUBLIC_BASE_PATH || '';

  const app = express();

  app.use(`${basePath}/assets`, express.static(path.resolve(__dirname, './assets')));

  // Redirect root to Admin panel
  app.get(`${basePath}/`, (_, res) => {
    res.redirect(`${basePath}/admin`);
  });

  // Initialize Payload
  await payload.init({
    secret: process.env.PAYLOAD_SECRET,
    mongoURL: process.env.MONGODB_URI,
    express: app,
    onInit: () => {
      payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`);
    },
  });

  const router = express.Router();
  router.use((req, res, next) => {
    if (
      /^options$/i.test(req.method)
      && req.url.indexOf('/bowl/api/llm') === 0
    ) {
      res
        .status(200)
        .set({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        })
        .send();
      return;
    }
    next();
  });

  // Add your own express routes here
  const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
  app.listen(port);

});
