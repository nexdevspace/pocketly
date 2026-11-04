import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseCredentials } from "./config";

export async function createSupabaseServerClient() {
  const { url, key } = getSupabaseCredentials();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot set cookies; proxy.ts refreshes sessions.
        }
      },
    },
  });
}

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}
