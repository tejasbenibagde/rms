import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { comparePassword, signToken } from "@/lib/auth";

import { LoginSchema } from "@/lib/validations/auth";

export async function POST(request: NextRequest) {
  try {
    const body = LoginSchema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: {
        email: body.email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        isActive: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    const validPassword = await comparePassword(
      body.password,
      user.passwordHash
    );

    if (!validPassword) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          error: "Account is deactivated.",
        },
        {
          status: 403,
        }
      );
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role.name,
    });

    const { passwordHash, ...safeUser } = user;

    const response = NextResponse.json({
      user: safeUser,
    });

    response.cookies.set({
      name: "auth-token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Login failed.",
      },
      {
        status: 500,
      }
    );
  }
}
