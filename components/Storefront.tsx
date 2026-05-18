"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import DeliveryNotice from "@/components/DeliveryNotice";
import OrderSuccessModal from "@/components/OrderSuccessModal";
import { DESSERTS, formatCurrency } from "@/lib/desserts";
import type { OrderForm } from "@/lib/types";

type Toast = {
  id: number;
  type: "success" | "error" | "info";
  text: string;
};

type FormFeedback = {
  type: "error" | "info";
  text: string;
} | null;

type QuantityMap = Record<number, number>;

const initialForm: OrderForm = {
  fullName: "",
  phone: "",
  email: "",
  deliveryAddress: "",
  observations: "",
  website: ""
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9\s()\-]{7,20}$/;

function getInitialQuantities(): QuantityMap {
  return Object.fromEntries(DESSERTS.map((dessert) => [dessert.id, 1])) as QuantityMap;
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 32 32" fill="currentColor">
      <path d="M16.04 3C9.38 3 4 8.31 4 14.88c0 2.09.56 4.13 1.62 5.92L4 29l8.39-1.56a12.2 12.2 0 0 0 3.65.55C22.69 27.99 28 22.68 28 16.11 28 9.55 22.69 3 16.04 3Zm0 22.8c-1.16 0-2.3-.18-3.39-.55l-.49-.16-4.98.93.95-4.81-.27-.5a9.75 9.75 0 0 1-1.48-5.16c0-5.34 4.34-9.68 9.67-9.68 5.34 0 9.68 4.34 9.68 9.68 0 5.32-4.34 9.65-9.69 9.65Zm5.31-7.22c-.29-.14-1.72-.84-1.98-.94-.27-.09-.46-.14-.66.15-.19.28-.75.93-.92 1.12-.17.19-.34.21-.63.07-.29-.14-1.22-.45-2.32-1.43-.86-.76-1.43-1.7-1.6-1.99-.17-.28-.02-.44.13-.58.13-.13.29-.34.43-.51.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.14-.66-1.58-.9-2.16-.24-.57-.48-.49-.66-.5h-.56c-.19 0-.51.07-.77.36-.27.29-1.02 1-1.02 2.43 0 1.44 1.05 2.83 1.19 3.02.15.19 2.06 3.14 5 4.4.7.3 1.24.48 1.66.61.7.22 1.34.19 1.85.12.56-.08 1.72-.7 1.96-1.38.24-.67.24-1.25.17-1.38-.07-.12-.26-.19-.55-.34Z" />
    </svg>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}

