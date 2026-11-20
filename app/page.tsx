import Link from "next/link";

export default function Home() {
  return <main className="auth"><section className="auth-card">
    <div className="brand" style={{ margin: 0 }}><span className="brand-mark">W</span> WORLDSEED</div>
    <p className="eyebrow" style={{ marginTop: 44 }}>Artificial universe laboratory</p>
    <h1>Study what emerges.</h1>
    <p className="lede">Create worlds, release autonomous agents, and observe the consequences of your rules.</p>
    <div style={{ display: "flex", gap: 10, marginTop: 28 }}><Link className="button" href="/login">Enter the lab</Link><Link className="button secondary" href="/dashboard">View demo</Link></div>
  </section></main>;
}
