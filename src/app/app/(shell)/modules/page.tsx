"use client";

import { useCallback, useEffect, useState } from "react";

import { useAppData } from "@/components/app/app-data";
import { Button, Card, TextField } from "@/components/app/ui";
import { MODULES, type ModuleDef, splitSecrets } from "@/lib/app/modules";
import { createClient } from "@/lib/supabase/client";

/**
 * Modules — the customer's own on/off switches.
 *
 * Enabling writes a row to app_integrations; disabling flips `active` rather
 * than deleting, so settings survive a change of mind and nothing re-imports
 * from scratch when it's switched back on.
 */

type Row = {
  id: string;
  type: string;
  active: boolean;
  hustle_id: string | null;
  config: Record<string, string>;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
};

export default function ModulesPage() {
  const { userId, hustles } = useAppData();
  const [rows, setRows] = useState<Row[]>([]);
  const [openType, setOpenType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("app_integrations")
      .select("id,type,active,hustle_id,config,status,last_sync_at,last_error")
      .eq("user_id", userId);
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rowFor = (type: string) => rows.find((r) => r.type === type);

  async function toggle(def: ModuleDef, on: boolean) {
    const existing = rowFor(def.type);

    // Turning on for the first time needs settings, so open the form instead.
    if (on && !existing) {
      setOpenType(def.type);
      return;
    }
    if (!existing) return;

    setRows((prev) => prev.map((r) => (r.id === existing.id ? { ...r, active: on } : r)));

    const supabase = createClient();
    await supabase
      .from("app_integrations")
      .update({ active: on, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("user_id", userId);
  }

  const grouped = {
    shop: MODULES.filter((m) => m.category === "shop"),
    payments: MODULES.filter((m) => m.category === "payments"),
    export: MODULES.filter((m) => m.category === "export"),
    people: MODULES.filter((m) => m.category === "people"),
  };

  return (
    <div className="px-5 pt-8">
      <header>
        <h1 className="text-[30px] font-extrabold tracking-[-0.5px]">Modules</h1>
        <p className="mt-2 text-base text-[var(--bb-ink-600)]">
          Switch on only what you need. Everything here is off until you turn it on.
        </p>
      </header>

      {loading ? (
        <p className="mt-8 text-sm text-[var(--bb-ink-400)]">Loading …</p>
      ) : (
        <div className="mt-7 flex flex-col gap-7">
          <Group title="Your shop" defs={grouped.shop} />
          <Group title="Payments" defs={grouped.payments} />
          <Group title="Exports" defs={grouped.export} />
          <Group title="People" defs={grouped.people} />
        </div>
      )}
    </div>
  );

  function Group({ title, defs }: { title: string; defs: ModuleDef[] }) {
    if (!defs.length) return null;
    return (
      <section>
        <h2 className="text-lg font-extrabold">{title}</h2>
        <div className="mt-3 flex flex-col gap-3">
          {defs.map((def) => {
            const row = rowFor(def.type);
            const on = !!row?.active;
            const editing = openType === def.type;

            return (
              <Card key={def.type}>
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-extrabold">{def.name}</h3>
                      {def.status === "soon" && (
                        <span className="rounded-full bg-[var(--bb-subtle)] px-2 py-0.5 text-[10px] font-extrabold tracking-[0.4px] text-[var(--bb-ink-600)]">
                          COMING SOON
                        </span>
                      )}
                      {def.tier === "pro" && (
                        <span className="rounded-full bg-[var(--bb-purple-tint)] px-2 py-0.5 text-[10px] font-extrabold tracking-[0.4px] text-[var(--bb-purple-ink)]">
                          PRO
                        </span>
                      )}
                      <span className="rounded-full bg-[var(--bb-brand-tint)] px-2 py-0.5 text-[10px] font-extrabold tracking-[0.4px] text-[var(--bb-brand-ink)]">
                        {def.direction === "in" ? "IMPORTS" : "EXPORTS"}
                      </span>
                    </div>

                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--bb-ink-600)]">
                      {def.blurb}
                    </p>

                    {def.notes?.map((n) => (
                      <p key={n} className="mt-1.5 text-[13px] text-[var(--bb-ink-400)]">
                        · {n}
                      </p>
                    ))}

                    {row && on && (
                      <p className="mt-2 text-[13px] font-semibold text-[var(--bb-ink-600)]">
                        {row.last_error ? (
                          <span className="text-[var(--bb-err-ink)]">
                            Last run failed — {row.last_error}
                          </span>
                        ) : row.last_sync_at ? (
                          `Last import ${new Date(row.last_sync_at).toLocaleString()}`
                        ) : (
                          "Connected — waiting for the first import"
                        )}
                      </p>
                    )}
                  </div>

                  <Switch
                    on={on}
                    disabled={def.status === "soon"}
                    label={def.name}
                    onChange={(next) => toggle(def, next)}
                  />
                </div>

                {editing && (
                  <ModuleForm
                    def={def}
                    userId={userId}
                    hustles={hustles.map((h) => ({ id: h.id, name: h.name }))}
                    onDone={async () => {
                      setOpenType(null);
                      await load();
                    }}
                    onCancel={() => setOpenType(null)}
                  />
                )}

                {!editing && row && (
                  <button
                    type="button"
                    onClick={() => setOpenType(def.type)}
                    className="mt-3 text-sm font-bold text-[var(--bb-brand)] hover:underline"
                  >
                    Settings
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      </section>
    );
  }
}

function Switch({
  on,
  disabled,
  label,
  onChange,
}: {
  on: boolean;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`Enable ${label}`}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
        on ? "bg-[var(--bb-brand)]" : "bg-[var(--bb-track)]"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
          on ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function ModuleForm({
  def,
  userId,
  hustles,
  onDone,
  onCancel,
}: {
  def: ModuleDef;
  userId: string;
  hustles: { id: string; name: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [hustleId, setHustleId] = useState(hustles[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const missing = def.fields.some((f) => f.required && !values[f.key]?.trim());

  async function save() {
    setSaving(true);
    setError("");
    const { config, secrets } = splitSecrets(def, values);

    try {
      const res = await fetch("/api/app/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: def.type,
          hustle_id: hustleId || null,
          config,
          secrets,
          active: true,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 border-t border-[var(--bb-divider)] pt-4">
      <div className="flex flex-col gap-4">
        {hustles.length > 1 && def.direction === "in" && (
          <div>
            <p className="mb-2 text-[13px] font-bold">Book entries under</p>
            <div className="flex flex-wrap gap-2">
              {hustles.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setHustleId(h.id)}
                  aria-pressed={hustleId === h.id}
                  className={`rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-bold transition-colors ${
                    hustleId === h.id
                      ? "border-[var(--bb-brand)] bg-[var(--bb-selected-tint)] text-[var(--bb-brand-ink)]"
                      : "border-[var(--bb-border)] text-[var(--bb-ink-600)]"
                  }`}
                >
                  {h.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {def.fields.map((f) => (
          <TextField
            key={f.key}
            label={f.label}
            placeholder={f.placeholder}
            hint={f.hint}
            type={f.secret ? "password" : "text"}
            autoComplete="off"
            value={values[f.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
          />
        ))}

        {def.fields.some((f) => f.secret) && (
          <p className="text-[13px] text-[var(--bb-ink-400)]">
            Keys are stored server-side and never sent back to your browser.
          </p>
        )}

        {error && (
          <p className="rounded-2xl bg-[var(--bb-error-tint)] px-4 py-3 text-sm font-semibold text-[var(--bb-err-ink)]">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button size="sm" disabled={missing || saving} onClick={save}>
            {saving ? "Connecting …" : "Connect"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
