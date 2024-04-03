import { PayloadRequest } from 'payload/types';
import { options } from '../options';
import { LlmApp } from './types';

export const appHandler = async (req: PayloadRequest) => {
  const { payload } = req;
  if (!payload) {
    throw { status: 500, message: 'Server Error: Cannot resolve payload' };
  }
  const { query } = req;
  if (!query) {
    throw { status: 400, message: 'Bad Request: locale is missing' };
  }
  const { locale } = query;
  if (!locale) {
    throw { status: 400, message: 'Bad Request: locale is missing' };
  }
  const { appKey, apiKey } = req.body as { appKey: string, apiKey: string };
  if (!appKey) {
    throw { status: 401, message: 'Unauthorized: appKey is missing' };
  }
  if (!apiKey) {
    throw { status: 401, message: 'Unauthorized: apiKey is missing' };
  }
  const defaultLocale = payload.config.localization ? payload.config.localization.defaultLocale : 'en';
  const response = await payload.find({
    collection: options.slug.llmApp,
    where: {
      'settings.credentials.appKey': {
        equals: appKey,
      },
      'settings.credentials.apiKey': {
        equals: apiKey,
      },
      isActive: {
        equals: true,
      },
    },
    depth: 3,
    locale: locale as string,
    fallbackLocale: defaultLocale,
    overrideAccess: true,
    showHiddenFields: true,
    pagination: false,
  });
  if (!response.docs.length) {
    throw { status: 404, message: 'Not Found: application not found' };
  }
  const app: LlmApp = response.docs[0];
  const referrer = req.headers.referrer || req.headers.referer || '';
  const isReferrefAllowed = !referrer || app.settings.credentials.httpReferrers.reduce((p, c) => {
    return p || referrer.indexOf(c.referrer) !== -1;
  }, false);
  if (!isReferrefAllowed) {
    // referrer http://localhost:4000/bowl/admin/llm-test
    console.log('referrer', `[${referrer}]`, app.settings.credentials.httpReferrers);
    throw { status: 401, message: `Unauthorized: referrer is not allowed [${referrer}]` };
  }
  return app;
};
