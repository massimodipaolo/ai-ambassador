import { Resource } from 'i18next';

export const locales = ['en', 'it'] as const;

export const defaultLocale = process.env.DEFAULT_LOCALE || 'en';

export const defaultMarket = process.env.DEFAULT_MARKET || 'ww';

export const group = {
  content: 'content',
  nav: 'nav',
  config: 'config',
  i18n: 'i18n',
  admin: 'admin',
};

export const slug = {
  homepage: 'homepage',
  media: 'media',
  users: 'users',
};

export const pages = [
  slug.homepage,
];

export const translations: Resource = {
  en: {
    collection: {
      singular: {
        homepage: 'Homepage',
        users: 'User',
        'description-1': 'Description1',
      },
      plural: {
        homepage: 'Homepages',
        users: 'Users',
        'description-1': 'Description1',
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
        'description-1': 'Descrizione1',
      },
      plural: {
        homepage: 'Homepage',
        users: 'Utenti',
        'description-1': 'Descrizione1',
      },
    },
    field: {
    },
  },
};
