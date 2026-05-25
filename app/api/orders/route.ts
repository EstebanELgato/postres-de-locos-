import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type OrderRequest = {
  customer?: {
    fullName?: string;
    documentNumber?: string;
    email?: string;
    phone?: string;
  };
  order?: {
    deliveryAddress?: string;
    observations?: string;
  };
  website?: string;
  items?: Array<{
    dessertId?: number | string;
    quantity?: number;
  }>;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9\s()\-]{7,20}$/;
const documentPattern = /^[0-9]{5,12}$/;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const requestLog = new Map<string, number[]>();

function cleanText(value?: string) {
  return typeof value === "string" ? value.trim() : "";
}

function parseNumericId(value: unknown) {
  const numericValue = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value.trim())
      : NaN;

  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const recentRequests = (requestLog.get(ip) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(ip, recentRequests);
    return true;
  }

  requestLog.set(ip, [...recentRequests, now]);
  return false;
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return phonePattern.test(value) && digits.length >= 7 && digits.length <= 15;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { message: "Has enviado varios intentos seguidos. Espera unos minutos e intenta de nuevo." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as OrderRequest;

    if (cleanText(body.website)) {
      return NextResponse.json({ message: "Pedido recibido." });
    }

    const fullName = cleanText(body.customer?.fullName);
    const documentNumber = cleanText(body.customer?.documentNumber).replace(/\D/g, "");
    const email = cleanText(body.customer?.email).toLowerCase();
    const phone = cleanText(body.customer?.phone);
    const deliveryAddress = cleanText(body.order?.deliveryAddress);
    const observations = cleanText(body.order?.observations);
    const items = Array.isArray(body.items) ? body.items : [];

    if (!fullName || !documentNumber || !email || !phone || !deliveryAddress) {
      return NextResponse.json(
        { message: "Completa nombre, cedula, correo, telefono y direccion." },
        { status: 400 }
      );
    }

    if (!documentPattern.test(documentNumber)) {
      return NextResponse.json(
        { message: "Escribe una cedula de ciudadania valida." },
        { status: 400 }
      );
    }

    if (!emailPattern.test(email)) {
      return NextResponse.json(
        { message: "Escribe un correo electronico valido." },
        { status: 400 }
      );
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { message: "Escribe un numero de telefono valido." },
        { status: 400 }
      );
    }

    const normalizedItems = items
      .map((item) => ({
        dessertId: parseNumericId(item.dessertId),
        quantity: Number(item.quantity)
      }))
      .filter(
        (item): item is { dessertId: number; quantity: number } =>
          item.dessertId !== null && Number.isInteger(item.quantity) && item.quantity > 0
      );

    if (normalizedItems.length === 0) {
      return NextResponse.json(
        { message: "Agrega al menos un postre al pedido." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const dessertIds = Array.from(new Set(normalizedItems.map((item) => item.dessertId)));
    const { data: desserts, error: dessertsError } = await supabase
      .from("desserts")
      .select("id, name, price, active")
      .in("id", dessertIds)
      .eq("active", true);

    if (dessertsError) {
      throw dessertsError;
    }

    if (!desserts || desserts.length !== dessertIds.length) {
      return NextResponse.json(
        { message: "Uno de los postres seleccionados no esta disponible." },
        { status: 400 }
      );
    }

    const dessertsById = new Map(desserts.map((dessert) => [Number(dessert.id), dessert]));
    const orderItems = normalizedItems.map((item) => {
      const dessert = dessertsById.get(item.dessertId);
      const unitPrice = Number(dessert?.price || 0);

      return {
        dessert_id: item.dessertId,
        dessert_name: dessert?.name || "",
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal: unitPrice * item.quantity
      };
    });
    const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    const { data: existingCustomer, error: findCustomerError } = await supabase
      .from("customers")
      .select("id")
      .or(`document_number.eq.${documentNumber},cedula.eq.${documentNumber}`)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (findCustomerError) {
      throw findCustomerError;
    }

    const customerMutation = existingCustomer
      ? supabase
        .from("customers")
        .update({
          document_number: documentNumber,
          cedula: documentNumber,
          full_name: fullName,
          email,
          phone
        })
        .eq("id", existingCustomer.id)
        .select("id")
        .single()
      : supabase
        .from("customers")
        .insert({
          document_number: documentNumber,
          cedula: documentNumber,
          full_name: fullName,
          email,
          phone
        })
        .select("id")
        .single();

    const { data: customer, error: customerError } = await customerMutation;

    if (customerError) {
      throw customerError;
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: customer.id,
        delivery_address: deliveryAddress,
        delivery_date: todayDate(),
        observations: observations || null,
        total_amount: totalAmount,
        status: "recibido"
      })
      .select("id")
      .single();

    if (orderError) {
      throw orderError;
    }

    const { data: insertedItems, error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems.map((item) => ({ ...item, order_id: order.id })))
      .select("id, dessert_id, dessert_name, quantity, unit_price, subtotal");

    if (itemsError) {
      throw itemsError;
    }

    const salesRows = (insertedItems || []).map((item) => ({
      order_id: order.id,
      order_item_id: item.id,
      customer_id: customer.id,
      customer_document: documentNumber,
      dessert_id: item.dessert_id,
      customer_name: fullName,
      customer_email: email,
      customer_phone: phone,
      dessert_name: item.dessert_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      delivery_address: deliveryAddress,
      observations: observations || null,
      status: "recibido"
    }));

    const { error: salesError } = await supabase
      .from("ventas")
      .insert(salesRows);

    if (salesError) {
      throw salesError;
    }

    return NextResponse.json({
      message: "Pedido enviado correctamente. Te contactaremos por WhatsApp o correo.",
      orderId: order.id
    });
  } catch (error) {
    console.error("Error creating order", error);
    const message = error instanceof Error ? error.message : "";

    if (message.includes("Supabase no esta configurado")) {
      return NextResponse.json(
        { message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "No se pudo guardar el pedido. Revisa la configuracion de Supabase." },
      { status: 500 }
    );
  }
}
