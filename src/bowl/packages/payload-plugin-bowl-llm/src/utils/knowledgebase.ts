import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { LlmFieldsMapping } from '../api/types';

export function getKnowledgebasePath(basePath: string, appName: string, toolName: string = ''): string {
  let kbPath = path.join(basePath, 'knowledge-base', appName);
  if (toolName !== '') {
    kbPath = path.join(kbPath, toolName);
  }
  return kbPath;
}

export async function downloadFile(url: string, dest: string): Promise<void> {
  const file = fs.createWriteStream(dest);
  return new Promise<void>((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, response => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file from '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });
    request.on('error', err => {
      fs.unlink(dest, () => reject(err));
    });
    file.on('error', err => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

export function deleteFolderRecursive(path: string): void {
  if (!fs.existsSync(path)) return;

  fs.rm(path, { recursive: true, force: true }, err => {
    if (err) {
      throw err;
    }
  });
}

export function remapKnowledgebaseFile(mapping: LlmFieldsMapping, filepath: string): void {
  const mapNewFields = mapping?.newFields || [];
  const mapReplacedFields = mapping?.replacedFields || [];
  const deletedFields = mapping?.deletedFields || [];

  if (!mapNewFields.length && !mapReplacedFields.length && !deletedFields.length) {
    return;
  }

  const originalData = JSON.parse(fs.readFileSync(filepath, 'utf8'));

  for (const item of originalData) {
    // replaced fields
    for (const field of mapReplacedFields) {
      // src fields with dot notation means that the field to be replaced is nested
      if (field.srcName.includes('.')) {
        const keys = field.srcName.split('.');
        const lastKey = keys.pop() as string;
        let obj = item;
        for (const key of keys) {
          obj = obj != null ? obj[key] : null;
        }
        if (obj != null) {
          obj[field.destName] = obj[lastKey];
          delete obj[lastKey];
        }
      } else {
        item[field.destName] = item[field.srcName];
        delete item[field.srcName];
      }
    }

    // deleted fields
    for (const field of deletedFields) {
      // src fields with dot notation means that the field to be deleted is nested
      if (field.name.includes('.')) {
        const keys = field.name.split('.');
        const lastKey = keys.pop() as string;
        let obj = item;
        for (const key of keys) {
          obj = obj != null ? obj[key] : null;
        }
        if (obj != null) {
          delete obj[lastKey];
        }
      } else {
        delete item[field.name];
      }
    }

    // new fields
    for (const field of mapNewFields) {
      item[field.name] = field.value;
    }

  }

  fs.writeFileSync(filepath, JSON.stringify(originalData));
}
