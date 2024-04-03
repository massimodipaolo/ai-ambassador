import { PayloadHandler } from 'payload/config';
import { PayloadRequest } from 'payload/types';
import { appHandler } from './app.handler';
import { errorHandler } from './error.handler';
import { threadHandler } from './thread.handler';
import { LlmInfo } from './types';

export const infoHandler: PayloadHandler = async (req: PayloadRequest, res, next) => {
  try {
    const app = await appHandler(req);
    const info: LlmInfo = {
      contents: app.contents,
    };
    const { threadId } = req.body as { threadId?: string };
    if (app && threadId) {
      const thread = await threadHandler(req, app.id);
      info.thread = {
        messages: thread.message.map(x => ({
          content: x.content,
          role: x.role,
        })),
        threadId,
      };
    }
    res.status(200).send(info);
  } catch (error: any) {
    return errorHandler(error, res);
  }
};
