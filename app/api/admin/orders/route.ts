import { NextRequest, NextResponse } from "next/server";
import { getAdminCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AdminOrder, SalesSummaryItem } from "@/lib/types";

export const runtime = "nodejs";

type SupabaseOrder = Omit<AdminOrder, "customers"> & {
  customers: AdminOrder["customers"] | AdminOrder["customers"][];
};

const allowedStatuses = new Set(["recibido", "pagado", "entregado", "cancelado"]);
const allowedPaymentMethods = new Set(["efectivo", "transferencia"]);
const allowedResponsables = new Set(["esteban", "gloria"]);

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
        responsable,
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
      deliveryAddress?: string | null;
      observations?: string | null;
      responsable?: string | null;
    };
    const orderId = parseOrderId(body.orderId);
    const status = cleanText(body.status).toLowerCase();
    const requestedPaymentMethod = cleanText(body.paymentMethod).toLowerCase();
    const adminNotes = cleanText(body.adminNotes) || null;
    const deliveryAddress = body.deliveryAddress !== undefined ? (cleanText(body.deliveryAddress) || null) : undefined;
    const observations = body.observations !== undefined ? (cleanText(body.observations) || null) : undefined;
    let responsable: string | null | undefined = undefined;
    if (body.responsable !== undefined) {
      const value = cleanText(body.responsable).toLowerCase();
      if (value && !allowedResponsables.has(value)) {
        return NextResponse.json({ message: "Responsable invalido." }, { status: 400 });
      }
      responsable = value || null;
    }

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

    const orderUpdate: Record<string, unknown> = {
      status,
      payment_method: paymentMethod,
      admin_notes: adminNotes
    };
    if (deliveryAddress !== undefined) orderUpdate.delivery_address = deliveryAddress;
    if (observations !== undefined) orderUpdate.observations = observations;
    if (responsable !== undefined) orderUpdate.responsable = responsable;

    const supabase = getSupabaseAdmin();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .update(orderUpdate)
      .eq("id", orderId)
      .select("id, status, payment_method, admin_notes, delivery_address, observations, responsable")
      .single();

    if (orderError) {
      throw orderError;
    }

    const ventasUpdate: Record<string, unknown> = {
      status,
      payment_method: paymentMethod,
      admin_notes: adminNotes
    };
    if (deliveryAddress !== undefined) ventasUpdate.delivery_address = deliveryAddress;
    if (observations !== undefined) ventasUpdate.observations = observations;
    if (responsable !== undefined) ventasUpdate.responsable = responsable;

    const { error: salesError } = await supabase
      .from("ventas")
      .update(ventasUpdate)
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

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(getAdminCookieName())?.value;

  if (!verifyAdminSessionToken(token)) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      orderId?: number | string;
      items?: Array<{ dessertId?: number | string; quantity?: number }>;
    };
    const orderId = parseOrderId(body.orderId);

    if (!orderId) {
      return NextResponse.json({ message: "ID de pedido invalido." }, { status: 400 });
    }

    const normalizedItems = (Array.isArray(body.items) ? body.items : [])
      .map((item) => ({
        dessertId: parseOrderId(item.dessertId),
        quantity: Number(item.quantity)
      }))
      .filter(
        (item): item is { dessertId: number; quantity: number } =>
          item.dessertId !== null && Number.isInteger(item.quantity) && item.quantity > 0
      );

    if (normalizedItems.length === 0) {
      return NextResponse.json(
        { message: "El pedido debe tener al menos un postre." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, payment_method, admin_notes, delivery_address, observations, customer_id, customers(id, document_number, full_name, email, phone)")
      .eq("id", orderId)
      .single();

    if (orderError) throw orderError;

    const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
    if (!customer) {
      return NextResponse.json({ message: "El pedido no tiene cliente asociado." }, { status: 400 });
    }

    const dessertIds = Array.from(new Set(normalizedItems.map((item) => item.dessertId)));
    const { data: desserts, error: dessertsError } = await supabase
      .from("desserts")
      .select("id, name, price")
      .in("id", dessertIds);

    if (dessertsError) throw dessertsError;

    if (!desserts || desserts.length !== dessertIds.length) {
      return NextResponse.json(
        { message: "Uno de los postres seleccionados no existe." },
        { status: 400 }
      );
    }

    const dessertsById = new Map(desserts.map((dessert) => [Number(dessert.id), dessert]));
    const newItems = normalizedItems.map((item) => {
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
    const totalAmount = newItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Borrar items viejos (las filas de ventas se borran por ON DELETE CASCADE)
    const { error: deleteError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderId);

    if (deleteError) throw deleteError;

    const { data: insertedItems, error: insertError } = await supabase
      .from("order_items")
      .insert(newItems.map((item) => ({ ...item, order_id: orderId })))
      .select("id, dessert_id, dessert_name, quantity, unit_price, subtotal, created_at");

    if (insertError) throw insertError;

    const { error: totalError } = await supabase
      .from("orders")
      .update({ total_amount: totalAmount })
      .eq("id", orderId);

    if (totalError) throw totalError;

    const salesRows = (insertedItems || []).map((item) => ({
      order_id: orderId,
      order_item_id: item.id,
      customer_id: customer.id,
      customer_document: customer.document_number,
      dessert_id: item.dessert_id,
      customer_name: customer.full_name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      dessert_name: item.dessert_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      delivery_address: order.delivery_address,
      observations: order.observations,
      status: order.status,
      payment_method: order.payment_method,
      admin_notes: order.admin_notes
    }));

    const { error: salesError } = await supabase.from("ventas").insert(salesRows);

    if (salesError) throw salesError;

    return NextResponse.json({
      orderId,
      total_amount: totalAmount,
      order_items: insertedItems
    });
  } catch (error) {
    console.error("Admin order items update error", error);
    return NextResponse.json(
      { message: "No se pudieron actualizar los productos del pedido." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(getAdminCookieName())?.value;

  if (!verifyAdminSessionToken(token)) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const orderId = parseOrderId(searchParams.get("orderId"));

    if (!orderId) {
      return NextResponse.json({ message: "ID de pedido invalido." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (error) throw error;

    return NextResponse.json({ message: "Pedido eliminado correctamente." });
  } catch (error) {
    console.error("Admin order delete error", error);
    return NextResponse.json(
      { message: "No se pudo eliminar el pedido." },
      { status: 500 }
    );
  }
}
