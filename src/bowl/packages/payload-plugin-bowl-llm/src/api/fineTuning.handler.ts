import fs from 'fs';
import OpenAI from 'openai';
import path from 'path';
import { Payload } from 'payload';
import { PayloadHandler } from 'payload/config';
import { PayloadRequest } from 'payload/types';
import { options } from '../options';
import { appHandler } from './app.handler';
import { errorHandler } from './error.handler';
import { LlmApp } from './types';

const setLlmAppCurrentJobId = async (payload: Payload, app: LlmApp, jobId: string) => {
  await payload.update({
    collection: options.slug.llmApp,
    id: app.id,
    data: {
      settings: {
        fineTuning: {
          currentJobId: jobId,
        },
      },
    },
    overrideAccess: true,
  });
};

const createFineTuningJob = async (payload: Payload, app: LlmApp, jsonlFilePath: string) => {
  const openai = new OpenAI({ apiKey: app.settings.llmConfig.secrets.openAIApiKey });

  const file = await openai.files.create({ file: fs.createReadStream(jsonlFilePath), purpose: 'fine-tune' });
  const job = await openai.fineTuning.jobs.create({ training_file: file.id, model: 'gpt-3.5-turbo-1106', suffix: app.settings?.fineTuning?.modelNameSuffix ?? '' });

  return job;
};

const writeFineTuningJsonlFile = async (payload: Payload, app: LlmApp) => {
  const response = await payload.find({
    collection: options.slug.llmFineTuning,
    where: {
      llmApp: {
        equals: app.id,
      },
    },
    overrideAccess: true,
  });

  let jsonl = '';
  for (const doc of response.docs) {
    const json = {
      messages: [
        {
          role: 'system',
          content: app.settings.llmConfig.prompt.systemMessage || '',
        },
        {
          role: 'user',
          content: doc.question,
        },
        {
          role: 'assistant',
          content: doc.answer,
        },
      ],
    };
    jsonl = jsonl.concat(JSON.stringify(json) + '\n');
  }

  const fineTuningPath = path.join(process.cwd(), 'lib', 'fine-tuning');
  fs.mkdirSync(fineTuningPath, { recursive: true });
  const dest = path.join(fineTuningPath, 'finetuning.jsonl');
  fs.writeFileSync(dest, jsonl);

  return dest;
};

export async function fineTuningJobsHandler(payload: Payload) {
  const result = await payload.find({
    collection: options.slug.llmApp,
    where: {
      'settings.fineTuning.currentJobId': {
        not_equals: null,
      },
    },
    overrideAccess: true,
  });

  for (const app of result.docs) {
    const jobId = app.settings.fineTuning.currentJobId;

    const openai = new OpenAI({ apiKey: app.settings.llmConfig.secrets.openAIApiKey });
    const fineTune = await openai.fineTuning.jobs.retrieve(jobId);

    if (fineTune.status === 'succeeded') {
      await payload.update({
        collection: options.slug.llmApp,
        id: app.id,
        data: {
          settings: {
            fineTuning: {
              currentJobId: null,
              fineTunedModelName: fineTune.fine_tuned_model,
            },
          },
        },
        overrideAccess: true,
      });
    }
  }
}

export const fineTuningHandler: PayloadHandler = async (req: PayloadRequest, res, next) => {
  try {
    const { payload } = req;
    const app = await appHandler(req);

    const jsonlFilePath = await writeFineTuningJsonlFile(payload, app);
    const job = await createFineTuningJob(payload, app, jsonlFilePath);
    await setLlmAppCurrentJobId(payload, app, job.id);

    res.status(200).send(job);
  } catch (error: any) {
    return errorHandler(error, res);
  }
};
