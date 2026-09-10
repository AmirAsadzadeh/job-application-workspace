import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  ...timestamps,
}, (table) => [index("session_user_idx").on(table.userId)]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  ...timestamps,
}, (table) => [index("account_user_idx").on(table.userId)]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
}, (table) => [index("verification_identifier_idx").on(table.identifier)]);

export const oauthClient = pgTable("oauth_client", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().unique(),
  clientSecret: text("client_secret"),
  clientDiscoveryId: text("client_discovery_id"),
  disabled: boolean("disabled").default(false),
  skipConsent: boolean("skip_consent"),
  enableEndSession: boolean("enable_end_session"),
  subjectType: text("subject_type"),
  scopes: text("scopes").array(),
  clientCredentialsScopes: text("client_credentials_scopes").array().default([]),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  name: text("name"),
  uri: text("uri"),
  icon: text("icon"),
  contacts: text("contacts").array(),
  tos: text("tos"),
  policy: text("policy"),
  softwareId: text("software_id"),
  softwareVersion: text("software_version"),
  softwareStatement: text("software_statement"),
  redirectUris: text("redirect_uris").array().notNull(),
  postLogoutRedirectUris: text("post_logout_redirect_uris").array(),
  backchannelLogoutUri: text("backchannel_logout_uri"),
  backchannelLogoutSessionRequired: boolean("backchannel_logout_session_required"),
  tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
  applicationType: text("application_type"),
  jwks: text("jwks"),
  jwksUri: text("jwks_uri"),
  grantTypes: text("grant_types").array(),
  responseTypes: text("response_types").array(),
  requirePKCE: boolean("require_pkce"),
  dpopBoundAccessTokens: boolean("dpop_bound_access_tokens").default(false),
  referenceId: text("reference_id"),
  metadata: jsonb("metadata"),
  ...timestamps,
}, (table) => [index("oauth_client_user_idx").on(table.userId)]);

export const oauthResource = pgTable("oauth_resource", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull().unique(),
  name: text("name").notNull(),
  accessTokenTtl: integer("access_token_ttl"),
  refreshTokenTtl: integer("refresh_token_ttl"),
  signingAlgorithm: text("signing_algorithm"),
  signingKeyId: text("signing_key_id"),
  allowedScopes: text("allowed_scopes").array(),
  customClaims: jsonb("custom_claims"),
  dpopBoundAccessTokensRequired: boolean("dpop_bound_access_tokens_required").default(false),
  disabled: boolean("disabled").default(false),
  policyVersion: integer("policy_version").default(1),
  metadata: jsonb("metadata"),
  ...timestamps,
});

export const oauthClientResource = pgTable("oauth_client_resource", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => oauthClient.clientId, { onDelete: "cascade" }),
  resourceId: text("resource_id").notNull().references(() => oauthResource.identifier, { onDelete: "cascade" }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [unique("oauth_client_resource_uidx").on(table.clientId, table.resourceId)]);

