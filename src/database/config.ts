function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function supabasePublicConfig(): { url: string; publishableKey: string } {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  };
}

export function supabaseConfig(): { url: string; publishableKey: string; secretKey: string } {
  return { ...supabasePublicConfig(), secretKey: required("SUPABASE_SECRET_KEY") };
}
