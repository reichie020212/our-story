const { useState: useCompState, useEffect: useCompEffect } = React;

function Composer() {
  const auth = (typeof useAuth === 'function') ? useAuth() : { user: null };
  const user = auth.user;
  const [title, setTitle] = useCompState('');
  const [synopsis, setSynopsis] = useCompState('');
  const [body, setBody] = useCompState('');
  const [genre, setGenre] = useCompState('literary');
  const [length, setLength] = useCompState('flash');
  const [tags, setTags] = useCompState(['memory', 'first-person']);
  const [tagInput, setTagInput] = useCompState('');
  const [status, setStatus] = useCompState('draft'); // draft / saving / saved / published
  const [activeFormat, setActiveFormat] = useCompState({ bold: false, italic: false });

  const saveDraft = () => {
    if (!title && !body) return;
    setStatus('saving');
    // Backend wiring (commit 9) will call PATCH /api/v1/stories/:id here.
    setTimeout(() => setStatus('saved'), 600);
  };

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(wordCount / 220));

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
      if (!tags.includes(t)) setTags([...tags, t]);
      setTagInput('');
      e.preventDefault();
    }
  };

  const TB = ({ cmd, children, title }) => (
    <button title={title}
      className={activeFormat[cmd] ? 'active' : ''}
      onClick={() => setActiveFormat({...activeFormat, [cmd]: !activeFormat[cmd]})}>
      {children}
    </button>
  );

  return (
    <section className="composer" data-screen-label="04 Composer">
      <div className="composer-head">
        <h2>Write a <em>new</em> story.</h2>
        <div className="actions">
          {user && (
            <span style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-soft)', marginRight: 6}}>
              <span className="user-avatar">{user.initial}</span>
              <span>as <b style={{color: 'var(--ink)', fontWeight: 500}}>{user.name}</b></span>
            </span>
          )}
          <span className={`status-pill ${status === 'saved' ? 'saved' : ''}`}>
            {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : status === 'published' ? 'Published ✓' : 'Draft'}
          </span>
          <button className="btn-ghost btn" onClick={saveDraft}>Save draft</button>
          <button className="btn-ghost btn">Preview</button>
          <button className="btn" onClick={() => setStatus('published')}>
            {status === 'published' ? 'Published ✓' : 'Publish'}
          </button>
        </div>
      </div>
      <div className="composer-grid">
        <div className="editor">
          <div className="toolbar">
            <TB cmd="bold" title="Bold"><b>B</b></TB>
            <TB cmd="italic" title="Italic"><i>I</i></TB>
            <TB cmd="underline" title="Underline"><u>U</u></TB>
            <div className="tb-sep"></div>
            <TB cmd="h1" title="Heading">H1</TB>
            <TB cmd="h2" title="Sub-heading">H2</TB>
            <TB cmd="quote" title="Blockquote">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h6l3-6V5H3v10h6l-3 6zm12 0h6l3-6V5h-9v10h6l-3 6z"/></svg>
            </TB>
            <TB cmd="list" title="Bulleted list">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/><path d="M9 6h12M9 12h12M9 18h12"/></svg>
            </TB>
            <div className="tb-sep"></div>
            <TB cmd="link" title="Link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/></svg>
            </TB>
            <div style={{marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-mute)', alignSelf: 'center'}}>
              {wordCount} words · {readTime} min read
            </div>
          </div>
          <input
            className="title"
            placeholder="Title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <textarea
            className="synopsis"
            placeholder="One-sentence synopsis (shown on the story card)"
            value={synopsis}
            onChange={e => setSynopsis(e.target.value)}
            rows={2}
          />
          <textarea
            className="body"
            placeholder={`Start with a sentence that a reader can't walk away from.\n\nFor example:\n"One ordinary day, I was playing with my friends when a blinding light came out of nowhere and consumed me…"`}
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={18}
          />
        </div>
        <aside className="composer-side">
          <div className="side-panel">
            <h4>Classification</h4>
            <div className="field">
              <label>Genre</label>
              <select value={genre} onChange={e => setGenre(e.target.value)}>
                {GENRES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Length</label>
              <select value={length} onChange={e => setLength(e.target.value)}>
                {LENGTHS.map(l => <option key={l.id} value={l.id}>{l.label} — {l.sub}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Tags</label>
              <div className="tag-input-wrap">
                {tags.map(t => (
                  <span key={t} className="tag-pill">
                    #{t}
                    <button onClick={() => setTags(tags.filter(x => x !== t))}>×</button>
                  </span>
                ))}
                <input
                  placeholder={tags.length === 0 ? 'type + enter' : ''}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                />
              </div>
            </div>
          </div>
          <div className="side-panel">
            <h4>Visibility</h4>
            <div className="field">
              <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                <input type="radio" name="vis" defaultChecked /> Public — anyone can read
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                <input type="radio" name="vis" /> Unlisted — only with link
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                <input type="radio" name="vis" /> Private — only you
              </label>
            </div>
          </div>
          <div className="side-panel" style={{background: 'var(--bg-sunk)', borderStyle: 'dashed'}}>
            <h4 style={{marginBottom: 8}}>Danger Zone</h4>
            <button style={{fontSize: 12, color: 'var(--ink-mute)', textDecoration: 'underline'}}>Delete draft</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

window.Composer = Composer;
