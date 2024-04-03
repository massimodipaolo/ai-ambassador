import fs from 'fs';
import path from 'path';
import { Payload } from 'payload';
import { PayloadHandler } from 'payload/config';
import { PayloadRequest } from 'payload/types';
import { v4 as uuid } from 'uuid';
import { options } from '../options';
import { downloadFile, getKnowledgebasePath } from '../utils/knowledgebase';
import { appHandler } from './app.handler';
import { errorHandler } from './error.handler';
import { PythonStreamRequest, PythonStreamResponse, PythonStreamTool, pythonStreamHandler } from './python/pythonStream.handler';
import { getRulesPath } from './rules.handler';
import { LlmApp, LlmMessage } from './types';

const downloadVectorDbFile = async (vectorDbFileUrl: string | undefined, destFilepath: string) => {
  let vectorDbFilepath = null;

  if (!vectorDbFileUrl) {
    return null;
  }

  if (!fs.existsSync(destFilepath)) {
    fs.mkdirSync(destFilepath, { recursive: true });
  }

  const vectorDbFilename = path.basename(vectorDbFileUrl);
  vectorDbFilepath = path.join(destFilepath, vectorDbFilename);

  const vectorDbDirpath = path.join(destFilepath, path.parse(vectorDbFilename).name);
  try {
    if (
      !fs.existsSync(vectorDbFilepath)
      && (
        !fs.existsSync(vectorDbDirpath)
        || fs.readdirSync(vectorDbDirpath).length == 0
      )
    ) {
      await downloadFile(vectorDbFileUrl, vectorDbFilepath);
    }
  } catch (error) {
    console.log('messageHandler.error', error);
  }

  return vectorDbFilepath;
};

export const messageHandler: PayloadHandler = async (req: PayloadRequest, res, next) => {
  try {
    const app = await appHandler(req);
    const { messages } = req.body as { messages: LlmMessage[] };
    if (!messages || messages.length === 0) {
      throw { status: 400, message: 'Bad Request: messages is missing' };
    }
    let threadId = req.body.threadId;
    // threadId is required when messages.length > 1
    if (!threadId && messages.length > 1) {
      throw { status: 400, message: 'Bad Request: threadId is missing' };
    }
    if (!threadId) {
      threadId = uuid();
    }
    if (!app.settings.llmConfig.prompt.systemMessage) {
      throw { status: 500, message: 'The application is not configured correctly: systemMessage is missing' };
    }

    const kbVectorDb = await downloadVectorDbFile(app.settings.knowledgeBase.vectorDbFile?.url, getKnowledgebasePath(process.cwd(), app.name));
    const rulesVectorDb = await downloadVectorDbFile(app.settings.rules.vectorDbFile?.url, getRulesPath(process.cwd(), app.name));

    let appTools: PythonStreamTool[] = [];
    if (app.settings.appTools && app.settings.appTools.length > 0) {
      appTools = app.settings.appTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        functionName: tool.functionName,
        functionDescription: tool.functionDescription,
        waitingMessage: tool.waitingMessage,
        vectorDbFile: '',
      }));
      for (const tool of app.settings.appTools) {
        const vectorDbFileUrl = tool.knowledgeBase?.vectorDbFile?.url || '';
        if (vectorDbFileUrl) {
          const knowledgebasePath = getKnowledgebasePath(process.cwd(), app.name, tool.name);
          if (!fs.existsSync(knowledgebasePath)) {
            fs.mkdirSync(knowledgebasePath, { recursive: true });
          }

          const vectorDbFilename = path.basename(vectorDbFileUrl);
          const vectorDbFilepath = path.join(knowledgebasePath, vectorDbFilename);
          const index = appTools.findIndex(x => x.name === tool.name);
          if (index > -1) {
            appTools[index].vectorDbFile = vectorDbFilepath;
          }

          const vectorDbDirpath = path.join(knowledgebasePath, path.parse(vectorDbFilename).name);
          try {
            if (
              !fs.existsSync(vectorDbFilepath)
              && (
                !fs.existsSync(vectorDbDirpath)
                || fs.readdirSync(vectorDbDirpath).length == 0
              )
            ) {
              await downloadFile(vectorDbFileUrl, vectorDbFilepath);
            }
          } catch (error) {
            console.log('messageHandler.error', error);
          }
        }
      }
    }

    const request: PythonStreamRequest = {
      messages: messages.map(x => ({
        role: x.role,
        content: x.content,
      })),
      secrets: app.settings.llmConfig.secrets,
      systemMessage: app.settings.llmConfig.prompt.systemMessage,
      threadId: threadId,
      tools: app.settings.llmConfig.tools,
      appTools: appTools,
      vectorDb: kbVectorDb,
      rulesVectorDb: rulesVectorDb,
      fineTunedModel: app.settings?.fineTuning?.fineTunedModelName ?? '',
      langChainTracing: app.settings?.llmConfig?.langChainTracing ?? false,
      langChainProject: app.settings?.llmConfig?.langChainProject ?? '',
    };
    const streamHandler = pythonStreamHandler(request, (response: PythonStreamResponse) => {
      // console.log('response', response);
      // add response messages to the thread
      messages.push({
        role: 'assistant',
        content: response.chunks.map(msg => typeof msg === 'string' ? msg : JSON.stringify(msg)).join(' '),
      });
      // log thread messages
      logThread(req.payload, threadId, app, messages).then(thread => {
        // console.log('thread logged', thread);
      });
    });
    return await streamHandler(req, res, next);
  } catch (error: any) {
    return errorHandler(error, res);
  }
};

async function logThread(payload: Payload, threadId: string, app: LlmApp, messages: LlmMessage[]): Promise<any> {
  const threads = await payload.find({
    collection: options.slug.llmThread,
    where: {
      'id': {
        equals: threadId,
      },
    },
  });
  const thread = threads.docs.length ? threads.docs[0] : null;
  if (thread) {
    return await payload.update({
      collection: options.slug.llmThread,
      id: thread.id,
      data: {
        message: messages,
      },
    });
  } else {
    return await payload.create({
      collection: options.slug.llmThread,
      data: {
        id: threadId,
        llmApp: app.id,
        message: messages,
      },
    });
  }
}
