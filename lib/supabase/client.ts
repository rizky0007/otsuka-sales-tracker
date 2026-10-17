
import { createBrowserClient } from "@supabase/ssr";

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Environment Supabase belum lengkap. Periksa NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  supabaseClient = createBrowserClient(
    supabaseUrl,
    supabaseKey
  );

  return supabaseClient;
}

// Kompatibilitas untuk halaman yang memakai named import.
export { createClient as createSupabaseClient };

// Kompatibilitas untuk Sidebar yang memakai default import.
// Client dibuat saat properti Supabase digunakan.
const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_target, property) {
    const client = createClient();
    const value = Reflect.get(client, property, client);

    return typeof value === "function"
      ? value.bind(client)
      : value;
  },
});

export default supabase;
