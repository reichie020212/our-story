"use client";

// Top-level error boundary. global-error replaces the root layout when an
// uncaught error bubbles past it, so it must render its own <html>/<body>.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f0e8",
          color: "#1f1a14",
          fontFamily: "Georgia, 'Times New Roman', serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 440 }}>
          <div
            style={{
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              opacity: 0.6,
              marginBottom: 18,
            }}
          >
            Something went wrong
          </div>
          <h1
            style={{
              fontSize: "40px",
              margin: "0 0 16px",
              letterSpacing: "-0.02em",
            }}
          >
            An unexpected error occurred.
          </h1>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.55,
              opacity: 0.8,
              margin: "0 0 28px",
            }}
          >
            Sorry — something broke on our end. Try again, and if it keeps
            happening, come back in a little while.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: "#1f1a14",
              color: "#f4f0e8",
              border: "none",
              borderRadius: 999,
              padding: "12px 26px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
