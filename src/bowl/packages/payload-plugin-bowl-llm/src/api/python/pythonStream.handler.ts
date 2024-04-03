import { isObject } from '@websolutespa/bom-core';
import { spawn } from 'child_process';
import * as path from 'path';
import { PayloadHandler } from 'payload/config';
import { PayloadRequest } from 'payload/types';
import { LlmAppSecrets, LlmChunk, LlmChunkItem, LlmMessage, LlmTool } from '../types';

export type PythonStreamRequest = {
  systemMessage: string;
  messages: LlmMessage[];
  secrets: LlmAppSecrets;
  threadId: string;
  tools: LlmTool[];
  appTools: PythonStreamTool[];
  vectorDb: string | null;
  rulesVectorDb: string | null;
  fineTunedModel: string | null;
  langChainTracing: boolean;
  langChainProject: string | null;
};

export type PythonStreamTool = {
  name: string;
  description?: string;
  functionName: string;
  functionDescription: string;
  waitingMessage: string;
  vectorDbFile: string | null;
};

export type PythonStreamResponse = Partial<{
  created: number;
  id: string;
  model: string;
  object: string;
  python: string;
  system_fingerprint: string | null;
  threadId: string;
  version: string;
}> & {
  chunks: LlmChunkItem[];
};

/**
 * Executes the Python service returning a stream response.
 *
 * @param request - The request to be sent to the Python service.
 * @param callback - Optional callback function to handle the stream response.
 * @returns The payload handler function.
 */
export const pythonStreamHandler = (request: PythonStreamRequest, callback?: (response: PythonStreamResponse) => void): PayloadHandler => {
  return async (req: PayloadRequest, res, next) => {
    try {
      const { test } = req.body;

      res.setHeader('Content-Type', 'application/octet-stream; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      const isWin = process.platform === 'win32';

      const cwd = process.cwd();
      const lib = 'lib';
      const venv = 'venv';
      const libFolder = path.join(cwd, lib);
      const venvFolder = path.join(cwd, venv);

      const virtualEnv = isWin ?
        path.join(venvFolder, 'Scripts', 'python') :
        path.join(venvFolder, 'bin', 'python3');

      // console.log('PythonService', virtualEnv, cwd);
      // console.log('PythonService', request);

      const p = spawn(virtualEnv, [
        '-u',
        test ? 'mock/test.py' : 'main.py',
        JSON.stringify(request),
      ], {
        cwd: libFolder,
      });

      p.stdout.setEncoding('utf8');

      const chunks: string[] = [];

      p.stdout.on('data', function (data) {
        const chunk = data.toString();
        chunks.push(chunk);
        res.write(chunk);
      });

      p.stderr.on('data', (data) => {
        const message = data.toString();
        console.error('PythonService.stderr', message);
      });

      p.on('close', function (data) {
        if (typeof callback === 'function') {
          const response: PythonStreamResponse = chunksToResponse(chunks);
          callback(response);
        }
        res.end();
      });

    } catch (error) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'gzip');
      res.status(500).send(error);
    }
  };
};

/**
 * Converts an array of chunks into a PythonStreamResponse object.
 *
 * @param chunks - The array of chunks to convert.
 * @returns The PythonStreamResponse object.
 */
export function chunksToResponse(chunks: string[]): PythonStreamResponse {
  const items: LlmChunk[] = [];
  const getChunkType = (decodedChunk?: LlmChunk): string | undefined => {
    const chunk = decodedChunk || (items.length ? items[items.length - 1] : null);
    if (chunk) {
      return typeof chunk === 'string' ? 'string' : chunk.type;
    }
    return undefined;
  };
  chunks.forEach((chunk: string) => {
    try {
      const replacedText = chunk.replace(/(,$)/g, '');
      const decodedChunks: LlmChunk[] = JSON.parse(`[${replacedText}]`);
      decodedChunks.forEach(decodedChunk => {
        const lastChunkType = getChunkType();
        const chunkType = getChunkType(decodedChunk);
        if (lastChunkType === 'string' && chunkType === 'string') {
          items[items.length - 1] = items[items.length - 1] + (decodedChunk as string);
        } else {
          items.push(decodedChunk);
        }
      });
    } catch (error) {
      console.log(error);
    }
  });
  return decodedChunksToResponse(items);
}

export function decodedChunksToResponse(decodedChunks: LlmChunk[]): PythonStreamResponse {
  const chunks: LlmChunkItem[] = [];
  let response: PythonStreamResponse = {
    chunks,
  };
  decodedChunks.forEach(x => {
    if (isObject(x)) {
      switch (x.type) {
        case 'info':
        case 'end': {
          const { type, ...rest } = x;
          response = { ...response, ...rest };
        }
          break;
        case 'log':
          console.log('chunk.log', x);
          break;
        default:
          chunks.push(x);
      }
    } else if (typeof x === 'string') {
      const lastMessage = chunks[chunks.length - 1];
      if (lastMessage && lastMessage.type === 'string') {
        lastMessage.content += x;
      } else {
        chunks.push({
          type: 'string',
          content: x,
        });
      }
    }
  });
  return response;
}
