import { NextRequest, NextResponse } from "next/server";
import {
  createAdminSessionToken,
  getAdminCookieName,
  getAdminSessionMaxAge
} from "@/lib/admin-auth";

export const runtime = "nodejs";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, number[]>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    attempts.set(ip, recent);
    return true;
  }
  attempts.set(ip, [...recent, now]);
  return false;
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(getClientIp(request))) {
      return NextResponse.json(
        { message: "Demasiados intentos. Espera 15 minutos." },
        { status: 429 }
      );
    }

    const { username, password } = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const adminUser = process.env.ADMIN_USER;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUser || !adminPassword) {
      return NextResponse.json(
        { message: "Faltan ADMIN_USER o ADMIN_PASSWORD en el servidor." },
        { status: 500 }
      );
    }

    if (username !== adminUser || password !== adminPassword) {
      return NextResponse.json(
        { message: "Usuario o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ message: "Sesión iniciada." });
    response.cookies.set({
      name: getAdminCookieName(),
      value: createAdminSessionToken(adminUser),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: getAdminSessionMaxAge(),
      path: "/"
    });

    return response;
  } catch (error) {
    console.error("Admin login error", error);
    return NextResponse.json(
      { message: "No se pudo iniciar sesión." },
      { status: 500 }
    );
  }
}
