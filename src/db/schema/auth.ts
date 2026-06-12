import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { UserRole } from '../enums';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // App internal unique ID (e.g., nanoid)
  firebaseUid: text('firebase_uid').notNull(), // Firebase Auth UID
  phoneNumber: text('phone_number').notNull(), // E.164 phone format
  whatsappNumber: text('whatsapp_number'), // Optional WhatsApp contact
  email: text('email'), // Optional email address
  name: text('name'), // Optional client name
  image: text('image'), // Optional profile image url
  role: text('role').$type<UserRole>().notNull().default('customer'),
  phoneVerified: integer('phone_verified', { mode: 'boolean' }).notNull().default(false),
  marketingConsent: integer('marketing_consent', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  uniqueIndex('users_firebase_uid_idx').on(table.firebaseUid),
  uniqueIndex('users_phone_number_idx').on(table.phoneNumber)
]);

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(), // Hashed refresh token value
  deviceInfo: text('device_info'), // Device browser/metadata details
  ipAddress: text('ip_address'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }), // Revocation timestamp for explicit logouts
  replacedByTokenId: text('replaced_by_token_id') // Supports rotation security tracing
}, (table) => [
  index('refresh_tokens_user_id_expires_at_idx').on(table.userId, table.expiresAt)
]);

export const tokenBlacklist = sqliteTable('token_blacklist', {
  id: text('id').primaryKey(),
  jti: text('jti').notNull(), // Revoked Access Token unique identifier (JWT JTI claim)
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(), // Revocation TTL (must match access token expiry)
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  uniqueIndex('token_blacklist_jti_idx').on(table.jti)
]);

export const userDevices = sqliteTable('user_devices', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deviceName: text('device_name').notNull(),
  browser: text('browser').notNull(),
  ipAddress: text('ip_address'),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const userAddresses = sqliteTable('user_addresses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['billing', 'shipping'] }).notNull().default('shipping'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  addressLine1: text('address_line1').notNull(),
  addressLine2: text('address_line2'),
  city: text('city').notNull(),
  state: text('state').notNull(),
  postalCode: text('postal_code').notNull(),
  country: text('country').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const userAuditLogs = sqliteTable('user_audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  changes: text('changes'), // Stores stringified JSON of differences
  ipAddress: text('ip_address'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});
