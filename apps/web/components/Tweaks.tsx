"use client";

import { useEffect, useState } from "react";

type Theme = "paper" | "dusk" | "ink";
type Density = "cozy" | "normal" | "airy";
type Ads = "visible" | "hidden";
type Accent = "sienna" | "moss" | "sea" | "plum";

type TweakState = {
  theme: Theme;
  density: Density;
  ads: Ads;
  accent: Accent;
};

const ACCENTS: Record<Accent, { a: string; s: string }> = {
  sienna: { a: "oklch(52% 0.14 35)", s: "oklch(92% 0.04 35)" },
  moss: { a: "oklch(52% 0.12 140)", s: "oklch(92% 0.04 140)" },
  sea: { a: "oklch(52% 0.12 220)", s: "oklch(92% 0.04 220)" },
  plum: { a: "oklch(52% 0.14 320)", s: "oklch(92% 0.04 320)" },
};

const DEFAULTS: TweakState = {
  theme: "paper",
  density: "normal",
  ads: "visible",
  accent: "sienna",
};

export function Tweaks() {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<TweakState>(DEFAULTS);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      const data = e.data as { type?: string };
      if (data.type === "__activate_edit_mode") setVisible(true);
      if (data.type === "__deactivate_edit_mode") setVisible(false);
    };
    window.addEventListener("message", handler);
    try {
      window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    } catch {
      /* ignore */
    }
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    const b = document.body;
    b.dataset.theme = state.theme;
    b.dataset.density = state.density;
    b.dataset.ads = state.ads;
    const c = ACCENTS[state.accent];
    document.documentElement.style.setProperty("--accent", c.a);
    document.documentElement.style.setProperty("--accent-soft", c.s);
  }, [state]);

  const update = <K extends keyof TweakState>(key: K, val: TweakState[K]) => {
    const next = { ...state, [key]: val };
    setState(next);
    try {
      window.parent.postMessage(
        { type: "__edit_mode_set_keys", edits: { [key]: val } },
        "*",
      );
    } catch {
      /* ignore */
    }
  };

  if (!visible) return null;

  return (
    <div className="tweaks visible">
      <div className="tweaks-head">
        <h4>Tweaks</h4>
        <span>LIVE</span>
      </div>
      <div className="field">
        <div className="field-label">Theme</div>
        <div className="segmented">
          {(["paper", "dusk", "ink"] as const).map((t) => (
            <button
              key={t}
              className={state.theme === t ? "active" : ""}
              onClick={() => update("theme", t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <div className="field-label">Accent</div>
        <div className="segmented">
          {(Object.keys(ACCENTS) as Accent[]).map((k) => (
            <button
              key={k}
              className={state.accent === k ? "active" : ""}
              onClick={() => update("accent", k)}
              style={
                state.accent === k ? { background: ACCENTS[k].a } : undefined
              }
              title={k}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: ACCENTS[k].a,
                  verticalAlign: "middle",
                  marginRight: 4,
                }}
              ></span>
              {k}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <div className="field-label">Density</div>
        <div className="segmented">
          {(["cozy", "normal", "airy"] as const).map((t) => (
            <button
              key={t}
              className={state.density === t ? "active" : ""}
              onClick={() => update("density", t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <div className="field-label">Ad Slots</div>
        <div className="segmented">
          <button
            className={state.ads === "visible" ? "active" : ""}
            onClick={() => update("ads", "visible")}
          >
            shown
          </button>
          <button
            className={state.ads === "hidden" ? "active" : ""}
            onClick={() => update("ads", "hidden")}
          >
            hidden
          </button>
        </div>
      </div>
    </div>
  );
}
