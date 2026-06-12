"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { DESSERTS, formatCurrency } from "@/lib/desserts";
import type { AdminOrder, AdminOrderItem, SalesSummaryItem } from "@/lib/types";

type AdminResponse = {
  orders: AdminOrder[];
  summary: SalesSummaryItem[];
};

type LoginState = {
  username: string;
  password: string;
};

const initialLogin: LoginState = {
  username: "",
  password: ""
};

const orderStatusOptions = ["recibido", "pagado", "entregado", "cancelado"];
const paymentMethodOptions = ["efectivo", "transferencia"];

function Spinner({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 ${
        dark ? "border-cocoa/20 border-t-cocoa" : "border-white/40 border-t-white"
      }`}
    />
  );
}

function toLocalDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function todayKey() {
  return toLocalDateKey(new Date().toISOString());
}

function formatDate(value?: string | null) {
  if (!value) return "No aplica";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [, month, day] = value.split("-");
    const year = value.slice(0, 4);
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No aplica";

  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildSummary(orders: AdminOrder[]) {
  const summaryByDessert = new Map<number, SalesSummaryItem>();

  for (const order of orders) {
    for (const item of order.order_items || []) {
      const current = summaryByDessert.get(item.dessert_id) || {
        dessert_id: item.dessert_id,
        dessert_name: item.dessert_name,
        total_quantity: 0,
        total_sold: 0
      };

      current.total_quantity += Number(item.quantity);
      current.total_sold += Number(item.subtotal);
      summaryByDessert.set(item.dessert_id, current);
    }
  }

  return Array.from(summaryByDessert.values()).sort((a, b) =>
    b.total_sold - a.total_sold
  );
}

function lastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return toLocalDateKey(date.toISOString());
  });
}

export default function AdminDashboard() {
  const [login, setLogin] = useState<LoginState>(initialLogin);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [summary, setSummary] = useState<SalesSummaryItem[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [savingItemsOrderId, setSavingItemsOrderId] = useState<number | null>(null);
  const [editedItems, setEditedItems] = useState<Record<number, AdminOrderItem[]>>({});

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/orders", {
        cache: "no-store"
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      const data = (await response.json()) as AdminResponse & { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "No se pudieron cargar los pedidos.");
      }

      setOrders(data.orders);
      setSummary(data.summary);
      setIsAuthenticated(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error cargando pedidos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const statuses = useMemo(
    () => Array.from(new Set([...orderStatusOptions, ...orders.map((order) => order.status)])).sort(),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const query = normalize(search.trim());

    return orders.filter((order) => {
      const orderDate = toLocalDateKey(order.created_at);
      const statusMatches = statusFilter === "todos" || order.status === statusFilter;
      const dateMatches = !dateFilter || orderDate === dateFilter;
      const haystack = normalize(
        [
          order.id,
          order.customer_id,
          order.customers?.document_number,
          order.delivery_address,
          order.status,
          order.payment_method,
          order.admin_notes,
          order.customers?.full_name,
          order.customers?.email,
          order.customers?.phone,
          ...(order.order_items || []).map((item) => item.dessert_name)
        ]
          .filter(Boolean)
          .join(" ")
      );

      return statusMatches && dateMatches && (!query || haystack.includes(query));
    });
  }, [dateFilter, orders, search, statusFilter]);

  const visibleSummary = useMemo(() => buildSummary(filteredOrders), [filteredOrders]);

  const totals = useMemo(
    () => ({
      orders: orders.length,
      filteredOrders: filteredOrders.length,
      desserts: summary.reduce((sum, item) => sum + item.total_quantity, 0),
      sold: summary.reduce((sum, item) => sum + Number(item.total_sold), 0)
    }),
    [filteredOrders.length, orders.length, summary]
  );

  const todayStats = useMemo(() => {
    const key = todayKey();
    const todayOrders = orders.filter((order) => toLocalDateKey(order.created_at) === key);
    return {
      orders: todayOrders.length,
      sold: todayOrders.reduce((sum, order) => sum + Number(order.total_amount), 0)
    };
  }, [orders]);

  const topProduct = summary.length > 0
    ? [...summary].sort((a, b) => b.total_quantity - a.total_quantity)[0]
    : null;

  const salesByDay = useMemo(() => {
    const days = lastSevenDays();
    const values = days.map((day) => {
      const sold = orders
        .filter((order) => toLocalDateKey(order.created_at) === day)
        .reduce((sum, order) => sum + Number(order.total_amount), 0);

      return {
        day,
        label: day.slice(5).replace("-", "/"),
        sold
      };
    });
    const max = Math.max(...values.map((item) => item.sold), 1);
    return values.map((item) => ({ ...item, percent: Math.max(6, (item.sold / max) * 100) }));
  }, [orders]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(login)
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Credenciales invalidas.");
      }

      setLogin(initialLogin);
      await loadOrders();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar sesion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAuthenticated(false);
    setOrders([]);
    setSummary([]);
  }

  function updateOrderLocally(orderId: number, changes: Partial<AdminOrder>) {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, ...changes } : order
      )
    );
  }

  async function deleteOrder(orderId: number) {
    if (!window.confirm(`¿Eliminar el pedido #${orderId}? Esta acción no se puede deshacer.`)) return;

    setDeletingOrderId(orderId);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/orders?orderId=${orderId}`, {
        method: "DELETE"
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) throw new Error(data.message || "No se pudo eliminar el pedido.");

      setOrders((current) => current.filter((order) => order.id !== orderId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error eliminando pedido.");
    } finally {
      setDeletingOrderId(null);
    }
  }

  function getOrderItems(order: AdminOrder) {
    return editedItems[order.id] ?? order.order_items;
  }

  function setOrderItems(orderId: number, items: AdminOrderItem[]) {
    setEditedItems((current) => ({ ...current, [orderId]: items }));
  }

  function changeItemQty(order: AdminOrder, dessertId: number, delta: number) {
    const items = getOrderItems(order)
      .map((item) =>
        item.dessert_id === dessertId
          ? { ...item, quantity: item.quantity + delta, subtotal: (item.quantity + delta) * Number(item.unit_price) }
          : item
      )
      .filter((item) => item.quantity > 0);
    setOrderItems(order.id, items);
  }

  function removeItem(order: AdminOrder, dessertId: number) {
    setOrderItems(order.id, getOrderItems(order).filter((item) => item.dessert_id !== dessertId));
  }

  function addItem(order: AdminOrder, dessertId: number) {
    const items = getOrderItems(order);
    if (items.some((item) => item.dessert_id === dessertId)) {
      changeItemQty(order, dessertId, 1);
      return;
    }
    const dessert = DESSERTS.find((entry) => entry.id === dessertId);
    if (!dessert) return;
    setOrderItems(order.id, [
      ...items,
      {
        id: -Date.now(),
        dessert_id: dessert.id,
        dessert_name: dessert.name,
        quantity: 1,
        unit_price: dessert.price,
        subtotal: dessert.price,
        created_at: new Date().toISOString()
      }
    ]);
  }

  function cancelItemsEdit(orderId: number) {
    setEditedItems((current) => {
      const next = { ...current };
      delete next[orderId];
      return next;
    });
  }

  async function saveOrderItems(orderId: number) {
    const items = editedItems[orderId];
    if (!items) return;

    if (items.length === 0) {
      setMessage("El pedido debe tener al menos un postre. Usa Eliminar si quieres borrarlo.");
      return;
    }

    setSavingItemsOrderId(orderId);
    setMessage("");

    try {
      const response = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          items: items.map((item) => ({ dessertId: item.dessert_id, quantity: item.quantity }))
        })
      });
      const data = (await response.json()) as {
        message?: string;
        total_amount?: number;
        order_items?: AdminOrderItem[];
      };

      if (!response.ok) throw new Error(data.message || "No se pudieron guardar los productos.");

      updateOrderLocally(orderId, {
        order_items: data.order_items || items,
        total_amount: data.total_amount ?? 0
      });
      cancelItemsEdit(orderId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error guardando productos.");
    } finally {
      setSavingItemsOrderId(null);
    }
  }

  async function saveOrderChanges(
    orderId: number,
    changes: {
      status: string;
      paymentMethod?: string | null;
      adminNotes?: string | null;
      deliveryAddress?: string | null;
      observations?: string | null;
    }
  ) {
    setSavingOrderId(orderId);
    setMessage("");

    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          orderId,
          status: changes.status,
          paymentMethod: changes.paymentMethod,
          adminNotes: changes.adminNotes,
          deliveryAddress: changes.deliveryAddress,
          observations: changes.observations
        })
      });
      const data = (await response.json()) as {
        message?: string;
        order?: Pick<AdminOrder, "id" | "status" | "payment_method" | "admin_notes" | "delivery_address" | "observations">;
      };

      if (!response.ok) {
        throw new Error(data.message || "No se pudo guardar el pedido.");
      }

      if (data.order) {
        updateOrderLocally(orderId, {
          status: data.order.status,
          payment_method: data.order.payment_method,
          admin_notes: data.order.admin_notes,
          delivery_address: data.order.delivery_address ?? undefined,
          observations: data.order.observations ?? undefined
        });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error guardando cambios del pedido.");
      await loadOrders();
    } finally {
      setSavingOrderId(null);
    }
  }

  function exportOrders() {
    const rows = filteredOrders.flatMap((order) =>
      order.order_items.map((item) => ({
        pedido_id: order.id,
        cliente_id: order.customer_id,
        item_id: item.id,
        postre_id: item.dessert_id,
        fecha_pedido: formatDate(order.created_at),
        cliente: order.customers?.full_name || "",
        cedula: order.customers?.document_number || "",
        correo: order.customers?.email || "",
        telefono: order.customers?.phone || "",
        direccion_entrega: order.delivery_address,
        estado: order.status,
        metodo_pago: order.payment_method || "",
        notas_admin: order.admin_notes || "",
        postre: item.dessert_name,
        cantidad: item.quantity,
        precio_unitario: Number(item.unit_price),
        subtotal: Number(item.subtotal),
        total_pedido: Number(order.total_amount),
        observaciones: order.observations || ""
      }))
    );

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pedidos");
    XLSX.writeFile(workbook, "pedidos-postres-de-locos.xlsx");
  }

  function exportSummary() {
    const rows = visibleSummary.map((item) => ({
      postre_id: item.dessert_id,
      postre: item.dessert_name,
      cantidad_total_pedida: item.total_quantity,
      valor_total_vendido: Number(item.total_sold)
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resumen");
    XLSX.writeFile(workbook, "resumen-ventas-postres-de-locos.xlsx");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-4 text-cocoa">
        <div className="motion-panel flex items-center gap-3 rounded-lg bg-white px-6 py-5 font-black shadow-soft">
          <Spinner dark />
          Cargando panel...
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12 text-cocoa">
        <form onSubmit={handleLogin} className="motion-panel w-full max-w-md rounded-lg border border-caramel/15 bg-white p-6 shadow-soft">
          <p className="text-sm font-black uppercase text-berry">Administrador</p>
          <h1 className="mt-3 text-3xl font-black">Ingresar al panel</h1>
          <p className="mt-3 text-sm leading-6 text-cocoa/65">
            Usa el usuario y la contraseña configurados en las variables de entorno.
          </p>
          <div className="mt-6 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-black">Usuario</span>
              <input
                required
                value={login.username}
                onChange={(event) => setLogin((current) => ({ ...current, username: event.target.value }))}
                className="motion-input h-12 w-full rounded-md border border-caramel/20 bg-cream px-4 outline-none ring-caramel/20 transition focus:ring-4"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-black">Contraseña</span>
              <input
                required
                type="password"
                value={login.password}
                onChange={(event) => setLogin((current) => ({ ...current, password: event.target.value }))}
                className="motion-input h-12 w-full rounded-md border border-caramel/20 bg-cream px-4 outline-none ring-caramel/20 transition focus:ring-4"
              />
            </label>
          </div>
          {message ? <p className="mt-4 rounded-md bg-berry/10 px-4 py-3 text-sm font-bold text-berry">{message}</p> : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="motion-button mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-cocoa px-6 py-4 font-black text-white transition hover:bg-berry disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <><Spinner /> Validando...</> : "Entrar"}
          </button>
          <a href="/" className="motion-button mt-5 block text-center text-sm font-bold text-caramel underline-offset-4 hover:underline">
            Volver a la tienda
          </a>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-6 text-cocoa sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="motion-panel flex flex-col gap-4 border-b border-caramel/20 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-berry">Panel administrativo</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Dashboard de ventas</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadOrders}
              className="motion-button rounded-full bg-white px-5 py-3 text-sm font-black text-cocoa shadow-soft transition hover:-translate-y-0.5 hover:bg-honey"
            >
              Actualizar
            </button>
            <button
              type="button"
              onClick={logout}
              className="motion-button rounded-full bg-cocoa px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-berry"
            >
              Salir
            </button>
          </div>
        </header>

        {message ? <p className="mt-5 rounded-md bg-berry/10 px-4 py-3 text-sm font-bold text-berry">{message}</p> : null}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="motion-card rounded-lg bg-white p-5 shadow-soft">
            <p className="text-sm font-bold text-cocoa/60">Ventas totales</p>
            <p className="mt-2 text-2xl font-black sm:text-3xl">{formatCurrency(totals.sold)}</p>
          </div>
          <div className="motion-card rounded-lg bg-white p-5 shadow-soft">
            <p className="text-sm font-bold text-cocoa/60">Total vendido hoy</p>
            <p className="mt-2 text-2xl font-black sm:text-3xl">{formatCurrency(todayStats.sold)}</p>
          </div>
          <div className="motion-card rounded-lg bg-white p-5 shadow-soft">
            <p className="text-sm font-bold text-cocoa/60">Pedidos del día</p>
            <p className="mt-2 text-2xl font-black sm:text-3xl">{todayStats.orders}</p>
          </div>
          <div className="motion-card rounded-lg bg-white p-5 shadow-soft">
            <p className="text-sm font-bold text-cocoa/60">Postres vendidos</p>
            <p className="mt-2 text-2xl font-black sm:text-3xl">{totals.desserts}</p>
          </div>
          <div className="motion-card motion-pulse rounded-lg bg-cocoa p-5 text-white shadow-soft sm:col-span-2 xl:col-span-1">
            <p className="text-sm font-bold text-white/65">Producto más vendido</p>
            <p className="mt-2 text-2xl font-black">{topProduct?.dessert_name || "Sin ventas"}</p>
            <p className="mt-1 text-sm text-white/70">{topProduct ? `${topProduct.total_quantity} unidades` : "Aun no hay datos"}</p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="motion-panel rounded-lg bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black">Ventas últimos 7 días</h2>
                <p className="mt-1 text-sm text-cocoa/60">Gráfica rápida de ingresos registrados.</p>
              </div>
              <p className="text-sm font-black text-berry">{totals.orders} pedidos</p>
            </div>
            <div className="mt-6 flex h-56 items-end gap-3 rounded-lg bg-cream p-4">
              {salesByDay.map((day) => (
                <div key={day.day} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
                  <div className="flex flex-1 items-end">
                    <div
                      className="motion-chart-bar w-full rounded-t-md bg-gradient-to-t from-berry to-honey shadow-sm transition-all"
                      style={{ height: `${day.percent}%` }}
                      title={formatCurrency(day.sold)}
                    />
                  </div>
                  <span className="truncate text-center text-xs font-bold text-cocoa/55">{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="motion-panel rounded-lg bg-white p-5 shadow-soft">
            <h2 className="text-2xl font-black">Productos destacados</h2>
            <p className="mt-1 text-sm text-cocoa/60">Participación por unidades vendidas.</p>
            <div className="mt-6 space-y-4">
              {(summary.length ? summary : visibleSummary).slice(0, 5).map((item) => {
                const max = Math.max(...summary.map((entry) => entry.total_quantity), 1);
                return (
                  <div key={item.dessert_id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-black">{item.dessert_name}</span>
                      <span className="font-bold text-cocoa/60">{item.total_quantity}</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-cream">
                      <div
                        className="motion-chart-bar h-full rounded-full bg-caramel transition-all"
                        style={{ width: `${Math.max(6, (item.total_quantity / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {summary.length === 0 ? <p className="text-sm text-cocoa/60">Aún no hay ventas para graficar.</p> : null}
            </div>
          </div>
        </section>

        <section className="motion-panel mt-8 rounded-lg bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-black">Buscar y filtrar pedidos</h2>
              <p className="mt-1 text-sm text-cocoa/60">Filtra por cliente, teléfono, correo, producto, fecha o estado.</p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-3xl">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase text-cocoa/60">Buscar</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="motion-input h-11 w-full rounded-md border border-caramel/20 bg-cream px-3 outline-none ring-caramel/20 transition focus:ring-4"
                  placeholder="Cliente, producto..."
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase text-cocoa/60">Fecha</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="motion-input h-11 w-full rounded-md border border-caramel/20 bg-cream px-3 outline-none ring-caramel/20 transition focus:ring-4"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase text-cocoa/60">Estado</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="motion-input h-11 w-full rounded-md border border-caramel/20 bg-cream px-3 outline-none ring-caramel/20 transition focus:ring-4"
                >
                  <option value="todos">Todos</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-cream px-4 py-2 text-sm font-black text-cocoa">
              {totals.filteredOrders} pedidos visibles
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDateFilter("");
                setStatusFilter("todos");
              }}
              className="motion-button rounded-full border border-caramel/20 px-4 py-2 text-sm font-black text-cocoa transition hover:bg-cream"
            >
              Limpiar filtros
            </button>
          </div>
        </section>

        <section className="motion-panel mt-8 rounded-lg bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">Resumen por postre</h2>
              <p className="mt-1 text-sm text-cocoa/60">Conteo total y valor vendido según los filtros activos.</p>
            </div>
            <button
              type="button"
              onClick={exportSummary}
              disabled={visibleSummary.length === 0}
              className="motion-button rounded-full bg-caramel px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-berry disabled:cursor-not-allowed disabled:opacity-50"
            >
              Exportar resumen a Excel
            </button>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[650px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-caramel/20 text-cocoa/65">
                  <th className="py-3 pr-4">Postre</th>
                  <th className="py-3 pr-4">Cantidad total</th>
                  <th className="py-3 pr-4">Valor total vendido</th>
                </tr>
              </thead>
              <tbody>
                {visibleSummary.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-cocoa/60">No hay ventas para los filtros actuales.</td>
                  </tr>
                ) : (
                  visibleSummary.map((item) => (
                    <tr key={item.dessert_id} className="motion-row border-b border-caramel/10">
                      <td className="py-3 pr-4 font-black">{item.dessert_name}</td>
                      <td className="py-3 pr-4">{item.total_quantity}</td>
                      <td className="py-3 pr-4">{formatCurrency(Number(item.total_sold))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="motion-panel mt-8 rounded-lg bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">Pedidos</h2>
              <p className="mt-1 text-sm text-cocoa/60">Información completa de clientes, entrega y productos.</p>
            </div>
            <button
              type="button"
              onClick={exportOrders}
              disabled={filteredOrders.length === 0}
              className="motion-button rounded-full bg-berry px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-caramel disabled:cursor-not-allowed disabled:opacity-50"
            >
              Exportar pedidos a Excel
            </button>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1480px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-caramel/20 text-cocoa/65">
                  <th className="py-3 pr-4">Fecha</th>
                  <th className="py-3 pr-4">Pedido</th>
                  <th className="py-3 pr-4">Cliente</th>
                  <th className="py-3 pr-4">Contacto</th>
                  <th className="py-3 pr-4">Dirección</th>
                  <th className="py-3 pr-4">Observ.</th>
                  <th className="py-3 pr-4">Productos</th>
                  <th className="py-3 pr-4">Total</th>
                  <th className="py-3 pr-4">Estado</th>
                  <th className="py-3 pr-4">Pago</th>
                  <th className="py-3 pr-4">Notas</th>
                  <th className="py-3 pr-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-6 text-cocoa/60">No hay pedidos para mostrar.</td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="motion-row align-top border-b border-caramel/10">
                      <td className="py-4 pr-4">{formatDate(order.created_at)}</td>
                      <td className="py-4 pr-4 font-black">#{order.id}</td>
                      <td className="py-4 pr-4">
                        <p className="font-black">{order.customers?.full_name}</p>
                        <p className="text-cocoa/60">CC {order.customers?.document_number}</p>
                        <p className="text-cocoa/60">{order.customers?.email}</p>
                      </td>
                      <td className="py-4 pr-4">{order.customers?.phone}</td>
                      <td className="py-4 pr-4">
                        <textarea
                          value={order.delivery_address}
                          disabled={savingOrderId === order.id || deletingOrderId === order.id}
                          onChange={(event) => updateOrderLocally(order.id, { delivery_address: event.target.value })}
                          onBlur={(event) => {
                            void saveOrderChanges(order.id, {
                              status: order.status,
                              paymentMethod: order.payment_method,
                              adminNotes: order.admin_notes,
                              deliveryAddress: event.currentTarget.value,
                              observations: order.observations
                            });
                          }}
                          className="motion-input min-h-16 w-44 resize-y rounded-md border border-caramel/20 bg-cream px-3 py-2 text-sm outline-none ring-caramel/20 transition focus:ring-4 disabled:opacity-60"
                        />
                      </td>
                      <td className="py-4 pr-4">
                        <textarea
                          value={order.observations || ""}
                          disabled={savingOrderId === order.id || deletingOrderId === order.id}
                          onChange={(event) => updateOrderLocally(order.id, { observations: event.target.value })}
                          onBlur={(event) => {
                            void saveOrderChanges(order.id, {
                              status: order.status,
                              paymentMethod: order.payment_method,
                              adminNotes: order.admin_notes,
                              deliveryAddress: order.delivery_address,
                              observations: event.currentTarget.value
                            });
                          }}
                          className="motion-input min-h-16 w-44 resize-y rounded-md border border-caramel/20 bg-cream px-3 py-2 text-sm outline-none ring-caramel/20 transition focus:ring-4 disabled:opacity-60"
                          placeholder="Sin observaciones"
                        />
                      </td>
                      <td className="py-4 pr-4">
                        {(() => {
                          const items = getOrderItems(order);
                          const dirty = editedItems[order.id] !== undefined;
                          const busy = savingItemsOrderId === order.id;
                          const availableToAdd = DESSERTS.filter(
                            (dessert) => !items.some((item) => item.dessert_id === dessert.id)
                          );
                          return (
                            <div className="w-64 space-y-2">
                              {items.length === 0 ? (
                                <p className="text-xs font-bold text-berry">Sin productos</p>
                              ) : (
                                items.map((item) => (
                                  <div key={item.dessert_id} className="flex items-center justify-between gap-2">
                                    <span className="min-w-0 flex-1 truncate font-bold">{item.dessert_name}</span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => changeItemQty(order, item.dessert_id, -1)}
                                        className="motion-button h-7 w-7 rounded-full bg-cream font-black text-cocoa transition hover:bg-caramel/30 disabled:opacity-50"
                                      >
                                        −
                                      </button>
                                      <span className="w-6 text-center font-black">{item.quantity}</span>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => changeItemQty(order, item.dessert_id, 1)}
                                        className="motion-button h-7 w-7 rounded-full bg-cream font-black text-cocoa transition hover:bg-caramel/30 disabled:opacity-50"
                                      >
                                        +
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => removeItem(order, item.dessert_id)}
                                        className="motion-button ml-1 text-xs font-bold text-berry underline-offset-2 transition hover:underline disabled:opacity-50"
                                      >
                                        Quitar
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}

                              {availableToAdd.length > 0 ? (
                                <select
                                  value=""
                                  disabled={busy}
                                  onChange={(event) => {
                                    const id = Number(event.target.value);
                                    if (id) addItem(order, id);
                                    event.target.value = "";
                                  }}
                                  className="motion-input h-9 w-full rounded-md border border-caramel/20 bg-cream px-2 text-xs font-bold outline-none ring-caramel/20 transition focus:ring-4 disabled:opacity-50"
                                >
                                  <option value="">+ Agregar sabor...</option>
                                  {availableToAdd.map((dessert) => (
                                    <option key={dessert.id} value={dessert.id}>{dessert.name}</option>
                                  ))}
                                </select>
                              ) : null}

                              {dirty ? (
                                <div className="flex gap-2 pt-1">
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void saveOrderItems(order.id)}
                                    className="motion-button rounded-full bg-pistachio px-3 py-1.5 text-xs font-black text-white transition hover:bg-cocoa disabled:opacity-50"
                                  >
                                    {busy ? "Guardando..." : "Guardar"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => cancelItemsEdit(order.id)}
                                    className="motion-button rounded-full border border-caramel/30 px-3 py-1.5 text-xs font-black text-cocoa transition hover:bg-cream disabled:opacity-50"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-4 pr-4 font-black text-berry">{formatCurrency(Number(order.total_amount))}</td>
                      <td className="py-4 pr-4">
                        <select
                          value={order.status}
                          disabled={savingOrderId === order.id}
                          onChange={(event) => {
                            const nextStatus = event.target.value;
                            const nextPaymentMethod = nextStatus === "pagado"
                              ? order.payment_method || "efectivo"
                              : null;

                            updateOrderLocally(order.id, {
                              status: nextStatus,
                              payment_method: nextPaymentMethod
                            });
                            void saveOrderChanges(order.id, {
                              status: nextStatus,
                              paymentMethod: nextPaymentMethod,
                              adminNotes: order.admin_notes
                            });
                          }}
                          className="motion-input h-10 w-32 rounded-md border border-caramel/20 bg-cream px-3 text-sm font-black outline-none ring-caramel/20 transition focus:ring-4 disabled:opacity-60"
                        >
                          {orderStatusOptions.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 pr-4">
                        {order.status === "pagado" ? (
                          <select
                            value={order.payment_method || "efectivo"}
                            disabled={savingOrderId === order.id}
                            onChange={(event) => {
                              const nextPaymentMethod = event.target.value;

                              updateOrderLocally(order.id, {
                                payment_method: nextPaymentMethod
                              });
                              void saveOrderChanges(order.id, {
                                status: "pagado",
                                paymentMethod: nextPaymentMethod,
                                adminNotes: order.admin_notes
                              });
                            }}
                            className="motion-input h-10 w-36 rounded-md border border-caramel/20 bg-cream px-3 text-sm font-black outline-none ring-caramel/20 transition focus:ring-4 disabled:opacity-60"
                          >
                            {paymentMethodOptions.map((method) => (
                              <option key={method} value={method}>{method}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-bold text-cocoa/50">Pendiente</span>
                        )}
                      </td>
                      <td className="py-4 pr-4">
                        <textarea
                          value={order.admin_notes || ""}
                          disabled={savingOrderId === order.id || deletingOrderId === order.id}
                          onChange={(event) => updateOrderLocally(order.id, { admin_notes: event.target.value })}
                          onBlur={(event) => {
                            void saveOrderChanges(order.id, {
                              status: order.status,
                              paymentMethod: order.payment_method,
                              adminNotes: event.currentTarget.value,
                              deliveryAddress: order.delivery_address,
                              observations: order.observations
                            });
                          }}
                          className="motion-input min-h-20 w-56 resize-y rounded-md border border-caramel/20 bg-cream px-3 py-2 text-sm outline-none ring-caramel/20 transition focus:ring-4 disabled:opacity-60"
                          placeholder="Notas internas"
                        />
                        {savingOrderId === order.id ? (
                          <p className="mt-1 text-xs font-bold text-caramel">Guardando...</p>
                        ) : null}
                      </td>
                      <td className="py-4 pr-4">
                        <button
                          type="button"
                          onClick={() => void deleteOrder(order.id)}
                          disabled={deletingOrderId === order.id || savingOrderId === order.id}
                          className="motion-button rounded-full bg-berry px-3 py-2 text-xs font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingOrderId === order.id ? "Eliminando..." : "Eliminar"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
