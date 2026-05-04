import type { Metadata } from "next";
import type { CSSProperties } from "react";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Get the OurStory app",
  description:
    "OurStory Mobile brings every story in the library to your phone — offline reading, night-mode typography, and the same account you use on the web.",
};

const genreVar = (color: string): CSSProperties =>
  ({ ["--genre" as string]: color }) as CSSProperties;

export default function DownloadPage() {
  return (
    <main className={styles.wrap}>
      <section className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>
            <span className={styles.pulse}></span>Now on iOS &amp; Android
          </div>
          <h1>
            Your library,
            <br />
            <em>in your pocket.</em>
          </h1>
          <p className={styles.lede}>
            OurStory Mobile brings every story in the library to your phone —
            with offline reading, night-mode typography, and the same account
            you use on the web. Write a draft on the train, publish it when
            you get home.
          </p>
          <div className={styles.stores}>
            <a className={styles.storeBtn} href="#">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.6 13c0-2.3 1.9-3.4 2-3.4-1.1-1.6-2.8-1.8-3.4-1.8-1.5-.2-2.8.9-3.5.9-.8 0-1.9-.8-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.1 1.2 9.5.8 1.1 1.7 2.4 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.1.7 1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.7-1-2.7-4.1zM15.2 6.1c.7-.8 1.1-1.9 1-3-1 0-2.2.6-2.9 1.5-.6.7-1.2 1.8-1 2.9 1 0 2.1-.5 2.9-1.4z" />
              </svg>
              <div>
                <div className={styles.sm}>Download on the</div>
                <div className={styles.lg}>App Store</div>
              </div>
            </a>
            <a className={styles.storeBtn} href="#">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3.6 1.4c-.4.4-.6 1-.6 1.8v17.6c0 .8.2 1.4.6 1.8l.1.1 9.9-9.9v-.1l-10-9.3zm13.6 12.8l-3.3-3.3 3.3-3.3 4.1 2.3c1.2.7 1.2 1.8 0 2.5l-4.1 1.8zm-3.7-3.7L3.7 22c.3.3.9.4 1.5.1l10.9-6.2-2.6-2.4zM4.2 2L14 11.7l2.5-2.5L5.2 2.6c-.3-.2-.7-.3-1-.6z" />
              </svg>
              <div>
                <div className={styles.sm}>Get it on</div>
                <div className={styles.lg}>Google Play</div>
              </div>
            </a>
          </div>
          <div className={styles.apkRow}>
            <div className={styles.apkIcon}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
            </div>
            <div className={styles.apkContent}>
              <h5>Direct APK download</h5>
              <p>v1.0.0 · Android 8+ · 18.4 MB · signed</p>
            </div>
            <a href="#" className={styles.apkBtn}>
              Download .apk
            </a>
          </div>
        </div>
        <div className={styles.phoneStage}>
          <div className={`${styles.phoneSparkle} ${styles.phoneSparkleS1}`}>
            ✦
          </div>
          <div className={`${styles.phoneSparkle} ${styles.phoneSparkleS2}`}>
            ✦
          </div>

          <div className={`${styles.phoneFrame} ${styles.phoneBack}`}>
            <div className={styles.phoneScreen}>
              <div className={styles.phoneContent}>
                <div className={styles.phoneBrand}>
                  <span className="dot"></span>OurStory
                </div>
                <div
                  className={styles.phoneCard}
                  style={genreVar("oklch(52% 0.14 200)")}
                >
                  <div className={styles.phoneCardMeta}>● Sci-Fi · 38 min</div>
                  <h4>Signal From Io</h4>
                  <p>Dara Chen</p>
                </div>
                <div
                  className={styles.phoneCard}
                  style={genreVar("oklch(52% 0.14 280)")}
                >
                  <div className={styles.phoneCardMeta}>
                    ● Fantasy · 14 min
                  </div>
                  <h4>The Bookbinder&apos;s Apprentice</h4>
                  <p>Hana Okafor</p>
                </div>
                <div
                  className={styles.phoneCard}
                  style={genreVar("oklch(60% 0.14 10)")}
                >
                  <div className={styles.phoneCardMeta}>
                    ● Romance · 5 min
                  </div>
                  <h4>Two Trains, One Platform</h4>
                  <p>Priya Shah</p>
                </div>
              </div>
            </div>
          </div>

          <div className={`${styles.phoneFrame} ${styles.phoneFront}`}>
            <div className={styles.phoneScreen}>
              <div className={styles.phoneContent}>
                <div className={styles.phoneBrand}>
                  <span className="dot"></span>OurStory
                </div>
                <div className={styles.phoneFeatured}>
                  <span className={styles.phoneTag}>Editor&apos;s Pick</span>
                  <h3>My First Home</h3>
                  <p className={styles.phoneSnip}>
                    “A heartbeat, a warm place — the first morning of a
                    life.”
                  </p>
                </div>
                <div
                  className={styles.phoneCard}
                  style={genreVar("oklch(52% 0.14 35)")}
                >
                  <div className={styles.phoneCardMeta}>
                    ● Literary · 12 min
                  </div>
                  <h4>The Cartographer of Forgotten Rooms</h4>
                  <p>Elena Voss</p>
                </div>
                <div
                  className={styles.phoneCard}
                  style={genreVar("oklch(42% 0.10 20)")}
                >
                  <div className={styles.phoneCardMeta}>● Horror · 9 min</div>
                  <h4>A Lantern in the Fog</h4>
                  <p>Rowan Park</p>
                </div>
              </div>
              <div className={styles.phoneTabbar}>
                <div className={`${styles.phoneTab} ${styles.phoneTabActive}`} />
                <div className={styles.phoneTab} />
                <div className={styles.phoneTab} />
                <div className={styles.phoneTab} />
                <div className={styles.phoneTab} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.qrRow}>
        <div className={styles.qr}>
          <svg
            viewBox="0 0 10 10"
            xmlns="http://www.w3.org/2000/svg"
            style={{ imageRendering: "pixelated" }}
          >
            <rect width="10" height="10" fill="white" />
            <g fill="black">
              <rect x="0" y="0" width="3" height="3" />
              <rect x="1" y="1" width="1" height="1" fill="white" />
              <rect x="7" y="0" width="3" height="3" />
              <rect x="8" y="1" width="1" height="1" fill="white" />
              <rect x="0" y="7" width="3" height="3" />
              <rect x="1" y="8" width="1" height="1" fill="white" />
              <rect x="4" y="0" width="1" height="1" />
              <rect x="5" y="1" width="1" height="1" />
              <rect x="4" y="2" width="1" height="1" />
              <rect x="6" y="2" width="1" height="1" />
              <rect x="0" y="4" width="1" height="1" />
              <rect x="2" y="4" width="1" height="1" />
              <rect x="4" y="4" width="1" height="1" />
              <rect x="5" y="4" width="1" height="1" />
              <rect x="7" y="4" width="1" height="1" />
              <rect x="9" y="4" width="1" height="1" />
              <rect x="1" y="5" width="1" height="1" />
              <rect x="3" y="5" width="1" height="1" />
              <rect x="6" y="5" width="1" height="1" />
              <rect x="8" y="5" width="1" height="1" />
              <rect x="4" y="6" width="1" height="1" />
              <rect x="5" y="6" width="1" height="1" />
              <rect x="7" y="6" width="1" height="1" />
              <rect x="4" y="7" width="1" height="1" />
              <rect x="6" y="7" width="1" height="1" />
              <rect x="9" y="7" width="1" height="1" />
              <rect x="5" y="8" width="1" height="1" />
              <rect x="7" y="8" width="1" height="1" />
              <rect x="8" y="8" width="1" height="1" />
              <rect x="4" y="9" width="1" height="1" />
              <rect x="6" y="9" width="1" height="1" />
            </g>
          </svg>
          <div className={styles.qrCaption}>iOS</div>
        </div>
        <div style={{ flex: 1 }}>
          <h4>Scan to install</h4>
          <p>
            Point your camera at the QR to open the App Store or Play Store
            listing — no typing needed. The app weighs 18 MB and installs in
            under a minute on most connections.
          </p>
        </div>
        <div className={styles.qr}>
          <svg
            viewBox="0 0 10 10"
            xmlns="http://www.w3.org/2000/svg"
            style={{ imageRendering: "pixelated" }}
          >
            <rect width="10" height="10" fill="white" />
            <g fill="black">
              <rect x="0" y="0" width="3" height="3" />
              <rect x="1" y="1" width="1" height="1" fill="white" />
              <rect x="7" y="0" width="3" height="3" />
              <rect x="8" y="1" width="1" height="1" fill="white" />
              <rect x="0" y="7" width="3" height="3" />
              <rect x="1" y="8" width="1" height="1" fill="white" />
              <rect x="5" y="0" width="1" height="1" />
              <rect x="4" y="1" width="1" height="1" />
              <rect x="5" y="2" width="1" height="1" />
              <rect x="6" y="2" width="1" height="1" />
              <rect x="0" y="5" width="1" height="1" />
              <rect x="2" y="4" width="1" height="1" />
              <rect x="4" y="4" width="1" height="1" />
              <rect x="6" y="4" width="1" height="1" />
              <rect x="8" y="4" width="1" height="1" />
              <rect x="9" y="4" width="1" height="1" />
              <rect x="1" y="6" width="1" height="1" />
              <rect x="3" y="5" width="1" height="1" />
              <rect x="5" y="5" width="1" height="1" />
              <rect x="7" y="5" width="1" height="1" />
              <rect x="4" y="6" width="1" height="1" />
              <rect x="5" y="6" width="1" height="1" />
              <rect x="7" y="6" width="1" height="1" />
              <rect x="8" y="6" width="1" height="1" />
              <rect x="4" y="7" width="1" height="1" />
              <rect x="6" y="7" width="1" height="1" />
              <rect x="5" y="8" width="1" height="1" />
              <rect x="8" y="8" width="1" height="1" />
              <rect x="4" y="9" width="1" height="1" />
              <rect x="7" y="9" width="1" height="1" />
            </g>
          </svg>
          <div className={styles.qrCaption}>Android</div>
        </div>
      </section>

      <div className={styles.adSlot}>728 × 90 · Leaderboard</div>

      <section className={styles.features}>
        <h2>Built for reading everywhere.</h2>
        <p className={styles.intro}>
          Same library. Same account. New capabilities that only a mobile app
          can give you.
        </p>
        <div className={styles.featGrid}>
          {[
            {
              num: "01",
              title: "Read offline.",
              body: "Download any story for the subway, the plane, the cabin. The library travels with you — no signal required, no ads when offline.",
            },
            {
              num: "02",
              title: "One account, everywhere.",
              body: "Sign in with the same credentials you use on the web. Drafts, bookmarks, likes, and reading progress sync between your phone and desktop instantly.",
            },
            {
              num: "03",
              title: "Write on the go.",
              body: "The mobile composer has the same rich text, auto-save, and publishing flow as the web. Start a draft on the bus, finish it on your laptop.",
            },
            {
              num: "04",
              title: "Night-mode typography.",
              body: "A reader view tuned for OLED: deep paper, warm ink, adjustable serif size. Gentle on the eyes, gentler on your battery.",
            },
            {
              num: "05",
              title: "Push when it matters.",
              body: "Optional notifications when authors you follow publish, when weekly editor picks drop, or when someone claps for your latest story. Nothing else.",
            },
            {
              num: "06",
              title: "Respectfully ad-supported.",
              body: "A single banner above the tab bar and the occasional native ad between stories. Never mid-paragraph. Turn them off by upgrading to Patron.",
            },
          ].map((f) => (
            <div key={f.num} className={styles.feat}>
              <div className={styles.featNum}>{f.num}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.compat}>
        <div className={styles.cell}>
          <h5>iOS</h5>
          <b>17.0+</b>
          <span>iPhone &amp; iPad</span>
        </div>
        <div className={styles.cell}>
          <h5>Android</h5>
          <b>8.0+</b>
          <span>Phones &amp; tablets</span>
        </div>
        <div className={styles.cell}>
          <h5>Size</h5>
          <b>18.4 MB</b>
          <span>Small footprint</span>
        </div>
        <div className={styles.cell}>
          <h5>Languages</h5>
          <b>EN · ES · FR</b>
          <span>More coming</span>
        </div>
      </section>

      <section className={styles.faq}>
        <h2>Before you install.</h2>
        <details open>
          <summary>
            Is the mobile app really the same library as the website?
          </summary>
          <p>
            Yes. OurStory Mobile and the web library share a single backend. A
            story you publish on one shows up on the other within seconds.
            Bookmarks, likes, drafts, and reading progress all sync across
            devices tied to your account.
          </p>
        </details>
        <details>
          <summary>Do I need an account to read on mobile?</summary>
          <p>
            No. Reading stays anonymous everywhere. You only need an account
            to write, save drafts, bookmark stories, or follow authors — the
            same rule as on the web.
          </p>
        </details>
        <details>
          <summary>Are there ads in the mobile app?</summary>
          <p>
            A single banner above the tab bar, and occasional native ad cards
            between stories in the feed. We never place ads mid-paragraph
            inside a story. When you&apos;re offline, no ads show at all.
          </p>
        </details>
        <details>
          <summary>Can I sideload the APK without Google Play?</summary>
          <p>
            Yes. The direct APK download above is signed and identical to the
            Play Store build. You&apos;ll need to enable “Install from unknown
            sources” once in your Android settings.
          </p>
        </details>
        <details>
          <summary>What&apos;s different between the app and the website?</summary>
          <p>
            The app adds offline reading, push notifications, and a lighter
            compose flow optimized for touch. The website has a richer editor,
            author analytics, and a broader browse view. Most readers use both.
          </p>
        </details>
      </section>
    </main>
  );
}
