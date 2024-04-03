import { BowlBlock } from '@websolutespa/payload-plugin-bowl';

export const Card: BowlBlock = {
  type: 'withBlock',
  slug: 'card',
  fields: [
    {
      name: 'icon',
      type: 'withMedia',
    },
    {
      name: 'title',
      type: 'text',
      localized: true,
    },
    {
      name: 'body',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'message',
      type: 'textarea',
      localized: true,
    },
  ],
};
