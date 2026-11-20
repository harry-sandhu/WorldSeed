"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient } from "../../src/database/browser-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const supabase = createBrowserSupabaseClient();
    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
    if (result.error) setError(result.error.message);
    else if (mode === "signup" && !result.data.session) setMessage("Account created. Check your email to confirm access.");
    else window.location.assign("/dashboard");
    setBusy(false);
  }

  return <main className="auth"><section className="auth-card">
    <div className="brand" style={{ margin: 0 }}><span className="brand-mark">W</span> WorldSeed</div>
    <p className="eyebrow" style={{ marginTop: 42 }}>Access the register</p><h1>{mode === "signin" ? "Sign in" : "Create an account"}</h1>
    <p className="lede">{mode === "signin" ? "Sign in to continue an experiment in progress." : "Create an account to start your first universe."}</p>
    <form onSubmit={submit}><label className="field">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="field">Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="error">{error}</p>}{message && <p style={{ color: "var(--stamp-green)", fontSize: 13 }}>{message}</p>}<button className="button" disabled={busy} type="submit">{busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}</button></form><button className="button secondary" style={{ marginTop: 12 }} onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }} type="button">{mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}</button>
  </section></main>;
}
