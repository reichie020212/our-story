const { useState: useReaderState, useEffect: useReaderEffect, useRef: useReaderRef } = React;

function Reader({ storyId, onBack, onRead }) {
  const story = STORIES.find(s => s.id === storyId) || STORIES[0];
  const genre = GENRES.find(g => g.id === story.genre);
  const [liked, setLiked] = useReaderState(false);
  const [bookmarked, setBookmarked] = useReaderState(false);
  const [clapped, setClapped] = useReaderState(false);
  const bodyRef = useReaderRef(null);

  // Reading progress ribbon
  useReaderEffect(() => {
    const ribbon = document.getElementById('ribbon');
    const handler = () => {
      const doc = document.documentElement;
      const scrolled = window.scrollY;
      const total = doc.scrollHeight - window.innerHeight;
      const pct = Math.min(100, Math.max(0, (scrolled / total) * 100));
      if (ribbon) ribbon.style.width = pct + '%';
    };
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => {
      window.removeEventListener('scroll', handler);
      if (ribbon) ribbon.style.width = '0';
    };
  }, [storyId]);

  const body = story.body || [
    `(Preview) ${story.synopsis}`,
    "This story's full text hasn't been written yet in the demo — but its shape is here: the title, the cover, the voice. When the author hits publish, every word will appear in this exact reading view, with the same type, margins, and ribbon-at-the-top progress indicator you're using now.",
    "Consider this the room where words will arrive.",
  ];

  const date = new Date(story.published).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const related = STORIES.filter(s => s.id !== story.id && s.genre === story.genre).slice(0, 3);

  const midIndex = Math.floor(body.length / 2);

  return (
    <article className="reader" data-screen-label="03 Reader">
      <button className="back" onClick={onBack}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        back to library
      </button>
      <div className="genre-line" style={{color: genre.color}}>
        <span className="dot"></span>
        {genre.label} · {story.minutes} min read
      </div>
      <h1>{story.title}</h1>
      <p className="synopsis">{story.synopsis}</p>
      <div className="author-row">
        <div className="avatar">{story.authorInitial}</div>
        <div className="author-meta">
          <b>{story.author}</b>
          <span>{date} · {story.views.toLocaleString()} reads</span>
        </div>
        <div className="read-actions">
          <button className={`icon-btn ${liked ? 'active' : ''}`} title="Like" onClick={() => setLiked(!liked)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.5 1-1a5.5 5.5 0 000-7.8z"/></svg>
          </button>
          <button className={`icon-btn ${bookmarked ? 'active' : ''}`} title="Bookmark" onClick={() => setBookmarked(!bookmarked)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/></svg>
          </button>
          <button className="icon-btn" title="Share">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>
          </button>
        </div>
      </div>
      <div className="reader-body" ref={bodyRef}>
        {body.map((item, i) => {
          const para = String(item);
          const isHeartbeat = /^duh dum/i.test(para) && para.length < 40;
          if (isHeartbeat) return <p key={i} className="heartbeat-line">{para}</p>;
          if (i === midIndex) {
            return (
              <React.Fragment key={i}>
                <p>{para}</p>
                <div className="ad ad-midstory">300 × 250 · Mid-Story Ad</div>
              </React.Fragment>
            );
          }
          return <p key={i}>{para}</p>;
        })}
      </div>
      <div className="reader-footer">
        <div className="end-mark">· · ·</div>
        <div className="applause">
          <button className={clapped ? 'active' : ''} onClick={() => setClapped(!clapped)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={clapped ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.5 1-1a5.5 5.5 0 000-7.8z"/></svg>
            {clapped ? story.likes + 1 : story.likes} claps
          </button>
          <button>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Leave a note
          </button>
          <button>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
            Share
          </button>
        </div>
        {related.length > 0 && (
          <div style={{marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--rule)'}}>
            <h4 style={{fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-mute)', margin: '0 0 14px'}}>
              More in {genre.label}
            </h4>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16}}>
              {related.map(r => (
                <div key={r.id} onClick={() => { onRead(r.id); window.scrollTo(0, 0); }}
                  style={{cursor: 'pointer', padding: '12px 0', borderTop: '1px solid var(--rule-soft)'}}>
                  <div style={{fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500, lineHeight: 1.2, marginBottom: 4}}>{r.title}</div>
                  <div style={{fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-mute)', letterSpacing: '0.05em'}}>{r.author} · {r.minutes} min</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

window.Reader = Reader;
