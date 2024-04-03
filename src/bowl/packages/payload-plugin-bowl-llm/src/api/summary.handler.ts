import { PayloadHandler } from 'payload/config';
import { PayloadRequest } from 'payload/types';
import { appHandler } from './app.handler';
import { errorHandler } from './error.handler';
import { LlmSummary } from './types';

export const summaryHandler: PayloadHandler = async (req: PayloadRequest, res, next) => {
  try {
    const app = await appHandler(req);

    const summary = req.body as LlmSummary;
    if (!summary.email) {
      throw { status: 400, message: 'Bad Request: email is missing' };
    }
    if (!summary.html) {
      throw { status: 400, message: 'Bad Request: html is missing' };
    }

    if (app.webhooks && app.webhooks.length > 0) {
      for (const webhook of app.webhooks) {
        await fetch(webhook.webhook, {
          method: 'post',
          body: JSON.stringify({
            action: 'summary',
            data: summary,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    }
    else {
      req.payload.sendEmail({
        to: summary.email,
        subject: 'Summary',
        html: summary.html,
      });
    }

    res.status(200).send();
  } catch (error: any) {
    return errorHandler(error, res);
  }
};
