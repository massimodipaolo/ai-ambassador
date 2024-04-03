import { BowlCollection } from '@websolutespa/payload-plugin-bowl';
import { options } from '../options';

export const LlmRule: BowlCollection = {
  type: 'withCollection',
  slug: options.slug.llmRule,
  admin: {
    group: options.group.llm,
    defaultColumns: ['llmApp', 'description'],
  },
  fields: [
    {
      name: 'llmApp',
      type: 'relationship',
      relationTo: options.slug.llmApp,
    },
    {
      name: 'description',
      type: 'withText',
    },
  ],
};

