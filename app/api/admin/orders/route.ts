import { NextRequest, NextResponse } from "next/server";
import { getAdminCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AdminOrder, SalesSummaryItem } from "@/lib/types";

export const runtime = "nodejs";

type SupabaseOrder = Omit<AdminOrder, "customers"> & {
  customers: AdminOrder["customers"] | AdminOrder["customers"][];
};

const allowedStatuses = new Set(["recibido", "pagado"]);
const allowedPaymentMethods = new Set(["efectivo", "transferencia"]);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseOrderId(value: unknown) {
  const numericValue = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value.trim())
      : NaN;

  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(getAdminCookieName())?.value;

  if (!verifyAdminSessionToken(token)) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        customer_id,
        delivery_address,
        delivery_date,
        observations,
        total_amount,
        status,
        payment_method,
        admin_notes,
        created_at,
        customers (
          id,
          document_number,
          full_name,
          email,
          phone
        ),
        order_items (
          id,
          dessert_id,
          dessert_name,
          quantity,
          unit_price,
          subtotal,
          created_at
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const orders = ((data || []) as unknown as SupabaseOrder[]).map((order) => ({
      ...order,
      customers: Array.isArray(order.customers) ? order.customers[0] || null : order.customers
    })) as AdminOrder[];
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

    return NextResponse.json({
      orders,
      summary: Array.from(summaryByDessert.values()).sort((a, b) =>
        a.dessert_name.localeCompare(b.dessert_name)
      )
    });
  } catch (error) {
    console.error("Admin orders error", error);
    const message = error instanceof Error ? error.message : "";

    if (message.includes("Supabase no esta configurado")) {
      return NextResponse.json(
        { message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "No se pudieron leer los pedidos desde Supabase." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get(getAdminCookieName())?.value;

  if (!verifyAdminSessionToken(token)) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      orderId?: number | string;
      status?: string;
      paymentMethod?: string | null;
      adminNotes?: string | null;
    };
    const orderId = parseOrderId(body.orderId);
    const status = cleanText(body.status).toLowerCase();
    const requestedPaymentMethod = cleanText(body.paymentMethod).toLowerCase();
    const adminNotes = cleanText(body.adminNotes) || null;

    if (!orderId) {
      return NextResponse.json({ message: "ID de pedido invalido." }, { status: 400 });
    }

    if (!allowedStatuses.has(status)) {
      return NextResponse.json({ message: "Estado invalido." }, { status: 400 });
    }

    if (status === "pagado" && !allowedPaymentMethods.has(requestedPaymentMethod)) {
      return NextResponse.json(
        { message: "Selecciona si el pago fue en efectivo o transferencia." },
        { status: 400 }
      );
    }

    const paymentMethod = status === "pagado" ? requestedPaymentMethod : null;

    const supabase = getSupabaseAdmin();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .update({
        status,
        payment_method: paymentMethod,
        admin_notes: adminNotes
      })
      .eq("id", orderId)
      .select("id, status, payment_method, admin_notes")
      .single();

    if (orderError) {
      throw orderError;
    }

    const { error: salesError } = await supabase
      .from("ventas")
      .update({
        status,
        payment_method: paymentMethod,
        admin_notes: adminNotes
      })
      .eq("order_id", orderId);

    if (salesError) {
      throw salesError;
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Admin order update error", error);
    const message = error instanceof Error ? error.message : "";

    if (message.includes("Supabase no esta configurado")) {
      return NextResponse.json({ message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "No se pudo actualizar el pedido." },
      { status: 500 }
    );
  }
}
