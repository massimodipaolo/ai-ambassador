import { BowlBlock } from '@websolutespa/payload-plugin-bowl';
import { options } from '../options';

export const Tool: BowlBlock = {
  type: 'withBlock',
  slug: options.slug.llmAppTool,
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
    {
      name: 'knowledgeBase',
      type: 'group',
      fields: [
        {
          name: 'files',
          type: 'array',
          fields: [
            {
              type: 'withMedia',
              filterOptions: {
                or: [
                  { mimeType: { contains: 'application/pdf' } },
                  { mimeType: { contains: 'text/plain' } },
                  { mimeType: { contains: 'application/msword' } },
                  { mimeType: { contains: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } },
                  { mimeType: { contains: 'video' } },
                  { mimeType: { contains: 'application/json' } },

                ],
              },
            },
          ],
        },
        {
          name: 'externalEndpoints',
          type: 'array',
          fields: [
            {
              name: 'endpointUrl',
              type: 'withText',
            },
            {
              name: 'fieldsMapping',
              type: 'group',
              fields: [
                {
                  name: 'replacedFields',
                  type: 'array',
                  fields: [
                    {
                      name: 'srcName',
                      type: 'text',
                    },
                    {
                      name: 'destName',
                      type: 'text',
                    },
                  ],
                },
                {
                  name: 'newFields',
                  type: 'array',
                  fields: [
                    {
                      name: 'name',
                      type: 'text',
                    },
                    {
                      name: 'value',
                      type: 'text',
                    },
                  ],
                },
                {
                  name: 'deletedFields',
                  type: 'array',
                  fields: [
                    {
                      name: 'name',
                      type: 'text',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'vectorDbFile',
          type: 'withMedia',
        },
      ],
    },
  ],
};
