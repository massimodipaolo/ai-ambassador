import { PayloadRequest } from 'payload/types';
import { options } from '../options';
import { LlmApp, LlmMessage } from './types';

export const threadHandler = async (req: PayloadRequest, appId: string) => {
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
  const { appKey, apiKey, threadId } = req.body as { appKey: string, apiKey: string, threadId: string };
  if (!appKey) {
    throw { status: 401, message: 'Unauthorized: appKey is missing' };
  }
  if (!apiKey) {
    throw { status: 401, message: 'Unauthorized: apiKey is missing' };
  }
  if (!threadId) {
    throw { status: 401, message: 'Unauthorized: threadId is missing' };
  }
  const defaultLocale = payload.config.localization ? payload.config.localization.defaultLocale : 'en';
  const response = await payload.find({
    collection: options.slug.llmThread,
    where: {
      id: {
        equals: threadId,
      },
      llmApp: {
        equals: appId,
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
    throw { status: 404, message: 'Not Found: thread not found' };
  }
  const thread = response.docs[0];
  return thread as {
    id: string;
    llmApp: LlmApp;
    message: (LlmMessage & { id: string })[];
  };
};
