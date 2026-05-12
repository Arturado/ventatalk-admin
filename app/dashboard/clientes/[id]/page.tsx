"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminApi, Business } from "@/lib/api";

const PLAN_OPTIONS = ["starter", "pro", "max"] as const;
type Plan = (typeof PLAN_OPTIONS)[number];

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-zinc-100 text-zinc-700 border border-zinc-200",
  pro: "bg-indigo-50 text-indigo-700 border border-indigo-100",
  max: "bg-violet-50 text-violet-700 border border-violet-100",
};

const ALL_FEATURES = [
  { key: "ai_suggestions", label: "Sugerencias IA", desc: "Respuestas automáticas con IA" },
  { key: "product_catalog", label: "Catálogo de productos", desc: "Catálogo integrado en el chat" },
  { key: "crm_sync", label: "Sincronización CRM", desc: "Sincroniza contactos con tu CRM" },
  { key: "analytics", label: "Analítica avanzada", desc: "Métricas y reportes detallados" },
  { key: "bulk_broadcast", label: "Mensajes masivos", desc: "Campañas a múltiples contactos" },
  { key: "custom_flows", label: "Flujos personalizados", desc: "Diseña flujos de conversación" },
  { key: "api_access", label: "Acceso API", desc: "Integración directa vía REST API" },
];

const INTEGRATION_LABELS: Record<string, string> = {
  bsale: "Bsale",
  jumpseller: "Jumpseller",
  woocommerce: "WooCommerce",
  shopify: "Shopify",
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  mercadolibre: "MercadoLibre",
  active_catalog_source: "Catálogo activo",
};

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-indigo-600" : "bg-zinc-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Spinner({ size = "sm" }: { size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-6 h-6" : "w-4 h-4";
  return (
    <svg className={`${cls} animate-spin text-zinc-400`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [featuresSaving, setFeaturesSaving] = useState<string | null>(null);
  const [featuresError, setFeaturesError] = useState<string | null>(null);

  const [planSaving, setPlanSaving] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false);

  useEffect(() => {
    adminApi.businesses
      .get(id)
      .then(({ data }) => setBusiness(data))
      .catch(() => setError("No se pudo cargar el cliente."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleToggleFeature(key: string) {
    if (!business) return;
    const current: Record<string, boolean> = (business.features as Record<string, boolean>) ?? {};
    const next: Record<string, boolean> = {
      ...current,
      [key]: !current[key],
    };

    setBusiness({ ...business, features: next });
    setFeaturesSaving(key);
    setFeaturesError(null);

    try {
      await adminApi.businesses.updateFeatures(id, next);
    } catch {
      setBusiness({ ...business, features: current });
      setFeaturesError("Error al actualizar features. Inténtalo de nuevo.");
    } finally {
      setFeaturesSaving(null);
    }
  }

  async function handleChangePlan(newPlan: Plan) {
    if (!business || newPlan === business.plan) {
      setPlanDropdownOpen(false);
      return;
    }
    setPlanDropdownOpen(false);
    setPlanSaving(true);
    setPlanError(null);
    const prevPlan = business.plan;
    setBusiness({ ...business, plan: newPlan });

    try {
      await adminApi.businesses.updatePlan(id, newPlan);
    } catch {
      setBusiness({ ...business, plan: prevPlan });
      setPlanError("Error al cambiar el plan. Inténtalo de nuevo.");
    } finally {
      setPlanSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div>
        <button
          onClick={() => router.push("/dashboard/clientes")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <BackIcon /> Volver a clientes
        </button>
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error ?? "Cliente no encontrado."}</p>
        </div>
      </div>
    );
  }

  const usage = business.usage;
  const integrations = business.integrations ?? [];
  const features: Record<string, boolean> = (business.features as Record<string, boolean>) ?? {};
  const usagePct = usage
    ? Math.min(100, Math.round((usage.conversations_this_month / usage.conversations_limit) * 100))
    : 0;
  const barColor =
    usagePct >= 90
      ? "bg-red-500"
      : usagePct >= 70
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div>
      <button
        onClick={() => router.push("/dashboard/clientes")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <BackIcon /> Volver a clientes
      </button>

      {/* Header */}
      <div className="mb-6 bg-white rounded-xl border border-zinc-200 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{business.name}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">{business.email}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  PLAN_COLORS[business.plan] ?? "bg-zinc-100 text-zinc-700"
                }`}
              >
                {business.plan}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  business.status === "active"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    business.status === "active" ? "bg-emerald-500" : "bg-zinc-400"
                  }`}
                />
                {business.status === "active" ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>

          {/* Plan changer */}
          <div className="relative">
            <button
              onClick={() => setPlanDropdownOpen((o) => !o)}
              disabled={planSaving}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {planSaving ? <Spinner /> : null}
              Cambiar plan
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {planDropdownOpen && (
              <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-zinc-200 bg-white shadow-lg py-1">
                {PLAN_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleChangePlan(p)}
                    className={`flex w-full items-center justify-between px-4 py-2 text-sm capitalize transition-colors ${
                      business.plan === p
                        ? "text-indigo-700 font-medium"
                        : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {p}
                    {business.plan === p && (
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {planError && (
          <p className="mt-3 text-xs text-red-600">{planError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Uso */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Uso del mes</h2>
          {usage ? (
            <>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-semibold text-zinc-900">
                  {usage.conversations_this_month.toLocaleString("es-CL")}
                </span>
                <span className="text-sm text-zinc-400">
                  / {usage.conversations_limit.toLocaleString("es-CL")}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-3">conversaciones este mes</p>
              <div className="h-2 w-full rounded-full bg-zinc-100">
                <div
                  className={`h-2 rounded-full transition-all ${barColor}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              <p
                className={`mt-2 text-xs font-medium ${
                  usagePct >= 90
                    ? "text-red-600"
                    : usagePct >= 70
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}
              >
                {usagePct}% utilizado
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-400">Sin datos de uso disponibles.</p>
          )}
        </div>

        {/* Features */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Features activos</h2>
          {featuresError && (
            <p className="mb-3 text-xs text-red-600">{featuresError}</p>
          )}
          <ul className="space-y-3">
            {ALL_FEATURES.map(({ key, label, desc }) => {
              const enabled = Boolean(features[key]);
              const saving = featuresSaving === key;
              return (
                <li key={key} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{label}</p>
                    <p className="text-xs text-zinc-400 truncate">{desc}</p>
                  </div>
                  {saving ? (
                    <Spinner />
                  ) : (
                    <Toggle
                      checked={enabled}
                      onChange={() => handleToggleFeature(key)}
                      disabled={featuresSaving !== null}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Integrations */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Integraciones</h2>
          {integrations.length === 0 ? (
            <p className="text-sm text-zinc-400">Sin integraciones configuradas.</p>
          ) : (
            <ul className="space-y-3">
              {integrations.map((source) => (
                <li key={source} className="flex items-center gap-2.5 min-w-0">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <p className="text-sm font-medium text-zinc-800">
                    {INTEGRATION_LABELS[source] ?? source}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Close dropdown on outside click */}
      {planDropdownOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setPlanDropdownOpen(false)}
        />
      )}
    </div>
  );
}
