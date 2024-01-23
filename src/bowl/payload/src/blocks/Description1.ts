import { BowlBlock } from '@websolutespa/payload-plugin-bowl';

export const Description1: BowlBlock = {
  type: 'withBlock',
  slug: 'description-1',
  fields: [
    { type: 'withDescription', required: true },
  ],
};
