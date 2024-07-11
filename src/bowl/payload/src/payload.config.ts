import { webpackBundler } from '@payloadcms/bundler-webpack';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { cloudStorage } from '@payloadcms/plugin-cloud-storage';
import { azureBlobStorageAdapter } from '@payloadcms/plugin-cloud-storage/azure';
import seo from '@payloadcms/plugin-seo';
import { slateEditor } from '@payloadcms/richtext-slate';
import bomEnv from '@websolutespa/bom-env';
import bowl, { BowlCollection, BowlGlobal, Icon, Logo, isRole } from '@websolutespa/payload-plugin-bowl';
import llm, { fineTuningJobsHandler, knowledgeBaseHandler, rulesHandler, toolsKnowledgeBaseHandler } from '@websolutespa/payload-plugin-bowl-llm';
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
import { Configuration } from 'webpack';
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
    email: {
      transportOptions: {
        host: process.env.PAYLOAD_SMTP_HOST || '',
        auth: {
          user: process.env.PAYLOAD_SMTP_USER || '',
          pass: process.env.PAYLOAD_SMTP_PASS || '',
        },
        port: Number(process.env.PAYLOAD_SMTP_PORT || ''),
        secure: Number(process.env.PAYLOAD_SMTP_PORT || '') === 465, // true for port 465, false (the default) for 587 and others
        requireTLS: true,
      },
      fromName: 'pesaro2024', // !!! todo override from app settings in send mail
      fromAddress: 'noreply@pesaro2024.it', // !!! todo override from app settings in send mail
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
      webpack: (config: Configuration) => {
        const newConfig: Configuration = {
          ...config,
          resolve: {
            ...(config.resolve || {}),
            fallback: Array.isArray(config.resolve.fallback) ? [
              ...(config.resolve.fallback || []),
              { alias: false, name: 'fs' },
              { alias: false, name: 'stream' },
            ] : {
              ...(config.resolve.fallback || {}),
              fs: false,
              stream: false,
            },
          },
        };
        return newConfig;
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
    plugins: [
      bowl({
        defaultMarket,
        group: group,
        roles: roles,
        rolesUser: [roles.Admin, roles.Contributor, roles.Editor, roles.Translator, roles.Guest],
        rolesEndUser: [roles.User, roles.Press],
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
          [slug.llmKbFile]: {
            adapter: USE_AZURE_ADAPTER ?
              azureBlobStorageAdapter({
                connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
                containerName: process.env.AZURE_STORAGE_LLM_KBFILE_CONTAINER_NAME,
                allowContainerCreate: process.env.AZURE_STORAGE_ALLOW_CONTAINER_CREATE === 'true',
                baseURL: process.env.AZURE_STORAGE_ACCOUNT_BASEURL,
              }) :
              fsStorageAdapter({
                baseDir: process.env.FS_STORAGE_LLM_KBFILE_BASEDIR,
                baseURL: process.env.FS_STORAGE_LLM_KBFILE_BASEURL,
              }),
            disablePayloadAccessControl: process.env.FS_STORAGE_DISABLE_PAYLOAD_ACCESS_CONTROL == 'true' ? true : undefined,
            generateFileURL: process.env.FS_STORAGE_ENABLE_GENERATE_FILE_URL == 'true' ? ({ filename }) => `${process.env.FS_STORAGE_LLM_KBFILE_BASEURL}/${filename}` : undefined,
          },
        },
      }),
      seo({
        collections: pages,
        globals: [],
        uploadsCollection: slug.media,
        tabbedUI: false,
      }),
      localization(),
      cronJob({
        access: {
          create: isRole(roles.Admin),
          read: isRole(roles.Admin),
          update: isRole(roles.Admin),
          delete: isRole(roles.Admin),
        },
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
          llmRules: {
            execute: async (payload: Payload) => {
              console.log('ScheduledTask.llmRules every day at 04:00');
              return await rulesHandler(payload);
            },
            cron: '0 4 * * *',
          },
        },
      }),
    ],
    express: {
      preMiddleware: [(req, res, next) => {
        // console.log('preMiddleware.request', req.url);
        next();
      }],
    },
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
