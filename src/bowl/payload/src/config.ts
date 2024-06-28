import { Resource } from 'i18next';

export const locales = ['en', 'it'] as const;

export const defaultLocale = process.env.DEFAULT_LOCALE || 'en';

export const defaultMarket = process.env.DEFAULT_MARKET || 'ww';

export const group = {
  content: 'content',
  nav: 'nav',
  actions: 'actions',
  gdpr: 'gdpr',
  users: 'users',
  config: 'config',
  i18n: 'i18n',
};

export const slug = {
  homepage: 'homepage',
  media: 'media',
  users: 'users',
};

export const pages = [
  slug.homepage,
];

export const roles = {
  Admin: 'admin',
  Contributor: 'contributor',
  Editor: 'editor',
  LlmEditor: 'llm_editor',
  Translator: 'translator',
  Guest: 'guest',
  User: 'user',
  Press: 'press',
} as const;

export const translations: Resource = {
  en: {
    collection: {
      singular: {
        homepage: 'Homepage',
        users: 'User',
        description: 'Description',
      },
      plural: {
        homepage: 'Homepages',
        users: 'Users',
        description: 'Description',
      },
    },
    field: {
    },
  },
  it: {
    collection: {
      singular: {
        homepage: 'Homepage',
        users: 'Utente',
        description: 'Descrizione',
      },
      plural: {
        homepage: 'Homepage',
        users: 'Utenti',
        description: 'Descrizione',
      },
    },
    field: {
    },
  },
};
