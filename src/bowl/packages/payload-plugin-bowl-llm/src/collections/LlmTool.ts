import { BowlCollection } from '@websolutespa/payload-plugin-bowl';
import { options } from '../options';

export const LlmTool: BowlCollection = {
  type: 'withCollection',
  slug: options.slug.llmTool,
  admin: {
    group: options.group.llm,
    useAsTitle: 'name',
    defaultColumns: ['name', 'description'],
  },
  fields: [
    {
      name: 'name',
      type: 'withText',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'functionName',
      type: 'withText',
      required: true,
    },
    {
      name: 'functionDescription',
      type: 'textarea',
      required: true,
    },
    {
      name: 'waitingMessage',
      type: 'withText',
      localized: true,
    },
    {
      name: 'secrets',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'secretId',
              type: 'withText',
            },
            {
              name: 'secretValue',
              type: 'withText',
            },
          ],
        },
      ],
    },
  ],
};

