import fs from 'fs';
import mime from 'mime-types';
import path from 'path';
import { Payload } from 'payload';
import { v4 as uuid } from 'uuid';
import { options } from '../options';
import { deleteFolderRecursive } from '../utils/knowledgebase';
import { pythonRulesVectorDbHandler } from './python/pythonRulesVectorDb.handler';
import { LlmApp, LlmRules } from './types';

export type LlmImportedApp = {
  name: string;
  rules: LlmRules;
};

export function getRulesPath(basePath: string, appName: string): string {
  return path.join(basePath, 'rules', appName);
}

export async function rulesHandler(payload: Payload): Promise<LlmImportedApp[]> {
  const response = await payload.find({
    collection: options.slug.llmApp,
    pagination: false,
    overrideAccess: true,
  });
  const apps = response.docs as LlmApp[];
  const importedApps: LlmImportedApp[] = [];
  const tempRulesPath = path.join(process.cwd(), 'lib', 'rules', uuid());

  for (const app of apps) {
    // get app rules
    const rules = await payload.find({
      collection: options.slug.llmRule,
      where: {
        llmApp: {
          equals: app.id,
        },
      },
      overrideAccess: true,
    });

    if (!rules.docs.length) {
      continue;
    }

    // write rules to json file
    const json = rules.docs.map(doc => doc.description as string);
    const appPath = path.join(tempRulesPath, app.name);
    fs.mkdirSync(appPath, { recursive: true });
    const dest = path.join(appPath, 'rules.json');
    fs.writeFileSync(dest, JSON.stringify(json));

    // spawn python process to generate the rules vector db file
    const { dbVectorFilename } = await pythonRulesVectorDbHandler({ jsonPath: appPath, secrets: app.settings.llmConfig.secrets });

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
          rules: {
            vectorDbFile: mediaDoc.id,
          },
        },
      },
      overrideAccess: true,
    });

    // delete obsolete rules directory
    const rulesPath = getRulesPath(process.cwd(), app.name);
    deleteFolderRecursive(rulesPath);

    importedApps.push({
      name: app.name,
      rules: app.settings.rules,
    });
  }

  // delete temp directory
  deleteFolderRecursive(tempRulesPath);

  return importedApps;
}
