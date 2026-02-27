import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./db";

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
  const sql = await getDb();
  const hashed = await bcrypt.hash(password, 12);
  const id = randomUUID();

  try {
    await sql`
      INSERT INTO users (id, name, email, password)
      VALUES (${id}, ${name.trim()}, ${email.toLowerCase().trim()}, ${hashed})
    `;
  } catch (err: any) {
    if (err.code === "23505") throw new Error("Email already in use");
    throw err;
  }

  return { id, name: name.trim(), email: email.toLowerCase().trim() };
}

export async function verifyUser(
  email: string,
  password: string
): Promise<User | null> {
  const sql = await getDb();
  const [row] = await sql<{ id: string; name: string; email: string; password: string }[]>`
    SELECT id, name, email, password FROM users
    WHERE email = ${email.toLowerCase().trim()}
  `;

  if (!row) return null;
  const valid = await bcrypt.compare(password, row.password);
  if (!valid) return null;

  return { id: row.id, name: row.name, email: row.email };
}
