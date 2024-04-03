import { BowlCollection, BowlConfig, BowlGlobal, BowlPlugin } from '@websolutespa/payload-plugin-bowl';
import { AdminRoute, AdminView, Endpoint } from 'payload/config';
import { fineTuningHandler } from './api/fineTuning.handler';
import { infoHandler } from './api/info.handler';
import { messageHandler } from './api/message.handler';
import { summaryHandler } from './api/summary.handler';
import { LlmApp } from './collections/LlmApp';
import { LlmFineTuning } from './collections/LlmFineTuning';
import { LlmRule } from './collections/LlmRule';
import { LlmThread } from './collections/LlmThread';
import { LlmTool } from './collections/LlmTool';
import AfterNavLinks from './components/AfterNavLinks/AfterNavLinks';
import { LlmTest } from './components/LlmTest/LlmTest';
import { options } from './options';
import { LlmInitOptions } from './types';
import { deepMerge } from './utils';

export type LocalizationOptions = {};

export const llm = (sourceOptions: LlmInitOptions = {}): BowlPlugin => (sourceConfig: BowlConfig): BowlConfig => {

  if (sourceOptions.group) {
    options.group = Object.assign(options.group, sourceOptions.group);
  }
  if (sourceOptions.slug) {
    options.slug = Object.assign(options.slug, sourceOptions.slug);
  }
  if (sourceConfig.i18n && sourceConfig.i18n.resources) {
    options.translations = deepMerge(options.translations, sourceConfig.i18n.resources);
  }

  const collections: BowlCollection[] = [
    LlmApp,
    LlmTool,
    LlmThread,
    LlmFineTuning,
    LlmRule,
  ];

  const globals: BowlGlobal[] = [
  ];

  const routes: AdminRoute[] = [
    {
      Component: LlmTest,
      path: '/llm-test',
    },
  ];

  const views: Record<string, AdminView> = {
  };

  const endpoints: Endpoint[] = [
    {
      path: '/llm/info',
      method: 'post',
      handler: infoHandler,
    },
    {
      path: '/llm/message',
      method: 'post',
      handler: messageHandler,
    },
    {
      path: '/llm/summary',
      method: 'post',
      handler: summaryHandler,
    },
    {
      path: '/llm/fine-tuning',
      method: 'post',
      handler: fineTuningHandler,
    },
  ];

  const targetConfig: BowlConfig = {
    ...sourceConfig,
    admin: {
      ...sourceConfig.admin,
      components: {
        ...sourceConfig.admin?.components,
        routes: [
          // who should win?
          ...(sourceConfig.admin?.components?.routes || []),
          ...routes,
        ],
        afterNavLinks: [
          // who should win?
          ...(sourceConfig.admin?.components?.afterNavLinks || []),
          AfterNavLinks,
        ],
        views: {
          // who should win?
          ...(sourceConfig.admin?.components?.views || {}),
          ...views,
        },
      },
    },
    i18n: {
      ...sourceConfig.i18n,
      resources: {
        ...(sourceConfig.i18n?.resources || {}),
        ...options.translations,
      },
    },
    collections: [
      ...(sourceConfig.collections || []),
      ...collections,
    ],
    globals: [
      ...(sourceConfig.globals || []),
      ...globals,
    ],
    endpoints: [
      // who should win?
      ...(sourceConfig.endpoints || []),
      ...endpoints,
    ],
  };

  console.log('@websolutespa/payload-plugin-bowl-llm');

  return targetConfig;
};
