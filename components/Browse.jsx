const { useState, useMemo, useEffect } = React;

function Topbar({ view, setView, search, setSearch }) {
  const auth = useAuth();
  const onWriteClick = () => {
    if (auth.user) setView('composer');
    else auth.setModal({ mode: 'signup', reason: 'write' });
  };
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <span className="dot"></span>
          OurStory
          <em>original stories, carefully kept</em>
        </div>
        <div className="search" role="search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
          </svg>
          <input
            placeholder="Search stories, authors, tags…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <nav className="navlinks">
          <button className={view === 'browse' ? 'active' : ''} onClick={() => setView('browse')}>Browse</button>
          <button className={view === 'reader' ? 'active' : ''} onClick={() => setView('reader')}>Reading</button>
          <button className={view === 'composer' ? 'active' : ''} onClick={onWriteClick}>Write</button>
        </nav>
        <UserMenu />
      </div>
    </header>
  );
}

function Hero({ onRead }) {
  const featured = STORIES.find(s => s.featured);
  const genre = GENRES.find(g => g.id === featured.genre);
  return (
    <section className="hero" data-screen-label="01 Hero">
      <div>
        <div className="eyebrow">
          <span className="pulse"></span>
          Editor's Pick · This Week
        </div>
        <h1>
          A home for <em>original</em><br/>
          stories, carefully kept.
        </h1>
        <p className="lede">
          OurStory is a quiet library for writers who'd rather be read than reposted.
          Save your drafts, share what's ready, and let readers find their next favorite.
        </p>
        <div className="hero-stats">
          <div className="stat"><span className="num">1,284</span><span className="lbl">Stories</span></div>
          <div className="stat"><span className="num">312</span><span className="lbl">Writers</span></div>
          <div className="stat"><span className="num">48k</span><span className="lbl">Monthly Reads</span></div>
        </div>
      </div>
      <article className="featured-card">
        <div className="heartbeat">
          <span className="dot"></span>
          Live Read
        </div>
        <span className="tag" style={{color: genre.color, background: `color-mix(in srgb, ${genre.color} 12%, transparent)`}}>
          {genre.label} · Flash Fiction
        </span>
        <h3>{featured.title}</h3>
        <p className="snippet">
          "{featured.synopsis}"
        </p>
        <div className="byline">
          <span>By <b>{featured.author}</b></span>
          <span>{featured.minutes} min read · {featured.views.toLocaleString()} reads</span>
        </div>
        <button className="btn read-btn" onClick={() => onRead(featured.id)}>
          Read the story
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </button>
      </article>
    </section>
  );
}

