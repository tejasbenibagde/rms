import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface JwtPayload extends JWTPayload {
    userId: string;
    email: string;
    role: string;
}

import bcrypt from "bcryptjs";

const secret = process.env.JWT_SECRET || "dev-secret-key";

const secretKey = new TextEncoder().encode(secret);

export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
}

export async function hashPassword(password: string) {
    return bcrypt.hash(password, 12);
}

export async function comparePassword(
    password: string,
    hash: string
) {
    return bcrypt.compare(password, hash);
}

export async function signToken(payload: JwtPayload) {
    return await new SignJWT(payload)
        .setProtectedHeader({
            alg: "HS256",
        })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(secretKey);
}

export async function verifyToken(token: string) {
    const { payload } = await jwtVerify(token, secretKey);

    return payload as JwtPayload;
}
