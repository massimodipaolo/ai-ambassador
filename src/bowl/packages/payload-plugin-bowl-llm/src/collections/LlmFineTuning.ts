import { BowlCollection } from '@websolutespa/payload-plugin-bowl';
import { options } from '../options';

export const LlmFineTuning: BowlCollection = {
  type: 'withCollection',
  slug: options.slug.llmFineTuning,
  admin: {
    group: options.group.llm,
    defaultColumns: ['llmApp', 'question', 'createdAt'],
  },
  fields: [
    {
      name: 'llmApp',
      type: 'relationship',
      relationTo: options.slug.llmApp,
    },
    {
      name: 'question',
      type: 'withText',
    },
    {
      name: 'answer',
      type: 'withText',
    },
  ],
};

