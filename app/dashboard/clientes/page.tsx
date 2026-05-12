"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi, Business } from "@/lib/api";

const PAGE_SIZE = 20;

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-zinc-100 text-zinc-700",
  pro: "bg-indigo-50 text-indigo-700",
  max: "bg-violet-50 text-violet-700",
};

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

export default function ClientesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminApi.businesses
      .list(page, activeSearch || undefined)
      .then(({ data }) => {
        setBusinesses(data.items);
        setTotal(data.total);
      })
      .catch(() => setError("No se pudieron cargar los clientes."))
      .finally(() => setLoading(false));
  }, [page, activeSearch]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Clientes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total > 0 ? `${total.toLocaleString("es-CL")} tenants registrados` : "Tenants registrados"}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <SearchIcon />
          </span>
          <input
            type="search"
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead>
            <tr className="bg-zinc-50">
              {["Nombre", "Email", "Plan", "Estado", "Conv. mes", "Registro"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {[140, 180, 70, 70, 60, 90].map((w, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div
                        className="h-4 rounded bg-zinc-100 animate-pulse"
                        style={{ width: w }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : businesses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <p className="text-sm text-zinc-400">
                    {activeSearch ? `Sin resultados para "${activeSearch}"` : "No hay clientes registrados."}
                  </p>
                </td>
              </tr>
            ) : (
              businesses.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => router.push(`/dashboard/clientes/${b.id}`)}
                  className="cursor-pointer hover:bg-zinc-50 transition-colors"
                >
                  <td className="px-4 py-3.5 text-sm font-medium text-zinc-900">
                    {b.name}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-zinc-500">{b.email}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        PLAN_COLORS[b.plan] ?? "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {b.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        b.is_active ? "text-emerald-600" : "text-zinc-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          b.is_active ? "bg-emerald-500" : "bg-zinc-300"
                        }`}
                      />
                      {b.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-zinc-600">
                    {(b.conversations_this_month ?? 0).toLocaleString("es-CL")}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-zinc-400">
                    {b.created_at
                      ? new Date(b.created_at).toLocaleDateString("es-CL")
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
