import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Consulta mínima para mantener activa la base de datos de Supabase
// (el plan gratis pausa el proyecto tras 7 días de inactividad).
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Escritura real: registra el ping en una tabla dedicada (upsert).
    // Una ESCRITURA genera actividad de base de datos que Supabase sí cuenta,
    // a diferencia de una simple lectura.
    const { error: writeError } = await supabase
      .from("keepalive")
      .upsert({ id: 1, last_ping: new Date().toISOString() }, { onConflict: "id" });

    if (writeError) {
      throw writeError;
    }

    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (error) {
    console.error("Keepalive error", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "unknown" }, { status: 500 });
  }
}
