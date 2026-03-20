"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

function IconTrophy() {
  return (
    <svg viewBox="0 0 24 24" className="appDrawerIcon" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18 2H6v2H3v3c0 3.31 2.69 6 6 6h.3A5.98 5.98 0 0 0 11 14.9V18H8v2h8v-2h-3v-3.1A5.98 5.98 0 0 0 14.7 13H15c3.31 0 6-2.69 6-6V4h-3V2Zm-9 9C6.79 11 5 9.21 5 7V6h1v1c0 1.66 1.34 3 3 3v1Zm10-4c0 2.21-1.79 4-4 4v-1c1.66 0 3-1.34 3-3V6h1v1Z"
      />
    </svg>
  );
}

function IconFlag() {
  return (
    <svg viewBox="0 0 24 24" className="appDrawerIcon" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 3h2v18H5V3Zm4 0h10l-2 4 2 4H9v8H7V3h2Z"
      />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" className="appDrawerIcon" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.8 9.95l-3.75-3.75L3 17.25Zm2.92 2.83H5v-.92l8.46-8.46.92.92-8.46 8.46ZM20.7 7.04a1 1 0 0 0 0-1.41L18.37 3.3a1 1 0 0 0-1.41 0l-1.13 1.13 3.75 3.75 1.12-1.13Z"
      />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" className="appDrawerIcon" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2c-4.42 0-8 2.24-8 5v2h16v-2c0-2.76-3.58-5-8-5Z"
      />
    </svg>
  );
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" className="appDrawerIcon" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z"
      />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" className="appDrawerIcon" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.9 3H21l-6.6 7.55L22 21h-6.2l-4.86-6.24L5.4 21H3.3l7.06-8.07L2 3h6.35l4.4 5.64L18.9 3Zm-1.1 16.15h1.16L7.58 4.77H6.34l11.46 14.38Z"
      />
    </svg>
  );
}

function IconTable() {
  return (
    <svg viewBox="0 0 24 24" className="appDrawerIcon" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 4v12h16V7H4Zm0-2v2h16V5H4Zm2 5h4v2H6v-2Zm0 4h4v2H6v-2Zm6-4h6v2h-6v-2Zm0 4h6v2h-6v-2Z"
      />
    </svg>
  );
}

type MenuItem = {
  label: string;
  href: string;
  icon: "trophy" | "table" | "flag" | "pencil" | "user" | "mail" | "x";
  external?: boolean;
};

const menuItems: MenuItem[] = [
  { label: "予想する", href: "/matches", icon: "pencil" },
  { label: "ランキング", href: "/ranking", icon: "trophy" },
  { label: "グループステージ", href: "/results", icon: "flag" },
  { label: "決勝T", href: "/knockout", icon: "table" },
  { label: "マイページ", href: "/me", icon: "user" },
  { label: "SNS", href: "https://x.com/", icon: "x", external: true },
  { label: "お問合せ", href: "/contact", icon: "mail" },
];

function MenuIcon({ name }: { name: MenuItem["icon"] }) {
  switch (name) {
    case "trophy":
      return <IconTrophy />;
    case "table":
      return <IconTable />;
    case "flag":
      return <IconFlag />;
    case "pencil":
      return <IconPencil />;
    case "user":
      return <IconUser />;
    case "mail":
      return <IconMail />;
    case "x":
      return <IconX />;
    default:
      return null;
  }
}

export default function AppHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <header className="appHeader">
        <button
          type="button"
          className="appHamburger"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="appHamburgerLine" />
          <span className="appHamburgerLine" />
          <span className="appHamburgerLine" />
          <span className="appHamburgerLine appHamburgerLineShort" />
        </button>

        <Link href="/" className="appHeaderLogoLink" aria-label="Home">
          <Image
            src="/スポカレロゴ.png"
            alt="スポカレ"
            width={240}
            height={60}
            priority
            className="appHeaderLogo"
          />
        </Link>
      </header>

      <div
        className={open ? "appDrawerOverlay appDrawerOverlayOpen" : "appDrawerOverlay"}
        onClick={() => setOpen(false)}
      />

      <aside className={open ? "appDrawer appDrawerOpen" : "appDrawer"}>
        <nav className="appDrawerNav" aria-label="Menu">
          {menuItems.map((item) =>
            item.external ? (
              <a
                key={item.label}
                className="appDrawerItem"
                href={item.href}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
              >
                <MenuIcon name={item.icon} />
                {item.label}
              </a>
            ) : (
              <Link
                key={item.label}
                className="appDrawerItem"
                href={item.href}
                onClick={() => setOpen(false)}
              >
                <MenuIcon name={item.icon} />
                {item.label}
              </Link>
            )
          )}
        </nav>
      </aside>
    </>
  );
}
