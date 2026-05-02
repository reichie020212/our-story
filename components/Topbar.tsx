"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { UserMenu } from "./UserMenu";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();

  const isBrowse = pathname === "/";
  const isReader = pathname?.startsWith("/s/") ?? false;
  const isComposer = pathname === "/compose";
  const search = searchParams.get("q") ?? "";

  const updateSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    const qs = params.toString();
    if (isBrowse) {
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    } else {
      router.push(qs ? `/?${qs}` : "/");
    }
  };

  const onWriteClick = () => {
    if (auth.user) router.push("/compose");
    else auth.setModal({ mode: "signup", reason: "write" });
  };

  const onReadingClick = () => {
    let last: string | null = null;
    try {
      last = localStorage.getItem("os-story");
    } catch {
      /* ignore */
    }
    router.push(`/s/${last || "my-first-home"}`);
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          <span className="dot"></span>
          OurStory
          <em>original stories, carefully kept</em>
        </Link>
        <div className="search" role="search">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            placeholder="Search stories, authors, tags…"
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
          />
        </div>
        <nav className="navlinks">
          <Link href="/" className={isBrowse ? "active" : ""}>
            Browse
          </Link>
          <button
            className={isReader ? "active" : ""}
            onClick={onReadingClick}
          >
            Reading
          </button>
          <button className={isComposer ? "active" : ""} onClick={onWriteClick}>
            Write
          </button>
        </nav>
        <UserMenu />
      </div>
    </header>
  );
}
