import { supabaseBrowser } from "./supabaseBrowser";

export type Profile = {
  id: string; // user_id
  full_name: string | null;
  role: "admin" | "editor" | "approver";
  created_at?: string;
  updated_at?: string;
};

export async function getSessionUser() {
  const sb = supabaseBrowser();
  const { data, error } = await sb.auth.getUser();
  if (error) return { user: null, error };
  return { user: data.user, error: null };
}

export async function signInWithPassword(email: string, password: string) {
  const sb = supabaseBrowser();
  return sb.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  const sb = supabaseBrowser();
  return sb.auth.signOut();
}

export async function fetchMyProfile() {
  const sb = supabaseBrowser();
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) return { profile: null as Profile | null, error: new Error("not_authenticated") };

  const { data, error } = await sb.from("profiles").select("*").eq("id", user.id).single();
  if (error) return { profile: null, error };
  return { profile: data as Profile, error: null };
}

export function canApprove(role: Profile["role"]) {
  return role === "admin" || role === "approver";
}

export function canEdit(role: Profile["role"]) {
  return role === "admin" || role === "editor" || role === "approver";
}
