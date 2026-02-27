import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/users";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const user = await createUser(name, email, password);
    return NextResponse.json({ id: user.id, name: user.name, email: user.email });
  } catch (err: any) {
    const message = err?.message ?? "Failed to create account";
    const status = message === "Email already in use" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