export default function Storefront() {
  const [selectedQuantities, setSelectedQuantities] = useState<QuantityMap>(
    () => getInitialQuantities()
  );
  const [cart, setCart] = useState<QuantityMap>({});
  const [form, setForm] = useState<OrderForm>(initialForm);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [formFeedback, setFormFeedback] = useState<FormFeedback>(null);

  const cartRows = useMemo(
    () =>
      DESSERTS.filter((dessert) => cart[dessert.id] > 0).map((dessert) => ({
        ...dessert,
        quantity: cart[dessert.id],
        subtotal: cart[dessert.id] * dessert.price
      })),
    [cart]
  );

  const total = cartRows.reduce((sum, item) => sum + item.subtotal, 0);
  const totalQuantity = cartRows.reduce((sum, item) => sum + item.quantity, 0);

  function showToast(type: Toast["type"], text: string) {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }

  function updateQuantity(dessertId: number, value: number) {
    const normalized = Math.max(1, Math.min(99, Number.isFinite(value) ? value : 1));
    setSelectedQuantities((current) => ({
      ...current,
      [dessertId]: normalized
    }));
  }

  function addToOrder(dessertId: number) {
    const amount = selectedQuantities[dessertId] || 1;

    if (amount <= 0) {
      showToast("error", "La cantidad debe ser mayor a cero.");
      return;
    }

    const dessert = DESSERTS.find((item) => item.id === dessertId);
    setCart((current) => ({
      ...current,
      [dessertId]: (current[dessertId] || 0) + amount
    }));
    setFormFeedback(null);
    showToast("success", `${dessert?.name || "Producto"} agregado al pedido.`);
  }

  function removeFromOrder(dessertId: number) {
    setCart((current) => {
      const next = { ...current };
      delete next[dessertId];
      return next;
    });
    showToast("info", "Producto retirado del pedido.");
  }

  function updateForm(field: keyof OrderForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validateOrder() {
    if (cartRows.length === 0) {
      return "Primero elige un sabor y presiona “Agregar al pedido”. Luego podrás enviar el pedido.";
    }

    if (cartRows.some((item) => item.quantity <= 0)) {
      return "Todas las cantidades deben ser mayores a cero.";
    }

    if (!form.fullName.trim() || !form.phone.trim() || !form.email.trim() || !form.deliveryAddress.trim()) {
      return "Completa nombre, telefono, correo y direccion.";
    }

    if (!emailPattern.test(form.email.trim())) {
      return "Escribe un correo electronico valido.";
    }

    const phoneDigits = form.phone.replace(/\D/g, "");
    if (!phonePattern.test(form.phone.trim()) || phoneDigits.length < 7 || phoneDigits.length > 15) {
      return "Escribe un numero de telefono valido.";
    }

    return "";
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSuccessModalOpen(false);
    setFormFeedback(null);

    const validationError = validateOrder();
    if (validationError) {
      setFormFeedback({ type: "error", text: validationError });
      showToast("error", validationError);
      return;
    }

    setIsSubmitting(true);
    setFormFeedback({ type: "info", text: "Enviando tu pedido a Supabase..." });
    showToast("info", "Estamos guardando tu pedido...");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customer: {
            fullName: form.fullName,
            email: form.email,
            phone: form.phone
          },
          order: {
            deliveryAddress: form.deliveryAddress,
            observations: form.observations
          },
          website: form.website,
          items: cartRows.map((item) => ({
            dessertId: item.id,
            quantity: item.quantity
          }))
        })
      });

      const result = (await response.json()) as { message?: string; orderId?: number };

      if (!response.ok) {
        throw new Error(result.message || "No se pudo enviar el pedido.");
      }

      setForm(initialForm);
      setCart({});
      setSelectedQuantities(getInitialQuantities());
      setFormFeedback(null);
      setIsSuccessModalOpen(true);
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ocurrio un error al enviar el pedido.";
      setFormFeedback({ type: "error", text: message });
      showToast("error", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream text-cocoa">
      <DeliveryNotice />
      <OrderSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
      />

      <div className="fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-fade-up rounded-lg border px-4 py-3 text-sm font-bold shadow-soft backdrop-blur ${
              toast.type === "success"
                ? "border-pistachio/30 bg-white/95 text-pistachio"
                : toast.type === "error"
                  ? "border-berry/30 bg-white/95 text-berry"
                  : "border-caramel/30 bg-white/95 text-cocoa"
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>

      <a
        href="https://wa.me/573114591424"
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar por WhatsApp"
        className="motion-button motion-float fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-soft transition hover:scale-105 hover:bg-pistachio focus:outline-none focus:ring-4 focus:ring-[#25D366]/30"
      >
        <WhatsAppIcon />
      </a>

      <section
        className="relative flex min-h-[92vh] flex-col overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/images/todos-los-sabores.jpg')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(50,24,8,0.78),rgba(50,24,8,0.48),rgba(255,248,236,0.98))]" />
        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <a href="#" className="flex min-w-0 items-center gap-3 text-white">
            <Image
              src="/images/logo.png"
              alt="Logo Postres de Locos"
              width={64}
              height={64}
              className="h-12 w-12 shrink-0 rounded-full bg-white object-cover ring-2 ring-white/80 sm:h-14 sm:w-14"
              priority
            />
            <span className="truncate text-base font-black uppercase sm:text-lg">Postres de Locos</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-white lg:flex">
            <a href="#productos" className="transition hover:text-honey">Productos</a>
            <a href="#nosotros" className="transition hover:text-honey">Quiénes somos</a>
            <a href="#contacto" className="transition hover:text-honey">Contacto</a>
            <a href="/admin" className="transition hover:text-honey">Admin</a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href="/admin"
              className="motion-button inline-flex items-center justify-center rounded-full bg-white/95 px-3 py-3 text-xs font-black text-cocoa shadow-soft transition hover:-translate-y-0.5 hover:bg-honey sm:px-5 sm:text-sm lg:hidden"
            >
              Panel admin
            </a>
            <a
              href="#pedido"
              className="motion-button inline-flex items-center justify-center rounded-full bg-honey px-3 py-3 text-xs font-black text-cocoa shadow-soft transition hover:-translate-y-0.5 hover:bg-white sm:px-6 sm:text-sm"
            >
              Haz tu pedido
            </a>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-4 pb-20 pt-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl animate-fade-up text-white">
            <p className="mb-4 inline-flex rounded-full bg-honey px-4 py-2 text-sm font-black uppercase text-cocoa">
              Reposteria casera premium
            </p>
            <h1 className="text-5xl font-black leading-tight sm:text-6xl lg:text-7xl">Postres de Locos</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/90 sm:text-xl">
              Postres cremosos, frescos y preparados con cuidado para celebrar, regalar o darse un antojo especial.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#pedido"
                className="motion-button inline-flex items-center justify-center rounded-full bg-berry px-7 py-4 text-base font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-caramel"
              >
                Haz tu pedido
              </a>
              <a
                href="#productos"
                className="motion-button inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-base font-black text-cocoa shadow-soft transition hover:-translate-y-0.5 hover:bg-honey"
              >
                Ver sabores
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="nosotros" className="bg-cream px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_1.1fr] md:items-center">
          <div>
            <p className="text-sm font-black uppercase text-berry">Quiénes somos</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Postres hechos con responsabilidad</h2>
          </div>
          <div className="space-y-5 text-base leading-8 text-cocoa/80 sm:text-lg">
            <p>
              Somos un emprendimiento dedicado a preparar postres caseros con sabor auténtico, buena presentación y
              mucho cuidado en cada detalle. Nuestro objetivo es ofrecer productos frescos, deliciosos y hechos con
              responsabilidad, pensando en que cada cliente tenga una experiencia especial y confiable.
            </p>
            <p>
              Más que vender postres, queremos acompañar momentos importantes: reuniones familiares, celebraciones,
              antojos, regalos y fechas especiales. Por eso cuidamos la calidad de los ingredientes, la presentación
              del producto y la atención al cliente.
            </p>
          </div>
        </div>
      </section>

      <section id="productos" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase text-caramel">Descripción de productos</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Sabores disponibles</h2>
            <p className="mt-5 text-base leading-8 text-cocoa/75 sm:text-lg">
              Nuestros postres están elaborados de forma casera y con mucho amor para quienes buscan un sabor dulce,
              fresco y casero. Cada opción del catálogo combina buena presentación, porciones generosas y una
              preparación pensada para disfrutar en cualquier ocasión.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {DESSERTS.map((dessert) => (
              <article
                key={dessert.id}
                className="motion-card group overflow-hidden rounded-lg border border-caramel/15 bg-cream shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative aspect-[4/3] bg-white">
                  <Image
                    src={dessert.imageUrl}
                    alt={`Postre de ${dessert.name}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-berry shadow-soft">
                    {formatCurrency(dessert.price)}
                  </span>
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <h3 className="text-2xl font-black">{dessert.name}</h3>
                    <p className="mt-2 min-h-20 text-sm leading-6 text-cocoa/70">{dessert.description}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <label className="flex w-full items-center justify-between gap-3 text-sm font-bold text-cocoa/75">
                      Cantidad
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={selectedQuantities[dessert.id] || 1}
                        onChange={(event) => updateQuantity(dessert.id, Number(event.target.value))}
                        className="motion-input h-11 w-24 rounded-md border border-caramel/25 bg-white px-3 text-center font-black outline-none ring-caramel/20 transition focus:ring-4"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToOrder(dessert.id)}
                    className="motion-button w-full rounded-full bg-cocoa px-5 py-3 font-black text-white transition hover:-translate-y-0.5 hover:bg-berry"
                  >
                    Agregar al pedido
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pedido" className="bg-cream px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.86fr_1.14fr]">
          <aside className="motion-panel rounded-lg border border-caramel/15 bg-white p-5 shadow-soft sm:p-6">
            <p className="text-sm font-black uppercase text-berry">Tu pedido</p>
            <h2 className="mt-3 text-3xl font-black">Resumen</h2>
            {cartRows.length === 0 ? (
              <p className="mt-5 leading-7 text-cocoa/70">
                Agrega productos desde el catálogo para verlos aquí antes de enviar el pedido.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {cartRows.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 border-b border-caramel/10 pb-4">
                    <div>
                      <p className="font-black">{item.name}</p>
                      <p className="text-sm text-cocoa/65">
                        {item.quantity} x {formatCurrency(item.price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-berry">{formatCurrency(item.subtotal)}</p>
                      <button
                        type="button"
                        onClick={() => removeFromOrder(item.id)}
                        className="motion-button mt-1 text-sm font-bold text-cocoa/60 underline-offset-4 transition hover:text-berry hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 text-lg font-black">
                  <span>{totalQuantity} postres</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            )}
          </aside>

          <form
            onSubmit={submitOrder}
            className="motion-panel rounded-lg border border-caramel/15 bg-white p-5 shadow-soft sm:p-6"
          >
            <p className="text-sm font-black uppercase text-caramel">Formulario de pedido</p>
            <h2 className="mt-3 text-3xl font-black">Datos de entrega</h2>
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(event) => updateForm("website", event.target.value)}
              className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
              aria-hidden="true"
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-black">Nombre completo</span>
                <input
                  required
                  value={form.fullName}
                  onChange={(event) => updateForm("fullName", event.target.value)}
                  className="motion-input h-12 w-full rounded-md border border-caramel/20 bg-cream px-4 outline-none ring-caramel/20 transition focus:ring-4"
                  placeholder="Tu nombre"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-black">Teléfono</span>
                <input
                  required
                  inputMode="tel"
                  value={form.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                  className="motion-input h-12 w-full rounded-md border border-caramel/20 bg-cream px-4 outline-none ring-caramel/20 transition focus:ring-4"
                  placeholder="3114591424"
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-black">Correo</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  className="motion-input h-12 w-full rounded-md border border-caramel/20 bg-cream px-4 outline-none ring-caramel/20 transition focus:ring-4"
                  placeholder="correo@ejemplo.com"
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-black">Dirección de entrega</span>
                <input
                  required
                  value={form.deliveryAddress}
                  onChange={(event) => updateForm("deliveryAddress", event.target.value)}
                  className="motion-input h-12 w-full rounded-md border border-caramel/20 bg-cream px-4 outline-none ring-caramel/20 transition focus:ring-4"
                  placeholder="Barrio, calle, casa o referencia"
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-black">Observaciones</span>
                <textarea
                  value={form.observations}
                  onChange={(event) => updateForm("observations", event.target.value)}
                  className="motion-input min-h-28 w-full resize-y rounded-md border border-caramel/20 bg-cream px-4 py-3 outline-none ring-caramel/20 transition focus:ring-4"
                  placeholder="Detalles del pedido, hora preferida o indicaciones de entrega"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="motion-button mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-berry px-6 py-4 text-lg font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-caramel disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Enviando pedido...
                </>
              ) : (
                "Enviar pedido"
              )}
            </button>

            {formFeedback ? (
              <div
                className={`mt-4 rounded-lg border px-4 py-3 text-sm font-bold ${
                  formFeedback.type === "error"
                    ? "border-berry/25 bg-berry/10 text-berry"
                    : "border-caramel/25 bg-honey/15 text-cocoa"
                }`}
                role="status"
                aria-live="polite"
              >
                {formFeedback.text}
              </div>
            ) : null}
          </form>
        </div>
      </section>

      <section id="contacto" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_0.9fr] md:items-center">
          <div>
            <p className="text-sm font-black uppercase text-pistachio">Servicio al cliente</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Contáctanos vía WhatsApp</h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-cocoa/75 sm:text-lg">
              Escríbenos para confirmar disponibilidad, resolver dudas o coordinar entregas especiales.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="https://wa.me/573114591424"
                target="_blank"
                rel="noreferrer"
                className="motion-button inline-flex items-center justify-center gap-3 rounded-full bg-pistachio px-7 py-4 text-base font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-cocoa"
              >
                <WhatsAppIcon />
                Hablar por WhatsApp
              </a>
              <a
                href="/admin"
                className="motion-button inline-flex items-center justify-center rounded-full bg-cocoa px-7 py-4 text-base font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-caramel"
              >
                Entrar al panel admin
              </a>
            </div>
          </div>
          <div className="motion-card overflow-hidden rounded-lg border border-caramel/15 shadow-soft">
            <Image
              src="/images/publicidad.jpg"
              alt="Publicidad de Postres de Locos"
              width={900}
              height={1100}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
