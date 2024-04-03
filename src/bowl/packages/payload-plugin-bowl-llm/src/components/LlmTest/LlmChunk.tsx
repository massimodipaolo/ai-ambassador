import React from 'react';
import { LlmChunkItem } from '../../api/types';

export type LlmChunkProps = {
  item: LlmChunkItem;
};

export const LlmChunk: React.FC<LlmChunkProps> = ({
  item,
}: LlmChunkProps) => {
  switch (item.type) {
    case 'string':
      return (
        <p dangerouslySetInnerHTML={{ __html: item.content as string }}></p>
      );
    case 'image':
      return (
        <img src={item.src as string} />
      );
    default:
      return (
        <code>{JSON.stringify(item, null, 2)}</code>
      );
  }
};