function Filters({ genre, setGenre, length, setLength, sort, setSort, activeTag, setActiveTag, count }) {
  return (
    <div className="filter-bar">
      <div className="filter-title">
        <h2>Browse the library</h2>
        <span className="count">{count} stories · updated today</span>
      </div>
      <div className="filters">
        <div className="filter-group">
          <span className="label">Genre</span>
          <button className={`chip ${genre === 'all' ? 'active' : ''}`} onClick={() => setGenre('all')}>All</button>
          {GENRES.map(g => (
            <button key={g.id}
              className={`chip ${genre === g.id ? 'active' : ''}`}
              onClick={() => setGenre(g.id)}
              style={genre === g.id ? { background: g.color, borderColor: g.color, color: '#fff' } : { color: g.color }}>
              <span className="dot" style={{background: g.color}}></span>
              {g.label}
            </button>
          ))}
        </div>
        <div className="sep"></div>
        <div className="filter-group">
          <span className="label">Length</span>
          <button className={`chip ${length === 'all' ? 'active' : ''}`} onClick={() => setLength('all')}>Any</button>
          {LENGTHS.map(l => (
            <button key={l.id}
              className={`chip ${length === l.id ? 'active' : ''}`}
              onClick={() => setLength(l.id)}
              title={l.sub}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="sep"></div>
        <div className="filter-group" style={{marginLeft: 'auto'}}>
          <span className="label">Sort</span>
          <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="recent">Most recent</option>
            <option value="popular">Most read</option>
            <option value="loved">Most loved</option>
            <option value="shortest">Shortest first</option>
          </select>
        </div>
      </div>
      {activeTag && (
        <div style={{fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-mute)', letterSpacing: '0.05em'}}>
          Filtering by tag: <b style={{color: 'var(--accent)'}}>#{activeTag}</b>
          <button onClick={() => setActiveTag(null)} style={{marginLeft: 8, color: 'var(--ink-mute)', textDecoration: 'underline'}}>clear</button>
        </div>
      )}
    </div>
  );
}

function StoryCard({ story, onRead, onTag }) {
  const genre = GENRES.find(g => g.id === story.genre);
  const length = LENGTHS.find(l => l.id === story.length);
  const date = new Date(story.published).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <article className="story-card" style={{'--genre-color': genre.color}} onClick={() => onRead(story.id)}>
      <div className="meta-row">
        <span className="genre"><span className="dot"></span>{genre.label}</span>
        <span>{length.label} · {story.minutes} min</span>
      </div>
      <h3>{story.title}</h3>
      <p className="excerpt">{story.synopsis}</p>
      <div className="tags">
        {story.tags.slice(0, 3).map(t => (
          <span key={t} onClick={(e) => { e.stopPropagation(); onTag(t); }} style={{cursor: 'pointer'}}>#{t}</span>
        ))}
      </div>
      <div className="footer">
        <span>By <b style={{color: 'var(--ink)', fontWeight: 500}}>{story.author}</b> · {date}</span>
        <div className="stats">
          <span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {story.views > 999 ? (story.views/1000).toFixed(1)+'k' : story.views}
          </span>
          <span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.5 1-1a5.5 5.5 0 000-7.8z"/></svg>
            {story.likes}
          </span>
        </div>
      </div>
    </article>
  );
}

function Sidebar({ onTag, onRead }) {
  const trending = [...STORIES].sort((a,b) => b.views - a.views).slice(0, 5);
  return (
    <aside className="sidebar">
      <div className="ad ad-sidebar">300 × 600 · Medium Rectangle</div>
      <div className="panel">
        <h4>Trending this week</h4>
        <div className="trending">
          {trending.map((s, i) => (
            <div className="item" key={s.id} onClick={() => onRead(s.id)}>
              <span className="rank">0{i+1}</span>
              <div>
                <h5>{s.title}</h5>
                <span className="by">{s.author} · {s.views > 999 ? (s.views/1000).toFixed(1)+'k' : s.views} reads</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <h4>Popular tags</h4>
        <div className="tag-cloud">
          {TRENDING_TAGS.map(t => (
            <button key={t} onClick={() => onTag(t)}>#{t}</button>
          ))}
        </div>
      </div>
      <div className="panel" style={{background: 'var(--accent-soft)', borderColor: 'var(--accent)'}}>
        <h4 style={{color: 'var(--accent)'}}>Writing this week?</h4>
        <p style={{fontSize: 13, margin: '0 0 12px', color: 'var(--ink-soft)', lineHeight: 1.5}}>
          Every Sunday we publish a reader-voted short from the library. Submit your draft by Friday.
        </p>
        <button className="btn" style={{background: 'var(--accent)', color: 'var(--accent-ink)'}}>Submit a story</button>
      </div>
    </aside>
  );
}

function Browse({ onRead }) {
  const [genre, setGenre] = useState('all');
  const [length, setLength] = useState('all');
  const [sort, setSort] = useState('recent');
  const [activeTag, setActiveTag] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = STORIES.filter(s => !s.featured || true);
    if (genre !== 'all') list = list.filter(s => s.genre === genre);
    if (length !== 'all') list = list.filter(s => s.length === length);
    if (activeTag) list = list.filter(s => s.tags.includes(activeTag));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q) ||
        s.synopsis.toLowerCase().includes(q) ||
        s.tags.some(t => t.includes(q))
      );
    }
    const sorters = {
      recent: (a,b) => new Date(b.published) - new Date(a.published),
      popular: (a,b) => b.views - a.views,
      loved: (a,b) => b.likes - a.likes,
      shortest: (a,b) => a.minutes - b.minutes,
    };
    return [...list].sort(sorters[sort]);
  }, [genre, length, sort, activeTag, search]);

  // Insert inline ad after every 4 cards
  const withAds = [];
  filtered.forEach((s, i) => {
    withAds.push({ kind: 'card', data: s });
    if ((i + 1) % 4 === 0 && i < filtered.length - 1) {
      withAds.push({ kind: 'ad', id: 'inline-' + i });
    }
  });

  return (
    <>
      <Hero onRead={onRead} />
      <div className="ad ad-leaderboard">728 × 90 · Leaderboard</div>
      <Filters
        genre={genre} setGenre={setGenre}
        length={length} setLength={setLength}
        sort={sort} setSort={setSort}
        activeTag={activeTag} setActiveTag={setActiveTag}
        count={filtered.length}
      />
      <div className="grid-wrap" data-screen-label="02 Library">
        <div className="story-grid">
          {withAds.map((item, i) =>
            item.kind === 'card'
              ? <StoryCard key={item.data.id} story={item.data} onRead={onRead} onTag={setActiveTag} />
              : <div key={item.id} className="ad ad-inline" style={{gridColumn: '1 / -1'}}>728 × 90 · In-Feed Ad Slot</div>
          )}
          {filtered.length === 0 && (
            <div style={{gridColumn: '1/-1', padding: '60px 20px', textAlign: 'center', color: 'var(--ink-mute)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18}}>
              No stories match those filters yet. Try clearing one.
            </div>
          )}
        </div>
        <Sidebar onTag={setActiveTag} onRead={onRead} />
      </div>
    </>
  );
}

window.Browse = Browse;
window.Topbar = Topbar;
