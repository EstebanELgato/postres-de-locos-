import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Consulta mínima para mantener activa la base de datos de Supabase
// (el plan gratis pausa el proyecto tras 7 días de inactividad).
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("desserts").select("id").limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (error) {
    console.error("Keepalive error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
