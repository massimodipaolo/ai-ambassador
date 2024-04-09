import { BowlCollection } from '@websolutespa/payload-plugin-bowl';
import { Description } from '../blocks/Description';
import { slug } from '../config';

export const Homepage: BowlCollection = {
  type: 'withPage',
  slug: slug.homepage,
  fields: [
    // inherited fields: id, title, slug, category, markets, template, meta, status, createdAt, updatedAt
    { type: 'withAbstract', required: true },
    { type: 'withMedia' },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Layout',
          fields: [
            {
              type: 'withComponents',
              blocks: [Description]
            }
          ],
        },
      ],
    },
  ],
};

