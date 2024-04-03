import { spawn } from 'child_process';
import * as path from 'path';
import { LlmAppSecrets } from '../types';

export type PythonRulesVectorDbRequest = {
  jsonPath: string;
  secrets: LlmAppSecrets;
};

export type PythonRulesVectorDbResponse = {
  dbVectorFilename: string;
};

export function pythonRulesVectorDbHandler(request: PythonRulesVectorDbRequest): Promise<PythonRulesVectorDbResponse> {
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

    const p = spawn(virtualEnv, [
      '-u',
      'vectore_store/vector_store_rules.py',
      // 'mock/generate-vectordb.py',
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
          console.log('pythonRulesVectorDbHandler', result);
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
