const { useState: useAppState, useEffect: useAppEffect } = React;

function Footer() {
  return (
    <>
      <div className="ad ad-footer">728 × 90 · Footer Leaderboard</div>
      <footer className="footer">
        <div>
          <div className="brand">
            <span className="dot"></span>
            OurStory
          </div>
          <p>A quiet library for writers who'd rather be read than reposted. Independent, ad-supported, no algorithm.</p>
        </div>
        <div>
          <h5>Read</h5>
          <ul>
            <li>Browse library</li>
            <li>Editor's picks</li>
            <li>Trending</li>
            <li>By genre</li>
          </ul>
        </div>
        <div>
          <h5>Write</h5>
          <ul>
            <li>Start a story</li>
            <li>Submission guide</li>
            <li>Writer's weekly</li>
            <li>Community</li>
          </ul>
        </div>
        <div>
          <h5>About</h5>
          <ul>
            <li><a href="about-developer.html" style={{ color: 'inherit', textDecoration: 'none' }}>The developer</a></li>
            <li><a href="download.html" style={{ color: 'inherit', textDecoration: 'none' }}>Get the app</a></li>
            <li>Ad policy</li>
            <li>Terms</li>
            <li><a href="mailto:redickbutay02@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>Contact</a></li>
          </ul>
        </div>
      </footer>
      <div className="footer-base">
        <span>© 2026 OurStory · developed by <a href="about-developer.html" style={{ color: 'inherit', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}>Red Butay</a></span>
        <span>v1.0 · 1,284 stories · 312 writers</span>
      </div>
    </>
  );
}

function App() {
  const [view, setView] = useAppState(() => localStorage.getItem('os-view') || 'browse');
  const [storyId, setStoryId] = useAppState(() => localStorage.getItem('os-story') || null);
  const [search, setSearch] = useAppState('');

  useAppEffect(() => { localStorage.setItem('os-view', view); }, [view]);
  useAppEffect(() => {
    if (storyId) localStorage.setItem('os-story', storyId);
    else localStorage.removeItem('os-story');
  }, [storyId]);

  const openStory = (id) => {
    setStoryId(id);
    setView('reader');
    window.scrollTo(0, 0);
  };
  const goBack = () => {
    setView('browse');
    window.scrollTo(0, 0);
  };

  const effectiveStoryId = storyId || (STORIES.find(s => s.featured) || STORIES[0]).id;

  return (
    <AuthProvider>
      <Topbar view={view} setView={setView} search={search} setSearch={setSearch} />
      {view === 'browse' && <Browse onRead={openStory} />}
      {view === 'reader' && <Reader storyId={effectiveStoryId} onBack={goBack} onRead={openStory} />}
      {view === 'composer' && <ComposerGate onCancel={goBack} />}
      <Footer />
      <Tweaks />
    </AuthProvider>
  );
}

function ComposerGate({ onCancel }) {
  const { user } = useAuth();
  if (!user) return <GatedNotice action="write" onCancel={onCancel} />;
  return <Composer />;
}

ReactDOM.createRoot(document.getElementById('app')).render(<App />);
