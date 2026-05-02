import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "About the Developer · OurStory",
  description:
    "OurStory is built by Red Butay — a quiet shelf for original stories, designed and engineered by one pair of hands.",
};

export default function AboutDeveloperPage() {
  return (
    <main className={styles.wrap}>
      <div className={styles.eyebrow}>
        <span className={styles.pulse}></span>About the developer
      </div>

      <section className={styles.hero}>
        <div>
          <h1>
            Built by <em>one pair of hands,</em> for readers and writers.
          </h1>
          <p className={styles.lede}>
            “OurStory is a space for readers and writers — a quiet shelf where
            original stories can be kept, found, and carried.”
          </p>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Bulacan, Philippines
            </div>
            <div className={styles.metaItem}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M16 18v-2a4 4 0 00-4-4H5" />
                <path d="M9 8l-4 4 4 4" />
                <path d="M20 6v12" />
              </svg>
              Software Engineer
            </div>
            <div className={styles.metaItem}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M7 8h10M7 12h6" />
              </svg>
              Designed &amp; built in 2026
            </div>
          </div>
        </div>
        <div className={styles.photo}>
          <span className={styles.photoInit}>R</span>
        </div>
      </section>

      <section className={styles.grid}>
        <div>
          <h2>Get in touch.</h2>
          <p className={styles.sub}>
            The best way to reach me is email. I read everything and try to
            reply within a few days.
          </p>
          <div className={styles.contactCard}>
            <a
              className={styles.contactRow}
              href="mailto:redickbutay02@gmail.com"
            >
              <div className={styles.ico}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 7l10 6 10-6" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div className={styles.label}>Email</div>
                <div className={styles.val}>redickbutay02@gmail.com</div>
              </div>
              <div className={styles.arrow}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M7 17L17 7M8 7h9v9" />
                </svg>
              </div>
            </a>
            <a
              className={styles.contactRow}
              href="https://www.linkedin.com/in/redick-butay-705616139/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className={styles.ico}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14zM8.3 18V10H5.7v8h2.6zM7 8.8A1.5 1.5 0 107 5.8a1.5 1.5 0 000 3zM18.3 18v-4.4c0-2.4-1.3-3.5-3-3.5-1.4 0-2 .8-2.3 1.3V10h-2.6c0 .8 0 8 0 8h2.6v-4.5c0-.2 0-.4.1-.6.2-.5.6-1 1.4-1 1 0 1.3.8 1.3 1.8V18h2.5z" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div className={styles.label}>LinkedIn</div>
                <div className={styles.val}>in/redick-butay</div>
              </div>
              <div className={styles.arrow}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M7 17L17 7M8 7h9v9" />
                </svg>
              </div>
            </a>
          </div>
          <div className={styles.signature}>
            <b>— Red Butay</b>
            <span>Bulacan, Philippines · 2026</span>
          </div>
        </div>

        <div>
          <h2>Elsewhere.</h2>
          <p className={styles.sub}>
            Say hi on any of these — I&apos;m most active on GitHub.
          </p>
          <div className={styles.socials}>
            <a
              className={styles.social}
              href="https://github.com/reichie020212"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className={styles.sIco}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 .5a12 12 0 00-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2 0 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.3v3.4c0 .3.2.7.8.6A12 12 0 0012 .5z" />
                </svg>
              </div>
              <div className={styles.sName}>GitHub</div>
              <div className={styles.sHandle}>@reichie020212</div>
            </a>
            <a
              className={styles.social}
              href="https://www.linkedin.com/in/redick-butay-705616139/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className={styles.sIco}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14zM8.3 18V10H5.7v8h2.6zM7 8.8A1.5 1.5 0 107 5.8a1.5 1.5 0 000 3zM18.3 18v-4.4c0-2.4-1.3-3.5-3-3.5-1.4 0-2 .8-2.3 1.3V10h-2.6v8h2.6v-4.5c0-.2 0-.4.1-.6.2-.5.6-1 1.4-1 1 0 1.3.8 1.3 1.8V18h2.5z" />
                </svg>
              </div>
              <div className={styles.sName}>LinkedIn</div>
              <div className={styles.sHandle}>in/redick-butay</div>
            </a>
            <a
              className={styles.social}
              href="https://www.facebook.com/redick.butay02/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className={styles.sIco}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22 12a10 10 0 10-11.6 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5H15c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.5 2.9h-2.4v7A10 10 0 0022 12z" />
                </svg>
              </div>
              <div className={styles.sName}>Facebook</div>
              <div className={styles.sHandle}>redick.butay02</div>
            </a>
            <a className={styles.social} href="mailto:redickbutay02@gmail.com">
              <div className={styles.sIco}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 7l10 6 10-6" />
                </svg>
              </div>
              <div className={styles.sName}>Email</div>
              <div className={styles.sHandle}>redickbutay02@…</div>
            </a>
          </div>
        </div>
      </section>

      <section className={styles.colophon}>
        <h2>Colophon.</h2>
        <p className={styles.sub}>A few notes on how this was made.</p>
        <div className={styles.stack}>
          <div className={styles.chip}>
            <h5>Typefaces</h5>
            <b>Fraunces</b>
            <span>Inter · JetBrains Mono</span>
          </div>
          <div className={styles.chip}>
            <h5>Frontend</h5>
            <b>Next.js 15</b>
            <span>React · TypeScript</span>
          </div>
          <div className={styles.chip}>
            <h5>Mobile</h5>
            <b>React Native</b>
            <span>Expo · EAS Build</span>
          </div>
          <div className={styles.chip}>
            <h5>Ads</h5>
            <b>AdSense · AdMob</b>
            <span>respectfully placed</span>
          </div>
        </div>
      </section>
    </main>
  );
}
