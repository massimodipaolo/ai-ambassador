import { spawn } from 'child_process';
import * as path from 'path';
import { LlmAppSecrets } from '../types';

export type PythonKnowledgeBaseRequest = {
  knowledgeBasePath: string;
  secrets: LlmAppSecrets;
};

export type PythonKnowledgeBaseResponse = {
  dbVectorFilename: string;
};

export function pythonKnowledgeBaseHandler(request: PythonKnowledgeBaseRequest): Promise<PythonKnowledgeBaseResponse> {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';
    const cwd = process.cwd();
    const lib = 'lib';
    const venv = 'venv';
    const libFolder = path.join(cwd, lib);
    const venvFolder = path.join(cwd, venv);

    const virtualEnv = isWin ?
      path.join(venvFolder, 'Scripts', 'python') :
      path.join(venvFolder, 'bin', 'python3');

    // console.log('pythonKnowledgeBaseHandler', virtualEnv, cwd);

    const p = spawn(virtualEnv, [
      '-u',
      'vectore_store/vectore_store_helper.py',
      //'mock/import-knowledgebase.py',
      JSON.stringify(request),
    ], {
      cwd: libFolder,
    });

    let result = '';

    p.stdout.on('data', (data) => {
      result += data.toString();
    });

    p.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
      reject(data.toString());
    });

    p.on('close', (code) => {
      if (code === 0) {
        try {
          // console.log('pythonKnowledgeBaseHandler', result);
          const jsonResult = JSON.parse(result);
          resolve(jsonResult);
        } catch (error) {
          reject(error);
        }
      } else {
        reject(`Python process exited with code ${code}`);
      }
    });
  });
}
