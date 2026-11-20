"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient } from "../../src/database/browser-client";

export default function WorldBuilderPage() {
  const [name, setName] = useState("The First Civilization");
  const [description, setDescription] = useState("A controlled study of cooperation under resource scarcity.");
  const [width, setWidth] = useState("64");
  const [height, setHeight] = useState("64");
  const [agents, setAgents] = useState("120");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function createUniverse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in before creating a universe.");
      const user = auth.user;
      const profile = await supabase.from("profiles").upsert({ id: user.id, display_name: user.email?.split("@")[0] ?? "Researcher" }).select("id").single();
      if (profile.error) throw profile.error;
      const workspace = await supabase.from("workspaces").insert({ name: `${name} workspace`, created_by: user.id }).select("id").single();
      if (workspace.error) throw workspace.error;
      const membership = await supabase.from("workspace_members").insert({ workspace_id: workspace.data.id, user_id: user.id, role: "owner" });
      if (membership.error) throw membership.error;
      const universe = await supabase.from("universes").insert({ workspace_id: workspace.data.id, created_by: user.id, name, description, config: { version: 1, world: { width: Number(width), height: Number(height), initialAgents: Number(agents), terrain: "temperate", climate: "stable", resources: { food: 10000, water: 10000, energy: 3000 } } } }).select("id").single();
      if (universe.error) throw universe.error;
      setMessage(`Universe created: ${universe.data.id}`);
    } catch (cause) {
      const details = typeof cause === "object" && cause !== null && "message" in cause ? String(cause.message) : cause instanceof Error ? cause.message : "Unable to create universe.";
      setError(details);
    } finally { setBusy(false); }
  }

  return <main className="main" style={{ maxWidth: 920, margin: "0 auto" }}><div className="topline"><div><Link className="tag" href="/dashboard">← Back to overview</Link><div className="eyebrow" style={{ marginTop: 28 }}>World builder / 01</div><h1>Define a new universe.</h1><p className="lede">Set the initial conditions. The simulation engine will determine what follows.</p></div></div><form className="card" onSubmit={createUniverse}><div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}><label className="field">Universe name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label className="field">Initial population<input required min="1" max="100000" type="number" value={agents} onChange={(event) => setAgents(event.target.value)} /></label><label className="field">World width<input required min="8" max="512" type="number" value={width} onChange={(event) => setWidth(event.target.value)} /></label><label className="field">World height<input required min="8" max="512" type="number" value={height} onChange={(event) => setHeight(event.target.value)} /></label></div><label className="field">Research note<textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} style={{ resize: "vertical", border: "1px solid var(--line)", borderRadius: 4, padding: 12, background: "var(--bg)", color: "var(--text)" }} /></label>{error && <p className="error">{error}</p>}{message && <p style={{ color: "var(--cyan)", fontSize: 13 }}>{message}</p>}<button className="button" disabled={busy} type="submit">{busy ? "Creating universe…" : "Create universe"}</button></form></main>;
}
