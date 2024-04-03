import fs from 'fs';
import mime from 'mime-types';
import path from 'path';
import { Payload } from 'payload';
import { v4 as uuid } from 'uuid';
import { options } from '../options';
import { deleteFolderRecursive, downloadFile, getKnowledgebasePath, remapKnowledgebaseFile } from '../utils/knowledgebase';
import { pythonKnowledgeBaseHandler } from './python/pythonKnowledgeBase.handler';
import { LlmApp, LlmKnowledgeBase } from './types';

export type LlmImportedKnowledgeBase = {
  appName: string,
  toolName: string,
};

export type LlmImportedApp = {
  name: string;
  knowledgeBase: LlmKnowledgeBase;
};

export async function knowledgeBaseHandler(payload: Payload): Promise<LlmImportedApp[]> {
  const response = await payload.find({
    collection: options.slug.llmApp,
    pagination: false,
    overrideAccess: true,
  });
  const apps = response.docs as LlmApp[];
  const importedApps: LlmImportedApp[] = [];
  const tempKnowledgebasePath = path.join(process.cwd(), 'lib', 'knowledge-base', uuid());
  for (const app of apps) {
    // console.log('@websolutespa/payload-plugin-bowl-llm', 'knowledgeBaseHandler', app.name, app.settings.knowledgeBase);
    // create app temp directory
    const appPath = path.join(tempKnowledgebasePath, app.name);
    fs.mkdirSync(appPath, { recursive: true });

    // download external endpoints and move them to the app temp directory
    const endpoints = app?.settings?.knowledgeBase?.externalEndpoints || [];
    for (const endpoint of endpoints) {
      const filename = path.basename(endpoint.endpointUrl);
      const dest = path.join(appPath, filename);
      await downloadFile(endpoint.endpointUrl, dest);
      // rewrite file using LlmApp fields map settings
      remapKnowledgebaseFile(endpoint.fieldsMapping, dest);
    }
    // download manually uploaded files and move them to the app temp directory
    const files = app?.settings?.knowledgeBase?.files || [];
    const fileUrls: string[] = files.filter(x => x.media.url != null).map(x => x.media.url) as string[];
    for (const file of fileUrls) {
      const filename = path.basename(file);
      const dest = path.join(appPath, filename);
      await downloadFile(file, dest);
    }

    // spawn python import service, get generated db vector filename
    const { dbVectorFilename } = await pythonKnowledgeBaseHandler({ knowledgeBasePath: appPath, secrets: app.settings.llmConfig.secrets });
    // save db vector file in the LlmApp
    const dbVectorPath = path.join(appPath, dbVectorFilename);
    const mediaDoc = await payload.create({
      collection: 'media',
      data: {
        alt: 'Vector Database File',
      },
      overrideAccess: true,
      file: {
        data: fs.readFileSync(dbVectorPath),
        mimetype: mime.lookup(dbVectorPath) as string,
        name: dbVectorFilename,
        size: fs.statSync(dbVectorPath).size,
      },
    });
    await payload.update({
      collection: options.slug.llmApp,
      id: app.id,
      data: {
        settings: {
          knowledgeBase: {
            vectorDbFile: mediaDoc.id,
          },
        },
      },
      overrideAccess: true,
    });

    // delete obsolete knowledge-base directory
    const knowledgebasePath = getKnowledgebasePath(process.cwd(), app.name);
    deleteFolderRecursive(knowledgebasePath);

    importedApps.push({
      name: app.name,
      knowledgeBase: app.settings.knowledgeBase,
    });
  }

  // delete temp directory
  deleteFolderRecursive(tempKnowledgebasePath);

  return importedApps;
}

// alternative knowledgeBaseHandler: separated knowledge base for each tool
export async function toolsKnowledgeBaseHandler(payload: Payload): Promise<LlmImportedKnowledgeBase[]> {
  const response = await payload.find({
    collection: options.slug.llmApp,
    pagination: false,
    overrideAccess: true,
    where: {
      'isActive': { equals: true },
    },
  });
  const apps = response.docs as LlmApp[];
  const importedApps: LlmImportedKnowledgeBase[] = [];
  const tempKnowledgebasePath = path.join(process.cwd(), 'lib', 'knowledge-base', uuid());
  for (const app of apps) {
    const appTools = app.settings.appTools;
    for (const tool of app.settings.appTools) {
      // create app tool temp directory
      const appPath = getKnowledgebasePath(tempKnowledgebasePath, app.name, tool.name);
      fs.mkdirSync(appPath, { recursive: true });

      // download external endpoints and move them to the app temp directory
      const endpoints = tool.knowledgeBase?.externalEndpoints?.filter(x => x.endpointUrl !== '') || [];
      for (const endpoint of endpoints) {
        const filename = path.basename(endpoint.endpointUrl);
        const dest = path.join(appPath, filename);
        await downloadFile(endpoint.endpointUrl, dest);
        // rewrite file using LlmApp fields map settings
        remapKnowledgebaseFile(endpoint.fieldsMapping, dest);
      }
      // download manually uploaded files and move them to the app temp directory
      const files = tool.knowledgeBase.files || [];
      const fileUrls: string[] = files.filter(x => x.media?.url != null).map(x => x.media.url) as string[];
      for (const file of fileUrls) {
        const filename = path.basename(file);
        const dest = path.join(appPath, filename);
        await downloadFile(file, dest);
      }

      // spawn python import service, get generated db vector filename
      const { dbVectorFilename } = await pythonKnowledgeBaseHandler({ knowledgeBasePath: appPath, secrets: app.settings.llmConfig.secrets });

      // save db vector file in the LlmApp tool
      const dbVectorPath = path.join(appPath, dbVectorFilename);
      const mediaDoc = await payload.create({
        collection: 'media',
        data: {
          alt: 'Vector Database File',
        },
        overrideAccess: true,
        file: {
          data: fs.readFileSync(dbVectorPath),
          mimetype: mime.lookup(dbVectorPath) as string,
          name: dbVectorFilename,
          size: fs.statSync(dbVectorPath).size,
        },
      });
      appTools[appTools.findIndex(x => x.id === tool.id)].knowledgeBase.vectorDbFile = mediaDoc.id;
      // avoid ValidationError on field settings.appTools.0.knowledgeBase.files.0.media :O
      delete appTools[appTools.findIndex(x => x.id === tool.id)].knowledgeBase.files;

      // delete obsolete knowledge-base directory
      const knowledgebasePath = getKnowledgebasePath(process.cwd(), app.name, tool.name);
      deleteFolderRecursive(knowledgebasePath);

      importedApps.push({
        appName: app.name,
        toolName: tool.name,
      });
    }

    await payload.update({
      collection: options.slug.llmApp,
      id: app.id,
      data: {
        settings: {
          appTools: appTools,
        },
      },
      overrideAccess: true,
    });
  }

  // delete temp directory
  deleteFolderRecursive(tempKnowledgebasePath);

  return importedApps;
}
