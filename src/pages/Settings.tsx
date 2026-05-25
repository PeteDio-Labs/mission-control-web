/**
 * Settings page — `/settings`.
 *
 * Surfaces the four config slices that previously lived as raw rows in
 * `notification_settings` / `discord_identities`:
 *
 *   1. Notification routing matrix      — routing.by_severity
 *   2. Discord button policy            — discord.buttons_enabled,
 *                                          discord.button_timeout_seconds,
 *                                          discord.quiet_hours
 *   3. Discord identity links           — discord_identities table
 *   4. Per-action authz                 — actions.<action_kind>
 *
 * Each section is its own Card so non-admin viewers (read-only) still get
 * a coherent view; mutation endpoints 403 for them.
 *
 * Note: no Select primitive in src/components/ui yet — sections fall back
 * to a styled native <select>. If a future shadcn Select lands, replace
 * `SelectInline` in-place.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Cog,
  KeyRound,
  Link as LinkIcon,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import {
  useSetting,
  useSettings,
  updateSetting,
  pickByKey,
} from '@/lib/hooks/useSettings';
import {
  useDiscordIdentities,
  linkIdentity,
  revokeIdentity,
} from '@/lib/hooks/useDiscordIdentities';
import {
  ACTION_KINDS,
  type ActionAuthzConfig,
  type ActionKind,
  type DiscordIdentityRow,
  type LinkedVia,
  type NotificationSink,
  type QuietHoursConfig,
  type RoutingBySeverity,
  type Severity,
} from '@/types/settings';

// ─── Visual tokens (same severity palette as Plans.tsx) ──────────────

const severityStyles: Record<Severity, string> = {
  info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  warn: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  error: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const SEVERITIES: Severity[] = ['info', 'warn', 'error', 'critical'];
const SINKS: NotificationSink[] = ['mc_bell', 'discord'];

// ─── Toast — mirrors PlanDetail.tsx ──────────────────────────────────

interface Toast {
  id: number;
  tone: 'success' | 'error' | 'warn';
  message: string;
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'px-4 py-2.5 rounded-lg shadow-2xl text-sm border backdrop-blur-xl animate-in slide-in-from-bottom-2',
            t.tone === 'success' && 'bg-green-500/15 border-green-500/30 text-green-200',
            t.tone === 'error' && 'bg-red-500/15 border-red-500/30 text-red-200',
            t.tone === 'warn' && 'bg-yellow-500/15 border-yellow-500/30 text-yellow-200',
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  function push(tone: Toast['tone'], message: string) {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  return { toasts, push };
}

// ─── Native <select> styled to match Input ───────────────────────────

function SelectInline<T extends string>({
  value,
  onChange,
  options,
  disabled,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(
        'flex h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary/50 focus-visible:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-slate-900 text-white">
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Section 1: Notification routing matrix ──────────────────────────

const DEFAULT_ROUTING: RoutingBySeverity = {
  info: ['mc_bell'],
  warn: ['mc_bell'],
  error: ['mc_bell', 'discord'],
  critical: ['mc_bell', 'discord'],
};

function RoutingMatrixCard({ onSaved, onError }: { onSaved: () => void; onError: (m: string) => void }) {
  const { value, isLoading } = useSetting<RoutingBySeverity>('routing.by_severity');
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<RoutingBySeverity | null>(null);

  // Local state syncs from server on first load; afterward we let the user
  // drive `pending` and rely on PATCH-then-revalidate to round-trip.
  useEffect(() => {
    if (value && !pending) setPending(value);
  }, [value, pending]);

  const current: RoutingBySeverity = pending ?? value ?? DEFAULT_ROUTING;

  async function toggle(sev: Severity, sink: NotificationSink) {
    const sinks = new Set(current[sev] ?? []);
    if (sinks.has(sink)) sinks.delete(sink);
    else sinks.add(sink);
    const next: RoutingBySeverity = { ...current, [sev]: Array.from(sinks) };
    setPending(next);

    setSaving(true);
    try {
      await updateSetting('routing.by_severity', next);
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save routing');
      // roll back the optimistic checkbox flip
      setPending(current);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-400" />
            Notification routing
          </CardTitle>
          <p className="text-xs text-gray-500 mt-1">
            Which sinks receive each severity. Both can be checked.
          </p>
        </div>
        {saving && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && !pending ? (
          <p className="text-sm text-gray-500">Loading routing…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Severity</TableHead>
                {SINKS.map((s) => (
                  <TableHead key={s} className="text-center">
                    {s === 'mc_bell' ? 'MC bell' : 'Discord'}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {SEVERITIES.map((sev) => (
                <TableRow key={sev}>
                  <TableCell>
                    <Badge className={cn('text-[10px] px-1.5 py-0', severityStyles[sev])}>
                      {sev}
                    </Badge>
                  </TableCell>
                  {SINKS.map((sink) => {
                    const checked = current[sev]?.includes(sink) ?? false;
                    return (
                      <TableCell key={sink} className="text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={saving}
                          onChange={() => toggle(sev, sink)}
                          className="h-4 w-4 rounded border-white/20 bg-white/[0.05] accent-primary cursor-pointer"
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section 2: Discord button policy ────────────────────────────────

const DEFAULT_QUIET_HOURS: QuietHoursConfig = {
  start_local: '22:00',
  end_local: '07:00',
  timezone: 'America/Los_Angeles',
  action: 'route_to_mc_bell',
};

const TIMEZONE_OPTIONS = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
];

function DiscordPolicyCard({ onSaved, onError }: { onSaved: () => void; onError: (m: string) => void }) {
  const buttonsEnabled = useSetting<boolean>('discord.buttons_enabled');
  const timeoutSeconds = useSetting<number>('discord.button_timeout_seconds');
  const quietHours = useSetting<QuietHoursConfig>('discord.quiet_hours');

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [timeoutDraft, setTimeoutDraft] = useState<string>('');
  const [quietDraft, setQuietDraft] = useState<QuietHoursConfig | null>(null);

  // sync local drafts when server-side state arrives. Depend on the raw
  // values (primitives + tz string) rather than full objects so we don't
  // clobber the user's draft mid-edit.
  const serverTimeout = timeoutSeconds.value;
  useEffect(() => {
    if (serverTimeout !== null && timeoutDraft === '') {
      setTimeoutDraft(String(serverTimeout ?? 86400));
    }
  }, [serverTimeout, timeoutDraft]);

  const serverQuiet = quietHours.value;
  useEffect(() => {
    if (serverQuiet && !quietDraft) setQuietDraft(serverQuiet);
  }, [serverQuiet, quietDraft]);

  const activeQuiet: QuietHoursConfig = quietDraft ?? quietHours.value ?? DEFAULT_QUIET_HOURS;

  async function save<T>(key: string, value: T) {
    setSavingKey(key);
    try {
      await updateSetting(key, value);
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : `Failed to save ${key}`);
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-indigo-400" />
          Discord button policy
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">
          Globally enable/disable the Discord action buttons and tune their TTL + quiet hours.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* buttons_enabled */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-200">Buttons enabled</p>
            <p className="text-xs text-gray-500 mt-0.5">
              When off, Pete Bot still posts plan notifications but without clickable actions.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!buttonsEnabled.value}
              disabled={savingKey === 'discord.buttons_enabled'}
              onChange={(e) => save('discord.buttons_enabled', e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/[0.05] accent-primary cursor-pointer"
            />
            <span className="text-sm text-gray-400">
              {buttonsEnabled.value ? 'On' : 'Off'}
            </span>
          </label>
        </div>

        {/* button_timeout_seconds */}
        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className="text-xs uppercase tracking-wider text-gray-500">
              Button timeout (seconds)
            </label>
            <Input
              type="number"
              min={60}
              step={60}
              value={timeoutDraft}
              onChange={(e) => setTimeoutDraft(e.target.value)}
              className="mt-1.5"
            />
            <p className="text-[11px] text-gray-600 mt-1">
              Default 86400 = 24h. Plans expire automatically once this elapses.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={
              savingKey === 'discord.button_timeout_seconds' ||
              !timeoutDraft ||
              !/^\d+$/.test(timeoutDraft) ||
              Number(timeoutDraft) < 60
            }
            onClick={() => save('discord.button_timeout_seconds', Number(timeoutDraft))}
          >
            {savingKey === 'discord.button_timeout_seconds' && (
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
            )}
            Save
          </Button>
        </div>

        {/* quiet_hours */}
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-1.5">Quiet hours</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-[11px] text-gray-500">Start (local)</label>
              <Input
                type="time"
                value={activeQuiet.start_local}
                onChange={(e) =>
                  setQuietDraft({ ...activeQuiet, start_local: e.target.value })
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500">End (local)</label>
              <Input
                type="time"
                value={activeQuiet.end_local}
                onChange={(e) =>
                  setQuietDraft({ ...activeQuiet, end_local: e.target.value })
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500">Timezone</label>
              <SelectInline
                value={activeQuiet.timezone}
                onChange={(v) => setQuietDraft({ ...activeQuiet, timezone: v })}
                options={TIMEZONE_OPTIONS.map((tz) => ({ value: tz, label: tz }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500">Action</label>
              <SelectInline<QuietHoursConfig['action']>
                value={activeQuiet.action}
                onChange={(v) => setQuietDraft({ ...activeQuiet, action: v })}
                options={[
                  { value: 'route_to_mc_bell', label: 'Route to MC bell' },
                  { value: 'suppress', label: 'Suppress' },
                  { value: 'allow', label: 'Allow' },
                ]}
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <Button
              size="sm"
              variant="outline"
              disabled={savingKey === 'discord.quiet_hours'}
              onClick={() => save('discord.quiet_hours', activeQuiet)}
            >
              {savingKey === 'discord.quiet_hours' && (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              )}
              Save quiet hours
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Section 3: Discord identity links ───────────────────────────────

function DiscordIdentitiesCard({
  onSaved,
  onError,
}: {
  onSaved: (m: string) => void;
  onError: (m: string) => void;
}) {
  const { identities, isLoading } = useDiscordIdentities();
  const [discordId, setDiscordId] = useState('');
  const [mcUser, setMcUser] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [linkedVia, setLinkedVia] = useState<LinkedVia>('manual');
  const [busy, setBusy] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function submit() {
    if (!/^[0-9]{10,30}$/.test(discordId)) {
      onError('Discord ID must be 10–30 digits.');
      return;
    }
    if (!mcUser.trim()) {
      onError('MC user id required.');
      return;
    }
    setBusy(true);
    try {
      await linkIdentity({
        discord_user_id: discordId.trim(),
        mc_user_id: mcUser.trim(),
        display_name: displayName.trim() || undefined,
        linked_via: linkedVia,
      });
      onSaved(`Linked ${discordId} → ${mcUser}`);
      setDiscordId('');
      setMcUser('');
      setDisplayName('');
      setLinkedVia('manual');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to link identity');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(row: DiscordIdentityRow) {
    if (!window.confirm(`Revoke link for ${row.display_name ?? row.discord_user_id}?`)) return;
    setRevokingId(row.discord_user_id);
    try {
      await revokeIdentity(row.discord_user_id);
      onSaved(`Revoked ${row.discord_user_id}`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Revoke failed');
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-cyan-400" />
          Discord identity links
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">
          Pre-vetted Discord ↔ MC user mappings. Only{' '}
          <code className="text-[11px] text-cyan-300">linked_via=manual</code> rows are trusted by
          the v2 authz check.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading identities…</p>
        ) : identities.length === 0 ? (
          <p className="text-sm text-gray-500">No identities linked yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Discord ID</TableHead>
                <TableHead>MC user</TableHead>
                <TableHead>Display name</TableHead>
                <TableHead>Linked via</TableHead>
                <TableHead>Linked at</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {identities.map((row) => (
                <TableRow key={row.discord_user_id}>
                  <TableCell className="font-mono text-xs text-gray-300">
                    {row.discord_user_id}
                  </TableCell>
                  <TableCell className="text-sm text-gray-200">{row.mc_user_id}</TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {row.display_name ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        row.linked_via === 'manual'
                          ? 'border-green-500/30 text-green-300'
                          : 'border-yellow-500/30 text-yellow-300',
                      )}
                    >
                      {row.linked_via}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {format(new Date(row.linked_at), 'MMM d yyyy, HH:mm')}
                    <div className="text-[10px] text-gray-600">
                      {formatDistanceToNow(new Date(row.linked_at), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={revokingId === row.discord_user_id}
                      onClick={() => revoke(row)}
                    >
                      {revokingId === row.discord_user_id ? (
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3 mr-1.5" />
                      )}
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Link new identity form */}
        <div className="border-t border-white/[0.06] pt-4">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Link new identity</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              placeholder="Discord user id (digits)"
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]{10,30}"
            />
            <Input
              placeholder="MC user id"
              value={mcUser}
              onChange={(e) => setMcUser(e.target.value)}
            />
            <Input
              placeholder="Display name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <SelectInline<LinkedVia>
              value={linkedVia}
              onChange={setLinkedVia}
              options={[
                { value: 'manual', label: 'manual (trusted)' },
                { value: 'authentik_oauth', label: 'authentik_oauth (v3, blocked)' },
              ]}
            />
          </div>
          <div className="flex justify-end mt-3">
            <Button size="sm" disabled={busy} onClick={submit}>
              {busy && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
              Link identity
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Section 4: Per-action authz ─────────────────────────────────────

const DEFAULT_AUTHZ: ActionAuthzConfig = {
  required_group: 'mc-admins',
  discord_allowed: true,
};

function ActionAuthzCard({
  onSaved,
  onError,
}: {
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const { settings, isLoading } = useSettings('actions.');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<ActionKind, ActionAuthzConfig | null>>({
    proposed_fix: null,
    alert: null,
    gated_action: null,
    eval_regression: null,
    capacity_warning: null,
  });

  // Memoise the current effective value per kind. Don't include `drafts`
  // in deps explicitly — we want updates to reflect both server data and
  // user edits, so re-derive on every render.
  const effective = useMemo(() => {
    const out: Record<ActionKind, ActionAuthzConfig> = {} as Record<ActionKind, ActionAuthzConfig>;
    for (const kind of ACTION_KINDS) {
      const draft = drafts[kind];
      if (draft) {
        out[kind] = draft;
        continue;
      }
      const fromServer = pickByKey<ActionAuthzConfig>(settings, `actions.${kind}`);
      out[kind] = fromServer ?? DEFAULT_AUTHZ;
    }
    return out;
  }, [settings, drafts]);

  function patchDraft(kind: ActionKind, patch: Partial<ActionAuthzConfig>) {
    setDrafts((prev) => ({
      ...prev,
      [kind]: { ...effective[kind], ...patch },
    }));
  }

  async function save(kind: ActionKind) {
    const key = `actions.${kind}`;
    setSavingKey(key);
    try {
      await updateSetting(key, effective[kind]);
      setDrafts((prev) => ({ ...prev, [kind]: null }));
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : `Failed to save ${key}`);
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-green-400" />
          Per-action authz
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">
          Which Authentik group is required to act on each plan kind, and whether the Discord
          surface is permitted at all.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading && settings.length === 0 ? (
          <p className="text-sm text-gray-500">Loading authz rows…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Action kind</TableHead>
                <TableHead>Required group</TableHead>
                <TableHead className="text-center">Discord allowed</TableHead>
                <TableHead className="text-right">Save</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ACTION_KINDS.map((kind) => {
                const row = effective[kind];
                const dirty = drafts[kind] !== null;
                const key = `actions.${kind}`;
                return (
                  <TableRow key={kind}>
                    <TableCell>
                      <span className="text-xs uppercase tracking-wider text-gray-400">
                        {kind.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.required_group}
                        onChange={(e) => patchDraft(kind, { required_group: e.target.value })}
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={row.discord_allowed}
                        onChange={(e) => patchDraft(kind, { discord_allowed: e.target.checked })}
                        className="h-4 w-4 rounded border-white/20 bg-white/[0.05] accent-primary cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={dirty ? 'default' : 'outline'}
                        disabled={!dirty || savingKey === key}
                        onClick={() => save(kind)}
                      >
                        {savingKey === key && (
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        )}
                        {dirty ? 'Save' : 'Saved'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { toasts, push } = useToasts();

  function onSaved(message?: string) {
    push('success', message ?? 'Saved');
  }
  function onError(message: string) {
    push('error', message);
  }
  function onSavedWithMsg(message: string) {
    push('success', message);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cog className="h-5 w-5 text-gray-400" />
            Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Notification routing, Discord identity, and per-action authz. Admin only — non-admins
            see the values but PATCH responses return 403.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <KeyRound className="h-3.5 w-3.5" />
          notification_settings · discord_identities
        </div>
      </div>

      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-200 flex items-start gap-2">
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        Changes here are live — they bypass GitOps. The backend caches reads for 30 s; expect a
        ~30 s lag before other surfaces reflect a change.
      </div>

      <RoutingMatrixCard onSaved={onSaved} onError={onError} />
      <DiscordPolicyCard onSaved={onSaved} onError={onError} />
      <DiscordIdentitiesCard onSaved={onSavedWithMsg} onError={onError} />
      <ActionAuthzCard onSaved={onSaved} onError={onError} />

      <ToastStack toasts={toasts} />
    </div>
  );
}
