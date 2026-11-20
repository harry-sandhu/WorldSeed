import Link from "next/link";

export default function Home() {
  return <main className="auth"><section className="auth-card">
    <div className="brand" style={{ margin: 0 }}><span className="brand-mark">W</span> WorldSeed</div>
    <p className="eyebrow" style={{ marginTop: 44 }}>A register of artificial worlds</p>
    <h1>Set the rules. Watch what a population does with them.</h1>
    <p className="lede">Define a world, release a seeded population into it, and keep the record — who was born, who starved, and what was left standing when it ended.</p>
    <div style={{ display: "flex", gap: 10, marginTop: 28 }}><Link className="button" href="/login">Open the register</Link><Link className="button secondary" href="/dashboard">See an example</Link></div>
  </section></main>;
}
