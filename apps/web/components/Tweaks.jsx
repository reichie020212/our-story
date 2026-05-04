const { useState: useTweakState, useEffect: useTweakEffect } = React;

function Tweaks() {
  const [visible, setVisible] = useTweakState(false);
  const [state, setState] = useTweakState(() => {
    try {
      return JSON.parse(JSON.stringify(window.TWEAK_DEFAULTS));
    } catch { return { theme: 'paper', density: 'normal', ads: 'visible', accent: 'sienna' }; }
  });

  useTweakEffect(() => {
    const handler = (e) => {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') setVisible(true);
      if (e.data.type === '__deactivate_edit_mode') setVisible(false);
    };
    window.addEventListener('message', handler);
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch {}
    return () => window.removeEventListener('message', handler);
  }, []);

  // Apply state to DOM
  useTweakEffect(() => {
    const b = document.body;
    b.dataset.theme = state.theme;
    b.dataset.density = state.density;
    b.dataset.ads = state.ads;
    const accents = {
      sienna: { a: 'oklch(52% 0.14 35)',  s: 'oklch(92% 0.04 35)' },
      moss:   { a: 'oklch(52% 0.12 140)', s: 'oklch(92% 0.04 140)' },
      sea:    { a: 'oklch(52% 0.12 220)', s: 'oklch(92% 0.04 220)' },
      plum:   { a: 'oklch(52% 0.14 320)', s: 'oklch(92% 0.04 320)' },
    };
    const c = accents[state.accent] || accents.sienna;
    document.documentElement.style.setProperty('--accent', c.a);
    document.documentElement.style.setProperty('--accent-soft', c.s);
  }, [state]);

  const update = (key, val) => {
    const next = { ...state, [key]: val };
    setState(next);
    try {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: val } }, '*');
    } catch {}
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
          {['paper','dusk','ink'].map(t => (
            <button key={t} className={state.theme === t ? 'active' : ''} onClick={() => update('theme', t)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <div className="field-label">Accent</div>
        <div className="segmented">
          {[
            ['sienna', 'oklch(52% 0.14 35)'],
            ['moss', 'oklch(52% 0.12 140)'],
            ['sea', 'oklch(52% 0.12 220)'],
            ['plum', 'oklch(52% 0.14 320)'],
          ].map(([k, c]) => (
            <button key={k} className={state.accent === k ? 'active' : ''} onClick={() => update('accent', k)}
              style={state.accent === k ? { background: c } : {}}
              title={k}>
              <span style={{display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: c, verticalAlign: 'middle', marginRight: 4}}></span>
              {k}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <div className="field-label">Density</div>
        <div className="segmented">
          {['cozy','normal','airy'].map(t => (
            <button key={t} className={state.density === t ? 'active' : ''} onClick={() => update('density', t)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <div className="field-label">Ad Slots</div>
        <div className="segmented">
          <button className={state.ads === 'visible' ? 'active' : ''} onClick={() => update('ads', 'visible')}>shown</button>
          <button className={state.ads === 'hidden' ? 'active' : ''} onClick={() => update('ads', 'hidden')}>hidden</button>
        </div>
      </div>
    </div>
  );
}

window.Tweaks = Tweaks;
