import { PythonStreamResponse, decodedChunksToResponse } from '../../api/python/pythonStream.handler';
import { LlmAppCredentials, LlmChunk, LlmMessage } from '../../api/types';

export type MessageServiceRequest = Omit<LlmAppCredentials, 'httpReferrers'> & {
  messages: LlmMessage[];
  test?: boolean;
};

export type MessageServiceResponse = {
};

export type MessageServiceOptions = {
  url: string;
};

export class MessageService {

  options: MessageServiceOptions;
  private aborter_: AbortController | undefined;
  private decoder_ = new TextDecoder('utf-8');

  constructor(options: MessageServiceOptions) {
    this.options = options;
  }

  async sendMessage(
    request: MessageServiceRequest,
    onMessage?: (response: PythonStreamResponse) => void,
    onEnd?: (response: PythonStreamResponse) => void
  ) {
    console.log('MessageServiceService.request', request);
    let aborter = this.aborter_;
    if (aborter && !aborter.signal.aborted) {
      // console.log('MessageService.sendMessage.abort');
      aborter.abort();
    }
    // console.log('MessageService.sendMessage', aborter);
    aborter = this.aborter_ = new AbortController();
    const url = this.options.url;
    const decodedChunks: LlmChunk[] = [];
    let bytes = 0;
    const signal = aborter.signal;
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(request),
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });
      if (response.body) {
        const reader = response.body.getReader();
        for await (const chunk of readChunks(reader)) {
          if (!signal.aborted) {
            bytes += chunk.length;
            const chunks = this.decodeChunks(chunk);
            decodedChunks.push(...chunks);
            const response = decodedChunksToResponse(decodedChunks);
            if (typeof onMessage === 'function') {
              onMessage(response);
            }
          }
        }
        if (!signal.aborted) {
          if (typeof onEnd === 'function') {
            const response = decodedChunksToResponse(decodedChunks);
            onEnd(response);
          }
        }
      }
    } catch (error) {
      if (error instanceof TypeError) {
        console.error('TypeError: Browser may not support async iteration', error);
      }
      throw (error);
    }
  }

  decodeChunks(byteArray: Uint8Array): LlmChunk[] {
    let decodedChunks: LlmChunk[] = [];
    let decodedText: string = '';
    try {
      decodedText = this.decoder_.decode(byteArray);
      // const replacedText = decodedText.replace(/(^\[)|(,$)|(\]$)/g, '');
      const replacedText = decodedText.replace(/(,$)/g, '');
      const chunks: LlmChunk[] = JSON.parse(`[${replacedText}]`);
      // console.log('chunks', chunks);
      decodedChunks = chunks.map(chunk => {
        if (typeof chunk === 'string') {
          chunk = chunk.replace(/\r\n/g, '<br>');
        }
        return chunk;
      });
    } catch (error) {
      console.log('decodedChunk.error', error, decodedText);
    }
    // console.log(decodedChunks, decodedText);
    return decodedChunks;
  }

}

// readChunks() reads from the provided reader and yields the results into an async iterable
function readChunks<T>(reader: ReadableStreamDefaultReader<T>) {
  return {
    async*[Symbol.asyncIterator]() {
      let readResult = await reader.read();
      while (!readResult.done) {
        yield readResult.value;
        readResult = await reader.read();
      }
    },
  };
}
/**
 * fixing iterable stream
 */
function readableStreamToIterable(stream: ReadableStream<Uint8Array>): Iterable<Uint8Array> {
  const iterable = (stream as any)[Symbol.asyncIterator] = (Iterator as any).prototype[Symbol.asyncIterator];
  return iterable as Iterable<Uint8Array>;
}

class Iterator {
}

(Iterator as any).prototype[Symbol.asyncIterator] = async function* () {
  const reader = this.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  }
  finally {
    reader.releaseLock();
  }
};

const sendMessage_ = async ({ url, message }: {
  url: string;
  message: string;
}) => {
  try {
    const origin = window.location.origin; // serverURL;
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ message }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        if (!response.body) {
          throw ('error');
        }
        const reader = response.body.getReader();
        return new ReadableStream({
          start(controller) {
            return pump();
            function pump(): any {
              return reader.read().then(({ done, value }) => {
                console.log(value);
                // setChatResult(response + (value ? value.toString() : ''));
                // When no more data needs to be consumed, close the stream
                if (done) {
                  controller.close();
                  return;
                }
                // Enqueue the next data chunk into our target stream
                controller.enqueue(value);
                return pump();
              });
            }
          },
        });
      })
      .then((stream) => new Response(stream))
      .then((response) => response.json())
      .then((json) => {
        console.log('json', json);
      })
      .catch((err) => {
        console.error(err);
      });
    /*
    const httpResponse = await fetch(url, {
      method: 'PATCH',
      body: JSON.stringify(request),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!httpResponse.ok) {
      throw httpResponse;
    }
    const response = await httpResponse.json();
    */
    console.log('MessageServiceService.sendMessage', response);
    return response;

  } catch (error) {
    console.log('MessageServiceService.sendMessage.error', error);
  }
};

/**
 *
 *
fetch('http://localhost:3000/measurements.json')
    .then(async (response) => {
        // response.body is a ReadableStream
        const reader = response.body.getReader();
        for await (const chunk of readChunks(reader)) {
            console.log(`received chunk of size ${chunk.length}`);
        }
    });

// readChunks() reads from the provided reader and yields the results into an async iterable
function readChunks(reader) {
    return {
        async* [Symbol.asyncIterator]() {
            let readResult = await reader.read();
            while (!readResult.done) {
                yield readResult.value;
                readResult = await reader.read();
            }
        },
    };
}
 *
 *
 */
