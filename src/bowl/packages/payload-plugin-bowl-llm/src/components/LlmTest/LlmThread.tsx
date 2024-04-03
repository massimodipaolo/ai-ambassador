import { getClassNames } from '@websolutespa/bom-core';
import React from 'react';
import { LlmDecodedMessage } from '../../api/types';
import { LlmChunk } from './LlmChunk';

export type LlmThreadProps = {
  messages: LlmDecodedMessage[]
};

export const LlmThread: React.FC<LlmThreadProps> = ({
  messages,
}: LlmThreadProps) => {
  return (
    <>
      {messages.map((message, i) => (
        <div key={i} className={getClassNames('llm__thread', message.role)}>
          <div className="llm__message">
            {message.chunks.map((x, i) => (
              <LlmChunk key={i} item={x} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
};
