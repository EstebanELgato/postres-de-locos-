"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import DeliveryNotice from "@/components/DeliveryNotice";
import OrderSuccessModal from "@/components/OrderSuccessModal";
import Reveal from "@/components/Reveal";
import Mascota from "@/components/Mascota";
import HeroCarousel from "@/components/HeroCarousel";
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
  documentNumber: "",
  phone: "",
  email: "",
  deliveryAddress: "",
  observations: "",
  website: ""
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9\s()\-]{7,20}$/;
const documentPattern = /^[0-9]{5,12}$/;
const MAX_PER_DESSERT = 5;
const WHATSAPP_NUMBER = "573114591424";

function getInitialQuantities(): QuantityMap {
  return Object.fromEntries(DESSERTS.map((dessert) => [dessert.id, 1])) as QuantityMap;
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" className="h-8 w-8 sm:h-9 sm:w-9" viewBox="0 0 32 32" fill="currentColor">
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
  const [scrolled, setScrolled] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

    if (amount > MAX_PER_DESSERT) {
      showToast("error", "Cantidad no disponible. Contáctanos por WhatsApp.");
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

    if (
      !form.fullName.trim() ||
      !form.documentNumber.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.deliveryAddress.trim()
    ) {
      return "Completa nombre, cedula, telefono, correo y direccion.";
    }

    const documentDigits = form.documentNumber.replace(/\D/g, "");
    if (!documentPattern.test(documentDigits)) {
      return "Escribe una cedula de ciudadania valida.";
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

  function showSuccessModalInView() {
    const activeElement = document.activeElement;

    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => {
      setIsSuccessModalOpen(true);
    }, 240);
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
            documentNumber: form.documentNumber,
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
      showSuccessModalInView();
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
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? "glass-nav py-2" : "bg-transparent py-3"
        }`}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <a
            href="#"
            className={`flex min-w-0 items-center gap-3 transition-colors ${scrolled ? "text-cocoa" : "text-white"}`}
          >
            <Image
              src="/images/logo.png"
              alt="Logo Postres de Locos"
              width={64}
              height={64}
              className="h-11 w-11 shrink-0 rounded-full bg-white object-cover ring-2 ring-white/80 sm:h-12 sm:w-12"
              priority
            />
            <span className="truncate font-display text-base font-black uppercase tracking-tight sm:text-lg">
              Postres de Locos
            </span>
          </a>
          <nav
            className={`hidden items-center gap-7 text-sm font-bold lg:flex ${scrolled ? "text-cocoa" : "text-white"}`}
          >
            <a href="#productos" className="link-underline transition hover:text-caramel">Productos</a>
            <a href="#nosotros" className="link-underline transition hover:text-caramel">Quiénes somos</a>
            <a href="#contacto" className="link-underline transition hover:text-caramel">Contacto</a>
            <a href="/admin" className="link-underline transition hover:text-caramel">Admin</a>
          </nav>
          <a
            href="#pedido"
            className="motion-button inline-flex items-center justify-center rounded-full bg-berry px-4 py-2.5 text-xs font-black text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-caramel sm:px-6 sm:text-sm"
          >
            Haz tu pedido
          </a>
        </div>
      </header>

      <DeliveryNotice />
      <Mascota />
      <OrderSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
      />

      <div className="fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-fade-up flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold shadow-lift backdrop-blur ${
              toast.type === "success"
                ? "border-pistachio/30 bg-white/95 text-pistachio"
                : toast.type === "error"
                  ? "border-berry/30 bg-white/95 text-berry"
                  : "border-caramel/30 bg-white/95 text-cocoa"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                toast.type === "success" ? "bg-pistachio" : toast.type === "error" ? "bg-berry" : "bg-caramel"
              }`}
            />
            {toast.text}
          </div>
        ))}
      </div>

      <a
        href="https://wa.me/573114591424"
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar por WhatsApp"
        className="whatsapp-float fixed bottom-5 right-5 z-50 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_18px_45px_rgba(37,211,102,0.45)] ring-4 ring-white/80 transition hover:bg-[#1ebe5d] focus:outline-none focus:ring-4 focus:ring-[#25D366]/35 sm:bottom-8 sm:right-8 sm:h-20 sm:w-20"
      >
        <WhatsAppIcon />
      </a>

      <HeroCarousel />

      <section id="nosotros" className="relative bg-cream px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1fr_1.1fr] md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-berry">
              <span className="h-px w-8 bg-berry" /> Quiénes somos
            </p>
            <h2 className="mt-4 font-display text-4xl font-black leading-tight sm:text-5xl">
              Postres hechos con <span className="text-gradient">responsabilidad</span>
            </h2>
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
        </Reveal>
      </section>

      <section id="productos" className="relative overflow-hidden bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="blob blob-iridescent pointer-events-none absolute -left-24 top-12 hidden h-64 w-64 opacity-60 lg:block" />
        <div className="blob pointer-events-none absolute -right-20 bottom-16 hidden h-56 w-56 bg-honey/15 blur-3xl lg:block" style={{ animationDelay: "7s" }} />
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-caramel">
            <span className="h-px w-8 bg-caramel" /> Nuestro catálogo <span className="h-px w-8 bg-caramel" />
          </p>
          <h2 className="mt-4 font-display text-4xl font-black leading-tight sm:text-5xl">Sabores disponibles</h2>
          <p className="mt-5 text-base leading-8 text-cocoa/75 sm:text-lg">
            Elaborados de forma casera y con mucho amor. Cada opción combina buena presentación, porciones generosas y
            una preparación pensada para disfrutar en cualquier ocasión.
          </p>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-7xl gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {DESSERTS.map((dessert, index) => (
              <motion.article
                key={dessert.id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-caramel/12 bg-cream shadow-soft transition-all duration-300 hover:-translate-y-2 hover:shadow-lift"
                initial={reduceMotion ? false : { opacity: 0, y: 26 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-white">
                  {dessert.imageUrl ? (
                    <Image
                      src={dessert.imageUrl}
                      alt={`Postre de ${dessert.name}`}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="hover-zoom-img object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-honey/40 via-cream to-caramel/20 text-cocoa/60">
                      <span className="text-4xl">📷</span>
                      <span className="text-sm font-black uppercase tracking-wide">Imagen próximamente</span>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-black text-berry shadow-soft ring-1 ring-caramel/10">
                    {formatCurrency(dessert.price)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col space-y-4 p-6">
                  <div>
                    <h3 className="font-display text-2xl font-black">{dessert.name}</h3>
                    <p className="mt-2 min-h-[4.5rem] text-sm leading-6 text-cocoa/70">{dessert.description}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-bold text-cocoa/75">Cantidad</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Disminuir cantidad"
                        onClick={() => updateQuantity(dessert.id, (selectedQuantities[dessert.id] || 1) - 1)}
                        className="motion-button flex h-11 w-11 items-center justify-center rounded-md border border-caramel/25 bg-white text-xl font-black text-cocoa transition hover:bg-honey"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={selectedQuantities[dessert.id] || 1}
                        onChange={(event) => updateQuantity(dessert.id, Number(event.target.value))}
                        className="motion-input h-11 w-20 rounded-md border border-caramel/25 bg-white px-3 text-center font-black outline-none ring-caramel/20 transition focus:ring-4"
                      />
                      <button
                        type="button"
                        aria-label="Aumentar cantidad"
                        onClick={() => updateQuantity(dessert.id, (selectedQuantities[dessert.id] || 1) + 1)}
                        className="motion-button flex h-11 w-11 items-center justify-center rounded-md border border-caramel/25 bg-white text-xl font-black text-cocoa transition hover:bg-honey"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {(selectedQuantities[dessert.id] || 1) > MAX_PER_DESSERT ? (
                    <div className="animate-notice flex items-start gap-3 rounded-xl border border-caramel/30 bg-honey/30 px-3 py-3 text-sm leading-5 text-cocoa shadow-soft">
                      <span className="animate-notice-icon mt-0.5 text-lg" aria-hidden>
                        🍰
                      </span>
                      <p className="font-semibold">
                        Por ahora no tenemos esa cantidad de {dessert.name}. Escríbenos al{" "}
                        <a
                          href={`https://wa.me/${WHATSAPP_NUMBER}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-black text-[#1ebe5d] underline decoration-2 underline-offset-2 transition hover:text-[#16a34a]"
                        >
                          WhatsApp
                        </a>{" "}
                        y con gusto te damos una solución. 💛
                      </p>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => addToOrder(dessert.id)}
                    disabled={(selectedQuantities[dessert.id] || 1) > MAX_PER_DESSERT}
                    className="motion-button mt-auto w-full rounded-full bg-cocoa px-5 py-3.5 font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-berry disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    Agregar al pedido
                  </button>
                </div>
              </motion.article>
            ))}
        </div>
      </section>

      <section id="pedido" className="relative overflow-hidden bg-gradient-to-b from-cream to-sand/60 px-4 py-20 sm:px-6 lg:px-8">
        <div className="blob blob-iridescent pointer-events-none absolute -right-28 top-24 hidden h-72 w-72 opacity-50 lg:block" style={{ animationDelay: "3s" }} />
        <Reveal className="mx-auto mb-10 max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-berry">
            <span className="h-px w-8 bg-berry" /> Haz tu pedido <span className="h-px w-8 bg-berry" />
          </p>
          <h2 className="mt-4 font-display text-4xl font-black leading-tight sm:text-5xl">
            Ya casi es <span className="text-gradient">tuyo</span>
          </h2>
        </Reveal>
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.86fr_1.14fr]">
          <aside className="glass-panel rounded-3xl p-6 lg:sticky lg:top-24 lg:self-start">
            <p className="text-sm font-black uppercase tracking-wide text-berry">Tu pedido</p>
            <h2 className="mt-3 font-display text-3xl font-black">Resumen</h2>
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
            className="glass-panel relative rounded-3xl p-6 sm:p-8"
          >
            <p className="text-sm font-black uppercase tracking-wide text-caramel">Formulario de pedido</p>
            <h2 className="mt-3 font-display text-3xl font-black">Datos de entrega</h2>
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
                  className="motion-input h-12 w-full rounded-xl border border-caramel/20 bg-cream px-4 outline-none ring-caramel/20 transition focus:ring-4"
                  placeholder="Tu nombre"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-black">Cedula de ciudadania</span>
                <input
                  required
                  inputMode="numeric"
                  value={form.documentNumber}
                  onChange={(event) => updateForm("documentNumber", event.target.value)}
                  className="motion-input h-12 w-full rounded-xl border border-caramel/20 bg-cream px-4 outline-none ring-caramel/20 transition focus:ring-4"
                  placeholder="Tu numero de cedula"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-black">Teléfono</span>
                <input
                  required
                  inputMode="tel"
                  value={form.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                  className="motion-input h-12 w-full rounded-xl border border-caramel/20 bg-cream px-4 outline-none ring-caramel/20 transition focus:ring-4"
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
                  className="motion-input h-12 w-full rounded-xl border border-caramel/20 bg-cream px-4 outline-none ring-caramel/20 transition focus:ring-4"
                  placeholder="correo@ejemplo.com"
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-black">Dirección de entrega</span>
                <input
                  required
                  value={form.deliveryAddress}
                  onChange={(event) => updateForm("deliveryAddress", event.target.value)}
                  className="motion-input h-12 w-full rounded-xl border border-caramel/20 bg-cream px-4 outline-none ring-caramel/20 transition focus:ring-4"
                  placeholder="Barrio, calle, casa o referencia"
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-black">Observaciones</span>
                <textarea
                  value={form.observations}
                  onChange={(event) => updateForm("observations", event.target.value)}
                  className="motion-input min-h-28 w-full resize-y rounded-xl border border-caramel/20 bg-cream px-4 py-3 outline-none ring-caramel/20 transition focus:ring-4"
                  placeholder="Detalles del pedido, hora preferida o indicaciones de entrega"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="motion-button mt-7 inline-flex w-full items-center justify-center gap-3 rounded-full bg-berry px-6 py-4 text-lg font-black text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-caramel disabled:cursor-not-allowed disabled:opacity-60"
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

      <section id="contacto" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="mx-auto grid max-w-7xl items-center gap-8 md:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-pistachio">
              <span className="h-px w-8 bg-pistachio" /> Servicio al cliente
            </p>
            <h2 className="mt-4 font-display text-4xl font-black leading-tight sm:text-5xl">
              Contáctanos vía <span className="text-[#1ebe5d]">WhatsApp</span>
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-cocoa/75 sm:text-lg">
              Escríbenos para confirmar disponibilidad, resolver dudas o coordinar entregas especiales. Te respondemos
              rapidito. 💬
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="https://wa.me/573114591424"
                target="_blank"
                rel="noreferrer"
                className="motion-button inline-flex items-center justify-center gap-3 rounded-full bg-[#25D366] px-7 py-4 text-base font-black text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-[#1ebe5d]"
              >
                <WhatsAppIcon />
                Hablar por WhatsApp
              </a>
              <a
                href="#pedido"
                className="motion-button inline-flex items-center justify-center rounded-full bg-cocoa px-7 py-4 text-base font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-caramel"
              >
                Hacer un pedido
              </a>
            </div>
          </div>
          <div className="group overflow-hidden rounded-3xl border border-caramel/12 shadow-lift">
            <Image
              src="/images/publicidad.jpg"
              alt="Postres de Locos"
              width={900}
              height={1100}
              className="hover-zoom-img h-full w-full object-cover"
            />
          </div>
        </Reveal>
      </section>

      <footer className="relative overflow-hidden bg-cocoa px-4 py-14 text-cream sm:px-6 lg:px-8">
        <div className="grain-overlay" />
        <div className="relative mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo.png"
                alt="Logo Postres de Locos"
                width={56}
                height={56}
                className="h-12 w-12 rounded-full bg-white object-cover ring-2 ring-honey/40"
              />
              <span className="font-display text-xl font-black uppercase">Postres de Locos</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-7 text-cream/70">
              Repostería casera premium. Postres frescos y cremosos, hechos con amor para tus momentos especiales.
            </p>
          </div>
          <div>
            <p className="font-display text-sm font-black uppercase tracking-wide text-honey">Navegación</p>
            <ul className="mt-4 space-y-2.5 text-sm font-semibold text-cream/80">
              <li><a href="#productos" className="link-underline transition hover:text-honey">Productos</a></li>
              <li><a href="#nosotros" className="link-underline transition hover:text-honey">Quiénes somos</a></li>
              <li><a href="#pedido" className="link-underline transition hover:text-honey">Haz tu pedido</a></li>
              <li><a href="/admin" className="link-underline transition hover:text-honey">Panel admin</a></li>
            </ul>
          </div>
          <div>
            <p className="font-display text-sm font-black uppercase tracking-wide text-honey">Contacto</p>
            <ul className="mt-4 space-y-2.5 text-sm font-semibold text-cream/80">
              <li>
                <a
                  href="https://wa.me/573114591424"
                  target="_blank"
                  rel="noreferrer"
                  className="link-underline inline-flex items-center gap-2 transition hover:text-honey"
                >
                  💬 WhatsApp: 311 459 1424
                </a>
              </li>
              <li>🕐 Pedidos con anticipación</li>
              <li>🚚 Entrega a domicilio</li>
            </ul>
          </div>
        </div>
        <div className="relative mx-auto mt-10 max-w-7xl border-t border-cream/15 pt-6 text-center text-xs font-semibold text-cream/60">
          © {new Date().getFullYear()} Postres de Locos · Hecho con 💛 en Colombia
        </div>
      </footer>
    </main>
  );
}
