import { BowlCollection } from '@websolutespa/payload-plugin-bowl';
import { group, slug } from '../config';

export const Users: BowlCollection = {
  type: 'withCollection',
  slug: slug.users,
  auth: {
    useAPIKey: true, // Payload Authentication provides for API keys to be set on each user within the Authentication-enabled Collection.
    lockTime: 10 * 60 * 1000, // (10min) Time period to allow the max login attempts
    maxLoginAttempts: 5, // Automatically lock a user out after X amount of failed logins
    tokenExpiration: 2 * 60 * 60, // (2hrs) How many seconds to keep the user logged in
    verify: false, // Require email verification before being allowed to authenticate
    // More options are available
  },
  admin: {
    useAsTitle: 'email',
    group: group.admin,
  },
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
};
