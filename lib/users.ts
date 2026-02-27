import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import db from "./db";

interface UserRow {
  id: string;
  name: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const hashed = await bcrypt.hash(password, 12);
  const id = randomUUID();

  try {
    db.prepare(
      "INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)"
    ).run(id, name.trim(), email.toLowerCase().trim(), hashed);
  } catch (err: any) {
    if (err?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw new Error("Email already in use");
    }
    throw err;
  }

  return { id, name: name.trim(), email: email.toLowerCase().trim() };
}

export async function verifyUser(
  email: string,
  password: string
): Promise<User | null> {
  const row = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase().trim()) as UserRow | undefined;

  if (!row) return null;

  const valid = await bcrypt.compare(password, row.password);
  if (!valid) return null;

  return { id: row.id, name: row.name, email: row.email };
}
