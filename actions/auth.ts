"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { isStaffRole } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export type FormState = { error?: string; success?: string } | undefined;

function safeNext(next: FormDataEntryValue | null, fallback: string) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : fallback;
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Please enter your email and password." };

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return { error: "Invalid email or password." };
  }

  if (!user.active) return { error: "Your account has been suspended. Please contact support." };

  await createSession(user);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const staff = isStaffRole(user.role);
  if (staff) await logActivity(user, "login", "session", "Signed in to the dashboard");
  let next = safeNext(formData.get("next"), staff ? "/admin" : "/account");
  if (next.startsWith("/admin") && !staff) next = "/account";
  redirect(next);
}

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (name.length < 2) return { error: "Please enter your full name." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const exists = await db.user.findUnique({ where: { email } });
  if (exists) return { error: "An account with this email already exists." };

  const user = await db.user.create({
    data: { name, email, password: await bcrypt.hash(password, 10) },
  });
  await createSession(user);
  redirect(safeNext(formData.get("next"), "/account"));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
