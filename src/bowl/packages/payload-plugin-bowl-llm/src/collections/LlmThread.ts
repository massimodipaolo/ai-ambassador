import { BowlCollection } from '@websolutespa/payload-plugin-bowl';
import { options } from '../options';

export const LlmThread: BowlCollection = {
  type: 'withCollection',
  slug: options.slug.llmThread,
  admin: {
    group: options.group.llm,
    defaultColumns: ['id', 'createdAt', 'llmApp'],
  },
  fields: [
    {
      type: 'withId',
    },
    {
      name: 'llmApp',
      type: 'relationship',
      relationTo: options.slug.llmApp,
    },
    {
      name: 'message',
      type: 'array',
      fields: [
        {
          name: 'role',
          type: 'withText',
          required: true,
        },
        {
          name: 'content',
          type: 'textarea',
        },
      ],
    },
  ],
};

