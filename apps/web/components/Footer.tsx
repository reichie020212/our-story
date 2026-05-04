import Link from "next/link";

export function Footer() {
  return (
    <>
      <div className="ad ad-footer">728 × 90 · Footer Leaderboard</div>
      <footer className="footer">
        <div>
          <div className="brand">
            <span className="dot"></span>
            OurStory
          </div>
          <p>
            A quiet library for writers who&apos;d rather be read than reposted.
            Independent, ad-supported, no algorithm.
          </p>
        </div>
        <div>
          <h5>Read</h5>
          <ul>
            <li>Browse library</li>
            <li>Editor&apos;s picks</li>
            <li>Trending</li>
            <li>By genre</li>
          </ul>
        </div>
        <div>
          <h5>Write</h5>
          <ul>
            <li>Start a story</li>
            <li>Submission guide</li>
            <li>Writer&apos;s weekly</li>
            <li>Community</li>
          </ul>
        </div>
        <div>
          <h5>About</h5>
          <ul>
            <li>
              <Link
                href="/about-developer"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                The developer
              </Link>
            </li>
            <li>
              <Link
                href="/download"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                Get the app
              </Link>
            </li>
            <li>Ad policy</li>
            <li>Terms</li>
            <li>
              <a
                href="mailto:redickbutay02@gmail.com"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                Contact
              </a>
            </li>
          </ul>
        </div>
      </footer>
      <div className="footer-base">
        <span>
          © 2026 OurStory · developed by{" "}
          <Link
            href="/about-developer"
            style={{
              color: "inherit",
              textDecoration: "underline dotted",
              textUnderlineOffset: "3px",
            }}
          >
            Red Butay
          </Link>
        </span>
        <span>v1.0 · 1,284 stories · 312 writers</span>
      </div>
    </>
  );
}
