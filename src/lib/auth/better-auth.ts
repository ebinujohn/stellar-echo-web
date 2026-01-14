import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';

/**
 * Allowed email domain for Google OAuth sign-in
 */
const ALLOWED_DOMAIN = 'higgsbosonhealth.com';

/**
 * Better Auth configuration for Google Workspace OAuth
 *
 * - Restricts sign-in to higgsbosonhealth.com domain only
 * - Google users get isGlobalUser=true (cross-tenant access)
 * - Google users get role='admin' by default
 * - Supports account linking for existing email/password users
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  // Use UUID for all ID fields
  advanced: {
    database: {
      generateId: false, // Let PostgreSQL generate UUIDs with defaultRandom()
    },
  },

  // Base URL for callbacks
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',

  // Secret for signing tokens
  secret: process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET,

  // Email/password handled by existing JWT system
  emailAndPassword: {
    enabled: false,
  },

  // Google OAuth configuration
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Request offline access for refresh tokens
      accessType: 'offline',
      prompt: 'select_account',
    },
  },

  // Enable account linking
  account: {
    accountLinking: {
      enabled: true, // Allow linking Google to existing email accounts
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Custom user fields
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'admin',
        input: false,
      },
      isGlobalUser: {
        type: 'boolean',
        required: true,
        defaultValue: false,
        input: false,
      },
      isActive: {
        type: 'boolean',
        required: true,
        defaultValue: true,
        input: false,
      },
      tenantId: {
        type: 'string',
        required: false,
        input: false,
      },
      googleId: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },

  // Database hooks for domain validation and user setup
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          console.log('[BetterAuth] User create hook - incoming user:', JSON.stringify(user, null, 2));

          // Extract email domain
          const email = user.email;
          const domain = email.split('@')[1]?.toLowerCase();

          // Validate domain for Google OAuth users
          if (domain !== ALLOWED_DOMAIN) {
            console.log('[BetterAuth] Domain validation failed:', domain);
            throw new APIError('FORBIDDEN', {
              message: `Only @${ALLOWED_DOMAIN} email addresses are allowed to sign in with Google`,
            });
          }

          // Capture Google ID if present (from OAuth response)
          // The user.id at this point is the Google sub claim before Better Auth assigns a new ID
          const googleId = user.id;

          // Set Google OAuth users as global admins
          const userData = {
            ...user,
            role: 'admin',
            isGlobalUser: true, // Cross-tenant access
            tenantId: null, // No specific tenant
            emailVerified: true, // Google verifies email
            isActive: true, // Ensure user is active
            googleId: googleId, // Store Google's user ID
          };

          console.log('[BetterAuth] User create hook - modified user:', JSON.stringify(userData, null, 2));

          return {
            data: userData,
          };
        },
        after: async (user) => {
          console.log('[BetterAuth] User created successfully:', user.id, user.email);
        },
      },
    },
  },
});

export type Auth = typeof auth;
