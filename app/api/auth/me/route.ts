import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        {
          status: 401,
        }
      );
    }

    const payload = await verifyToken(token);

    return NextResponse.json({
      authenticated: true,
      user: payload,
    });
  } catch (error) {
    console.error("[auth-me] Error:", error);
    return NextResponse.json(
      {
        authenticated: false,
        error: "Invalid token",
      },
      {
        status: 401,
      }
    );
  }
}