export const oauthRefreshToken = pgTable("oauth_refresh_token", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  clientId: text("client_id").notNull().references(() => oauthClient.clientId),
  sessionId: text("session_id").references(() => session.id, { onDelete: "set null" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  referenceId: text("reference_id"),
  authorizationCodeId: text("authorization_code_id"),
  resources: text("resources").array(),
  requestedUserInfoClaims: text("requested_user_info_claims").array(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revoked: timestamp("revoked", { withTimezone: true }),
  rotatedAt: timestamp("rotated_at", { withTimezone: true }),
  rotationReplayResponse: text("rotation_replay_response"),
  rotationReplayExpiresAt: timestamp("rotation_replay_expires_at", { withTimezone: true }),
  authTime: timestamp("auth_time", { withTimezone: true }),
  confirmation: jsonb("confirmation"),
  scopes: text("scopes").array().notNull(),
}, (table) => [index("oauth_refresh_user_idx").on(table.userId), index("oauth_refresh_session_idx").on(table.sessionId)]);

export const oauthAccessToken = pgTable("oauth_access_token", {
  id: text("id").primaryKey(),
  token: text("token").unique(),
  clientId: text("client_id").notNull().references(() => oauthClient.clientId),
  sessionId: text("session_id").references(() => session.id, { onDelete: "set null" }),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  referenceId: text("reference_id"),
  authorizationCodeId: text("authorization_code_id"),
  resources: text("resources").array(),
  requestedUserInfoClaims: text("requested_user_info_claims").array(),
  refreshId: text("refresh_id").references(() => oauthRefreshToken.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revoked: timestamp("revoked", { withTimezone: true }),
  confirmation: jsonb("confirmation"),
  scopes: text("scopes").array().notNull(),
}, (table) => [index("oauth_access_user_idx").on(table.userId), index("oauth_access_session_idx").on(table.sessionId)]);

export const oauthConsent = pgTable("oauth_consent", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => oauthClient.clientId),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  referenceId: text("reference_id"),
  resources: text("resources").array(),
  requestedUserInfoClaims: text("requested_user_info_claims").array(),
  scopes: text("scopes").array().notNull(),
  ...timestamps,
}, (table) => [index("oauth_consent_user_idx").on(table.userId)]);

export const oauthClientAssertion = pgTable("oauth_client_assertion", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const generationState = pgEnum("generation_state", ["staging", "active", "backup", "failed", "expired"]);
export const generationSource = pgEnum("generation_source", ["initial", "normal", "offline_upload", "online_backup", "restore"]);
export const listMode = pgEnum("list_mode", ["manual", "column"]);
export const sortColumn = pgEnum("sort_column", ["company", "title", "status", "workMode", "seniority", "updatedAt"]);
export const sortDirection = pgEnum("sort_direction", ["asc", "desc"]);
export const positionStatus = pgEnum("position_status", ["saved", "applied", "screening", "interviewing", "assignment", "paused", "offer", "rejected", "withdrawn"]);
export const workMode = pgEnum("work_mode", ["remote", "hybrid", "onsite"]);
export const employmentType = pgEnum("employment_type", ["full_time", "part_time", "contract", "internship"]);
export const applicationStatus = pgEnum("application_status", ["not_applied", "applied", "viewed", "contacted", "closed"]);
export const managedFileKind = pgEnum("managed_file_kind", ["company_logo", "submitted_resume"]);
export const syncDirection = pgEnum("sync_direction", ["offline_to_online", "working_copy_to_online", "online_to_offline", "online_to_working_copy"]);
export const syncStatus = pgEnum("sync_status", ["uploading", "validating", "preview_ready", "confirming", "completed", "cancelled", "failed", "expired"]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  revision: bigint("revision", { mode: "number" }).notNull().default(0),
  activeGenerationId: uuid("active_generation_id"),
  ...timestamps,
}, (table) => [uniqueIndex("workspace_owner_uidx").on(table.ownerId)]);

export const workspaceGenerations = pgTable("workspace_generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  state: generationState("state").notNull(),
  sourceKind: generationSource("source_kind").notNull(),
  sourceRevision: bigint("source_revision", { mode: "number" }),
  packageFormatVersion: integer("package_format_version").notNull(),
  packageChecksum: text("package_checksum"),
  backupObjectKey: text("backup_object_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
}, (table) => [
  index("generation_workspace_idx").on(table.workspaceId),
  uniqueIndex("generation_active_uidx").on(table.workspaceId).where(sql`${table.state} = 'active'`),
]);

export const workspacePreferences = pgTable("workspace_preferences", {
  workspaceId: uuid("workspace_id").primaryKey().references(() => workspaces.id, { onDelete: "cascade" }),
  listMode: listMode("list_mode").notNull().default("manual"),
  sortColumn: sortColumn("sort_column"),
  sortDirection: sortDirection("sort_direction"),
});

export const departments = pgTable("departments", {
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  id: text("id").notNull(),
  name: text("name").notNull(),
  sequence: integer("sequence").notNull(),
}, (table) => [primaryKey({ columns: [table.workspaceId, table.id] }), unique("department_sequence_uidx").on(table.workspaceId, table.sequence)]);

export const teams = pgTable("teams", {
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  departmentId: text("department_id").notNull(),
  id: text("id").notNull(),
  name: text("name").notNull(),
  sequence: integer("sequence").notNull(),
}, (table) => [primaryKey({ columns: [table.workspaceId, table.id] }), index("team_department_idx").on(table.workspaceId, table.departmentId)]);

export const locations = pgTable("locations", {
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  id: text("id").notNull(),
  name: text("name").notNull(),
  sequence: integer("sequence").notNull(),
}, (table) => [primaryKey({ columns: [table.workspaceId, table.id] }), unique("location_sequence_uidx").on(table.workspaceId, table.sequence)]);

export const positions = pgTable("positions", {
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  id: text("id").notNull(),
  sequence: integer("sequence").notNull(),
  companyName: text("company_name").notNull(),
  companyLogoUrl: text("company_logo_url"),
  companyLogoFileId: uuid("company_logo_file_id"),
  title: text("title").notNull(),
  status: positionStatus("status").notNull(),
  workMode: workMode("work_mode").notNull(),
  employmentType: employmentType("employment_type").notNull(),
  seniority: text("seniority").notNull(),
  departmentId: text("department_id"),
  teamId: text("team_id"),
  locationId: text("location_id"),
  hiringManagerName: text("hiring_manager_name").notNull().default(""),
  hiringManagerPhone: text("hiring_manager_phone").notNull().default(""),
  hiringManagerPosition: text("hiring_manager_position").notNull().default(""),
  salaryMin: numeric("salary_min"),
  salaryMax: numeric("salary_max"),
  salaryCurrency: text("salary_currency"),
  careerPageUrl: text("career_page_url"),
  careerApplicationStatus: applicationStatus("career_application_status"),
  careerApplicationDate: date("career_application_date"),
  description: jsonb("description").notNull(),
  revision: bigint("revision", { mode: "number" }).notNull().default(0),
  ...timestamps,
}, (table) => [
  primaryKey({ columns: [table.workspaceId, table.id] }),
  unique("position_sequence_uidx").on(table.workspaceId, table.sequence),
  index("position_status_idx").on(table.workspaceId, table.status),
  index("position_updated_idx").on(table.workspaceId, table.updatedAt),
]);

export const jobPlatformLinks = pgTable("job_platform_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  positionId: text("position_id").notNull(),
  sequence: integer("sequence").notNull(),
  platformName: text("platform_name").notNull(),
  url: text("url").notNull(),
  applicationStatus: applicationStatus("application_status"),
  applicationDate: date("application_date"),
}, (table) => [unique("platform_link_sequence_uidx").on(table.workspaceId, table.positionId, table.sequence)]);

