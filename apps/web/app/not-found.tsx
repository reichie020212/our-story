import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid-wrap" style={{ gridTemplateColumns: "1fr" }}>
      <div style={{ padding: "120px 20px", textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
            marginBottom: 18,
          }}
        >
          404 · Not found
        </div>
        <h1
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(36px, 6vw, 64px)",
            margin: "0 0 16px",
            letterSpacing: "-0.02em",
          }}
        >
          This page wandered off.
        </h1>
        <p
          style={{
            color: "var(--ink-soft)",
            fontSize: 17,
            margin: "0 0 28px",
            maxWidth: 440,
            marginInline: "auto",
            lineHeight: 1.55,
          }}
        >
          The story or page you&apos;re looking for isn&apos;t here — it may
          have been unpublished, moved, or never existed.
        </p>
        <Link href="/" className="btn">
          Back to the library
        </Link>
      </div>
    </div>
  );
}
