import { webpackBundler } from '@payloadcms/bundler-webpack';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { cloudStorage } from '@payloadcms/plugin-cloud-storage';
import { azureBlobStorageAdapter } from '@payloadcms/plugin-cloud-storage/azure';
import { CollectionOptions } from '@payloadcms/plugin-cloud-storage/dist/types';
import seo from '@payloadcms/plugin-seo';
import { slateEditor } from '@payloadcms/richtext-slate';
import bomEnv from '@websolutespa/bom-env';
import bowl, { BowlCollection, BowlGlobal, Icon, Logo } from '@websolutespa/payload-plugin-bowl';
import llm, { fineTuningJobsHandler, knowledgeBaseHandler, toolsKnowledgeBaseHandler } from '@websolutespa/payload-plugin-bowl-llm';
import '@websolutespa/payload-plugin-bowl-llm/dist/index.css';
import '@websolutespa/payload-plugin-bowl/dist/index.css';
import { fsStorageAdapter } from '@websolutespa/payload-plugin-cloud-storage-fs';
import { clearLogs, cronJob } from '@websolutespa/payload-plugin-cron-job';
import { localization } from '@websolutespa/payload-plugin-localization';
import '@websolutespa/payload-plugin-localization/dist/index.css';
import * as path from 'path';
import { Payload } from 'payload';
import { buildConfig } from 'payload/config';
import { CollectionConfig, GlobalConfig } from 'payload/types';
import { Homepage } from './collections/HomePage';
import { Users } from './collections/Users';
import { defaultLocale, defaultMarket, group, locales, pages, roles, slug, translations } from './config';

const USE_AZURE_ADAPTER = true;

export default bomEnv().then(() => {

  const cors = process.env.PAYLOAD_PUBLIC_CORS_URLS || '*';
  const csrf = process.env.PAYLOAD_PUBLIC_CSRF_URLS ? process.env.PAYLOAD_PUBLIC_CSRF_URLS.split(',') : [];
  const serverURL = process.env.PAYLOAD_PUBLIC_SERVER_URL || '';
  const basePath = process.env.PAYLOAD_PUBLIC_BASE_PATH || '';
  const mongoDbUri = process.env.MONGODB_URI || '';

  const collections: BowlCollection[] = [
    // pages
    Homepage,

    // users
    Users,
  ];

  const globals: BowlGlobal[] = [
  ];

  return buildConfig({
    serverURL,
    cors: cors === '*' ? cors : cors.split(','),
    csrf,
    telemetry: false,
    rateLimit: {
      window: 90000, // Time in milliseconds to track requests per IP. Defaults to 90000 (15 minutes).
      max: 100000, // Number of requests served from a single IP before limiting. Defaults to 500.
      skip: () => true, // Express middleware function that can return true (or promise resulting in true) that will bypass limit.
      trustProxy: true, // True or false, to enable to allow requests to pass through a proxy such as a load balancer or an nginx reverse proxy.
    },
    admin: {
      user: Users.slug,
      meta: {
        titleSuffix: '- Bowl',
        favicon: `${basePath}/assets/bowl-favicon.svg`,
        ogImage: `${basePath}/assets/bowl-logo.svg`,
      },
      components: {
        graphics: {
          Logo,
          Icon,
        },
      },
      css: path.resolve(__dirname, './styles.scss'),
      bundler: webpackBundler(),
      webpack: (config) => {
        if (config.resolve?.fallback) {
          config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false, stream: false,
          };
        }
        return config;
      },
    },
    editor: slateEditor({}),
    db: mongooseAdapter({
      url: mongoDbUri,
      // see issue https://github.com/payloadcms/payload/issues/4350
      transactionOptions: false,
    }),
    localization: {
      locales: [...locales],
      defaultLocale,
      fallback: true,
    },
    i18n: {
      resources: translations,
      fallbackLng: defaultLocale,
      debug: false,
    },
    collections: collections as CollectionConfig[],
    globals: globals as GlobalConfig[],
    express: {
      preMiddleware: [(req, res, next) => {
        // console.log('preMiddleware.request', req.url);
        next();
      }],
    },
    plugins: [
      bowl({
        defaultMarket,
        group: group,
        roles: roles,
        rolesUser: [roles.Admin, roles.Editor],
        rolesEndUser: [roles.User],
        plugins: [
          llm(),
        ],
      }),
      cloudStorage({
        collections: {
          [slug.media]: {
            adapter: USE_AZURE_ADAPTER ?
              azureBlobStorageAdapter({
                connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
                containerName: process.env.AZURE_STORAGE_CONTAINER_NAME,
                allowContainerCreate: process.env.AZURE_STORAGE_ALLOW_CONTAINER_CREATE === 'true',
                baseURL: process.env.AZURE_STORAGE_ACCOUNT_BASEURL,
              }) :
              fsStorageAdapter({
                baseDir: process.env.FS_STORAGE_BASEDIR,
                baseURL: process.env.FS_STORAGE_BASEURL,
              }),
            disablePayloadAccessControl: process.env.FS_STORAGE_DISABLE_PAYLOAD_ACCESS_CONTROL == 'true' ? true : undefined,
            generateFileURL: process.env.FS_STORAGE_ENABLE_GENERATE_FILE_URL == 'true' ? ({ filename }) => `${process.env.FS_STORAGE_BASEURL}/${filename}` : undefined,
          },
        } as Record<string, CollectionOptions>,
      }),
      seo({
        collections: pages,
        globals: [],
        uploadsCollection: slug.media,
        tabbedUI: false,
      }),
      localization(),
      cronJob({
        jobs: {
          alwaysOn: {
            execute: (payload: Payload) => {
              console.log('ScheduledTask.alwaysOn every 5 minutes');
            },
            cron: '*/5 * * * *',
          },
          clearLogs: {
            execute: async (payload: Payload) => {
              console.log('ScheduledTask.clearLogs every sunday at 01:00');
              return await clearLogs(payload);
            },
            cron: '0 1 * * 0',
          },
          llm: {
            execute: async (payload: Payload) => {
              console.log('ScheduledTask.llm every day at 01:00');
              return await knowledgeBaseHandler(payload);
            },
            cron: '0 1 * * *',
          },
          llmKnowledgeBase: {
            execute: async (payload: Payload) => {
              console.log('ScheduledTask.toolsKnowledgeBaseHandler every day at 02:00');
              return await toolsKnowledgeBaseHandler(payload);
            },
            cron: '0 2 * * *',
          },
          llmFineTuning: {
            execute: async (payload: Payload) => {
              console.log('ScheduledTask.llmFineTuning every day at 03:00');
              return await fineTuningJobsHandler(payload);
            },
            cron: '0 3 * * *',
          },
          /*
          todo: enable this rule when the python script that generates the rules vectordb is implemented
          llmRules: {
            execute: async (payload: Payload) => {
              console.log('ScheduledTask.llmRules every day at 04:00');
              return await rulesHandler(payload);
            },
            cron: '0 4 * * *',
          },
          */
        },
      }),
    ],
    typescript: {
      outputFile: path.resolve(__dirname, 'payload-types.ts'),
    },
    graphQL: {
      schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
    },
    routes: {
      api: `${basePath}/api`,
      admin: `${basePath}/admin`,
      graphQL: `${basePath}/graphql`,
      graphQLPlayground: `${basePath}/graphql-playground`,
    },
    // indexSortableFields: true
  });

});
