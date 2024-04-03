import { useConfig, useLocale } from 'payload/components/utilities';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PythonStreamResponse } from '../../api/python/pythonStream.handler';
import { LlmAppCredentials, LlmMessage } from '../../api/types';
import { LlmChunk } from './LlmChunk';
import { MessageService } from './message.service';

export type LlmChatCompletionProps = Omit<LlmAppCredentials, 'httpReferrers'> & {
  completion?: LlmMessage[];
  test?: boolean;
  threadId?: string;
  onEnd?: (response: PythonStreamResponse) => void;
  onError?: (error: any) => void;
};

export const LlmChatCompletion: React.FC<LlmChatCompletionProps> = ({
  apiKey,
  appKey,
  completion,
  test = false,
  threadId,
  onEnd,
  onError,
}: LlmChatCompletionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { routes } = useConfig();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<PythonStreamResponse>();

  const locale = useLocale();

  const messageService = useMemo(() => {
    const origin = window.location.origin; // serverURL;
    const url = `${origin}${routes.api}/llm/message?locale=${locale}`;
    return new MessageService({
      url,
    });
  }, [locale, routes.api]);

  useEffect(() => {
    const fetchData = async (messages: LlmMessage[], test: boolean = false) => {
      try {
        setLoading(true);
        const sendMessagePayload = {
          apiKey,
          appKey,
          messages,
          test,
          threadId,
        };
        await messageService.sendMessage(sendMessagePayload,
          (response: PythonStreamResponse) => {
            const meaningChunks = response.chunks.filter(x =>
              typeof x === 'string'
              || !['info', 'log', 'end'].includes(x.type)
            );
            // console.log('meaningChunks', meaningChunks);
            if (meaningChunks.length > 0) {
              setResponse(response);
              if (ref.current) {
                ref.current.scrollIntoView();
              }
            }
          },
          (response: PythonStreamResponse) => {
            // console.log('LlmChatCompletion.response', response);
            setLoading(false);
            if (typeof onEnd === 'function') {
              onEnd(response);
            }
          });
      } catch (error: any) {
        console.log(`LlmChatCompletion.onSubmit.error ${error.message}.`);
        setLoading(false);
        if (typeof onError === 'function') {
          onError(error);
        }
      }
    };
    if (completion) {
      fetchData(completion, test);
    }
  }, [
    apiKey,
    appKey,
    completion,
    messageService,
    onEnd,
    onError,
    test,
    threadId,
  ]);

  return (
    <div className="llm__chatCompletion">
      {response && (
        <div ref={ref} className="llm__thread assistant">
          <div className="llm__message">
            {response.chunks.map((x, i) => (
              <LlmChunk key={i} item={x} />
            ))}
          </div>
        </div>
      )}
      {loading && (
        <div className="llm__busyIndicator">
          <span></span>
        </div>
      )}
    </div>
  );
};
