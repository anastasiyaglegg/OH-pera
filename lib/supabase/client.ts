import {createBrowserClient} from '@supabase/ssr';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function supabaseConfigured(){
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabaseBrowserClient(){
  if(!supabaseConfigured())return null;
  browserClient??=createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return browserClient;
}