export const positionQuestions = pgTable("position_questions", {
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  positionId: text("position_id").notNull(),
  id: text("id").notNull(),
  sequence: integer("sequence").notNull(),
  title: text("title").notNull(),
  category: text("category"),
  customCategory: text("custom_category"),
  answer: jsonb("answer").notNull(),
  ...timestamps,
}, (table) => [primaryKey({ columns: [table.workspaceId, table.positionId, table.id] }), unique("question_sequence_uidx").on(table.workspaceId, table.positionId, table.sequence)]);

export const readingItems = pgTable("reading_items", {
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  positionId: text("position_id").notNull(),
  id: text("id").notNull(),
  sequence: integer("sequence").notNull(),
  title: text("title").notNull(),
  url: text("url"),
  notes: text("notes").notNull().default(""),
  isRead: boolean("is_read").notNull().default(false),
  ...timestamps,
}, (table) => [primaryKey({ columns: [table.workspaceId, table.positionId, table.id] }), unique("reading_sequence_uidx").on(table.workspaceId, table.positionId, table.sequence)]);

export const managedFiles = pgTable("managed_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  positionId: text("position_id").notNull(),
  kind: managedFileKind("kind").notNull(),
  originalFileName: text("original_file_name").notNull(),
  mediaType: text("media_type").notNull(),
  byteLength: bigint("byte_length", { mode: "number" }).notNull(),
  sha256: text("sha256").notNull(),
  objectKey: text("object_key").notNull().unique(),
  generationId: uuid("generation_id").references(() => workspaceGenerations.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("managed_file_owner_idx").on(table.workspaceId, table.positionId),
  uniqueIndex("submitted_resume_uidx").on(table.workspaceId, table.positionId).where(sql`${table.kind} = 'submitted_resume'`),
]);

export const synchronizationAttempts = pgTable("synchronization_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  direction: syncDirection("direction").notNull(),
  status: syncStatus("status").notNull(),
  sourceRevision: bigint("source_revision", { mode: "number" }),
  expectedDestinationRevision: bigint("expected_destination_revision", { mode: "number" }),
  sourceChecksum: text("source_checksum").notNull(),
  sourceCounts: jsonb("source_counts").notNull(),
  destinationCounts: jsonb("destination_counts").notNull(),
  conflict: boolean("conflict").notNull().default(false),
  stagingGenerationId: uuid("staging_generation_id").references(() => workspaceGenerations.id, { onDelete: "set null" }),
  backupGenerationId: uuid("backup_generation_id").references(() => workspaceGenerations.id, { onDelete: "set null" }),
  errorCode: text("error_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  index("sync_workspace_idx").on(table.workspaceId, table.createdAt),
  unique("sync_retry_uidx").on(table.workspaceId, table.direction, table.sourceChecksum),
]);

export const schema = {
  user,
  session,
  account,
  verification,
  oauthClient,
  oauthResource,
  oauthClientResource,
  oauthRefreshToken,
  oauthAccessToken,
  oauthConsent,
  oauthClientAssertion,
  workspaces,
  workspaceGenerations,
  workspacePreferences,
  departments,
  teams,
  locations,
  positions,
  jobPlatformLinks,
  positionQuestions,
  readingItems,
  managedFiles,
  synchronizationAttempts,
};
