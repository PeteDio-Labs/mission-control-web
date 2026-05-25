/**
 * Settings types — mirrors the wire shape returned by /api/v1/settings and
 * /api/v1/discord-identities (PB.12 surfaces backed by PB.5 / PB.4 tables).
 *
 * The setting_value column is JSONB; we use generics + a small union of
 * known shapes so callers can typecast a row without going through `any`.
 */

// ─── Generic notification_settings row ──────────────────────────────

export interface NotificationSettingRow<T = unknown> {
  setting_key: string;
  setting_value: T;
  description: string | null;
  updated_at: string;
}

// ─── Severity / sink primitives ─────────────────────────────────────

export type Severity = 'info' | 'warn' | 'error' | 'critical';
export type NotificationSink = 'mc_bell' | 'discord';

// ─── Known setting shapes ────────────────────────────────────────────

/** routing.by_severity — per-severity list of sinks the router should fan out to. */
export interface RoutingBySeverity {
  info: NotificationSink[];
  warn: NotificationSink[];
  error: NotificationSink[];
  critical: NotificationSink[];
}

/** discord.quiet_hours — local-clock window + action when an event lands inside it. */
export interface QuietHoursConfig {
  start_local: string; // 'HH:MM'
  end_local: string; // 'HH:MM'
  timezone: string; // IANA tz, e.g. 'America/Los_Angeles'
  action: 'route_to_mc_bell' | 'suppress' | 'allow';
}

/** actions.<action_kind> — per-action authz row (PB.4 backing). */
export interface ActionAuthzConfig {
  required_group: string;
  discord_allowed: boolean;
}

/** action_kind values mirrored from backend (Plans.PlanKind). */
export const ACTION_KINDS = [
  'proposed_fix',
  'alert',
  'gated_action',
  'eval_regression',
  'capacity_warning',
] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];

// ─── discord_identities row ──────────────────────────────────────────

export type LinkedVia = 'manual' | 'authentik_oauth';

export interface DiscordIdentityRow {
  discord_user_id: string;
  mc_user_id: string;
  display_name: string | null;
  linked_via: LinkedVia;
  linked_at: string;
  last_used_at: string | null;
  revoked: boolean;
  revoked_at: string | null;
}

export interface LinkDiscordIdentityInput {
  discord_user_id: string;
  mc_user_id: string;
  display_name?: string;
  linked_via?: LinkedVia;
}

// ─── Wire response envelopes ─────────────────────────────────────────

export interface SettingsListResponse {
  settings: NotificationSettingRow[];
}

export interface SettingGetResponse<T = unknown> {
  setting_key: string;
  setting_value: T;
}

export interface DiscordIdentitiesListResponse {
  identities: DiscordIdentityRow[];
}
