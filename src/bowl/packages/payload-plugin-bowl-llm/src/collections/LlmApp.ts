import { BowlCollection } from '@websolutespa/payload-plugin-bowl';
import { Access } from 'payload/config';
import { Card } from '../blocks/Card';
import { Tool } from '../blocks/Tool';
import FineTune from '../components/FineTune/FineTune';
import { options } from '../options';


const isAdmin: Access = ({ req: { user } }) => {
  // allow authenticated users
  if (user) {
    // todo: user role check?
    return true;
  }

  return false;
};

export enum LlmAppMode {
  Site = 'site',
  Chat = 'chat',
}

export const LlmApp: BowlCollection = {
  type: 'withCollection',
  slug: options.slug.llmApp,
  admin: {
    group: options.group.llm,
    useAsTitle: 'name',
    defaultColumns: ['name', 'appKey', 'isActive'],
  },
  access: {
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'withText',
      required: true,
    },
    {
      type: 'withIsActive',
    },
    {
      name: 'mode',
      type: 'select',
      options: Object.entries(LlmAppMode).map(([k, v]) => ({
        value: v,
        label: k,
      })),
    },
    {
      type: 'tabs',
      tabs: [

        ///////////////////////
        // TAB App Settings
        {
          name: 'settings',
          label: 'Settings',
          fields: [
            {
              name: 'credentials',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'appKey',
                      type: 'withText',
                      required: true,
                      unique: true,
                      admin: {
                        width: '50%',
                      },
                    },
                    {
                      name: 'apiKey',
                      type: 'withText',
                      required: true,
                      unique: true,
                      admin: {
                        width: '50%',
                      },
                    },
                  ],
                },
                {
                  name: 'httpReferrers',
                  type: 'array',
                  fields: [
                    {
                      name: 'referrer',
                      type: 'withText',
                    },
                  ],
                },
              ],
            },
            {
              name: 'llmConfig',
              type: 'group',
              fields: [
                {
                  name: 'secrets',
                  type: 'group',
                  fields: [
                    {
                      name: 'openAIApiKey',
                      type: 'withText',
                    },
                    {
                      name: 'langChainApiKey',
                      type: 'withText',
                    },
                  ],
                },
                {
                  name: 'prompt',
                  type: 'group',
                  fields: [
                    {
                      name: 'systemMessage',
                      type: 'textarea',
                      localized: true,
                    },
                  ],
                },
                {
                  name: 'tools',
                  type: 'relationship',
                  relationTo: options.slug.llmTool,
                  hasMany: true,
                },
                {
                  name: 'langChainTracing',
                  type: 'withCheckbox',
                },
                {
                  name: 'langChainProject',
                  type: 'withText',
                },
              ],
            },
            {
              name: 'appTools',
              label: 'App Tools',
              type: 'blocks',
              blocks: [Tool],
              admin: {
                initCollapsed: true,
              },
            },
            {
              name: 'fineTuning',
              type: 'group',
              fields: [
                {
                  name: 'modelNameSuffix',
                  type: 'withText',
                },
                {
                  name: 'currentJobId',
                  type: 'withText',
                  admin: {
                    readOnly: true,
                  },
                },
                {
                  name: 'fineTunedModelName',
                  type: 'withText',
                  admin: {
                    readOnly: true,
                  },
                },
                {
                  name: 'fineTuningActions',
                  type: 'ui',
                  admin: {
                    components: {
                      Field: FineTune,
                    },
                  },
                },
              ],
            },
            {
              name: 'rules',
              type: 'group',
              fields: [
                {
                  name: 'vectorDbFile',
                  type: 'withMedia',
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
        },

        ///////////////////////
        // TAB contents
        {
          name: 'contents',
          label: 'Contents',
          fields: [
            {
              name: 'logo',
              type: 'withMedia',
            },
            {
              name: 'collapsedWelcomeText',
              type: 'textarea',
              localized: true,
            },
            {
              name: 'collapsedWelcomeTextHover',
              type: 'textarea',
              localized: true,
            },
            {
              name: 'shortWelcomeText',
              type: 'textarea',
              localized: true,
            },
            {
              name: 'extendedWelcomeText',
              type: 'textarea',
              localized: true,
            },
            {
              name: 'sampleInputTexts',
              type: 'array',
              fields: [
                {
                  name: 'sampleInputText',
                  type: 'text',
                  localized: true,
                },
              ],
            },
            {
              name: 'layoutBuilder',
              label: 'Blocks',
              type: 'blocks',
              blocks: [Card],
              admin: {
                initCollapsed: true,
              },
            },
          ],
        },

        ///////////////////////
        // TAB hooks
        {
          label: 'Hooks',
          fields: [
            {
              name: 'webhooks',
              type: 'array',
              fields: [
                {
                  name: 'webhook',
                  type: 'withText',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

