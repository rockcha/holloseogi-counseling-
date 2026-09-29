import { supabase } from "./supabase";

export async function fetchBackgroundTheme(ownerId: string): Promise<string> {
  if (!supabase) return "default";
  const { data, error } = await supabase
    .from("user_preferences")
    .select("background_theme")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  return data?.background_theme ?? "default";
}

export async function saveBackgroundTheme(ownerId: string, theme: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase
    .from("user_preferences")
    .upsert({ owner_id: ownerId, background_theme: theme }, { onConflict: "owner_id" })
    .select("background_theme")
    .single();
  if (error) throw error;
}
