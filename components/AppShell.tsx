
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShieldCheck,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

const links = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Ringkasan performa",
    icon: LayoutDashboard,
  },
  {
    href: "/update-outlet",
    label: "Update Outlet",
    description: "Aktivitas transaksi outlet",
    icon: ClipboardCheck,
  },
  {
    href: "/update-value",
    label: "Update Value",
    description: "Realisasi penjualan",
    icon: Wallet,
  },
  {
    href: "/target",
    label: "Pengaturan Target",
    description: "Target bulanan produk",
    icon: Settings2,
  },
  {
    href: "/riwayat",
    label: "Riwayat",
    description: "Arsip aktivitas sales",
    icon: BarChart3,
  },
];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("Sales User");
  const [authLoading, setAuthLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const { data, error } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      setEmail(data.user.email ?? "Sales User");
      setAuthLoading(false);
    }

    checkUser();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMobile();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen, closeMobile]);

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  const pageTitle =
    links.find(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`)
    )?.label ?? "Sales Performance";

  const initials = email.split("@")[0]?.trim().charAt(0).toUpperCase() || "S";

  return (
    <div
      className={`sales-app ${collapsed ? "sidebar-collapsed" : ""} ${
        mobileOpen ? "mobile-sidebar-open" : ""
      }`}
    >
      <style jsx global>{`
        :root {
          --sales-navy: #102b4e;
          --sales-navy-deep: #0a1d35;
          --sales-blue: #1769aa;
          --sales-blue-light: #eaf4ff;
          --sales-text: #172b45;
          --sales-muted: #8190a4;
          --sales-border: #e7edf4;
          --sales-sidebar-width: 258px;
          --sales-sidebar-mini: 82px;
          --sales-header-height: 78px;
        }

        * {
          box-sizing: border-box;
        }

        .sales-app {
          min-height: 100vh;
          color: var(--sales-text);
          background: #f5f7fb;
          --current-sidebar-width: var(--sales-sidebar-width);
        }

        .sales-app.sidebar-collapsed {
          --current-sidebar-width: var(--sales-sidebar-mini);
        }

        .sales-sidebar {
          position: fixed;
          z-index: 80;
          inset: 0 auto 0 0;
          display: flex;
          width: var(--current-sidebar-width);
          flex-direction: column;
          overflow: hidden;
          color: #fff;
          background:
            radial-gradient(
              ellipse at 0% 0%,
              rgba(44, 119, 188, 0.2),
              transparent 45%
            ),
            linear-gradient(180deg, #102b4e 0%, #0b203b 65%, #091a30 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 8px 0 35px rgba(18, 42, 74, 0.045);
          transition: width 0.28s cubic-bezier(0.2, 0.75, 0.25, 1);
        }

        .sales-brand {
          display: flex;
          height: var(--sales-header-height);
          min-height: var(--sales-header-height);
          align-items: center;
          gap: 12px;
          padding: 0 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
          white-space: nowrap;
        }

        .sales-brand-icon {
          display: flex;
          width: 41px;
          height: 41px;
          min-width: 41px;
          align-items: center;
          justify-content: center;
          color: white;
          background: linear-gradient(145deg, #3e9be8, #1764ad);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 14px;
          box-shadow: 0 7px 20px rgba(0, 106, 201, 0.28);
        }

        .sales-brand-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 4px;
          opacity: 1;
          transition: opacity 0.18s ease;
        }

        .sales-brand-copy strong {
          color: #fff;
          font-size: 14px;
          font-weight: 850;
          letter-spacing: 1.4px;
        }

        .sales-brand-copy span {
          color: #a7c3e4;
          font-size: 9px;
          font-weight: 750;
          letter-spacing: 1.75px;
        }

        .sales-sidebar-heading {
          padding: 25px 23px 11px;
          color: #7694b8;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.8px;
          white-space: nowrap;
        }

        .sales-nav {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 0 12px;
        }

        .sales-nav-link {
          position: relative;
          display: flex;
          min-height: 49px;
          align-items: center;
          gap: 13px;
          padding: 0 14px;
          overflow: hidden;
          color: #b6c7dc;
          text-decoration: none;
          border: 1px solid transparent;
          border-radius: 12px;
          transition:
            color 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease;
        }

        .sales-nav-link:hover {
          color: white;
          background: rgba(255, 255, 255, 0.075);
          transform: translateX(2px);
        }

        .sales-nav-link.active {
          color: #fff;
          background: linear-gradient(
            100deg,
            rgba(48, 137, 220, 0.28),
            rgba(40, 112, 184, 0.12)
          );
          border-color: rgba(112, 179, 241, 0.2);
          box-shadow: inset 3px 0 0 #55adff;
        }

        .sales-nav-icon {
          display: flex;
          width: 22px;
          min-width: 22px;
          align-items: center;
          justify-content: center;
        }

        .sales-nav-link.active .sales-nav-icon {
          color: #75beff;
        }

        .sales-nav-copy {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          gap: 3px;
          white-space: nowrap;
        }

        .sales-nav-copy strong {
          font-size: 12px;
          font-weight: 650;
        }

        .sales-nav-copy small {
          color: #8fa8c6;
          font-size: 10px;
          font-weight: 450;
        }

        .sales-active-dot {
          width: 6px;
          height: 6px;
          min-width: 6px;
          background: #6bc0ff;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(107, 192, 255, 0.65);
        }

        .sales-sidebar-spacer {
          flex: 1;
          min-height: 22px;
        }

        .sales-sidebar-promo {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 12px;
          padding: 13px 11px;
          background: rgba(255, 255, 255, 0.055);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 13px;
        }

        .sales-promo-icon {
          display: flex;
          width: 30px;
          height: 30px;
          min-width: 30px;
          align-items: center;
          justify-content: center;
          color: #8ccaff;
          background: rgba(58, 139, 214, 0.16);
          border-radius: 9px;
        }

        .sales-promo-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 4px;
          padding-top: 1px;
        }

        .sales-promo-copy strong {
          color: #e6f2ff;
          font-size: 10px;
          font-weight: 700;
        }

        .sales-promo-copy span {
          color: #91aaca;
          font-size: 9px;
          line-height: 1.5;
        }

        .sales-sidebar-footer {
          padding: 13px 17px 17px;
          border-top: 1px solid rgba(255, 255, 255, 0.09);
        }

        .sales-account {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 10px;
        }

        .sales-avatar {
          display: flex;
          width: 36px;
          height: 36px;
          min-width: 36px;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 13px;
          font-weight: 800;
          background: linear-gradient(145deg, #428fd1, #2460a2);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
        }

        .sales-account-copy {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          gap: 4px;
          overflow: hidden;
        }

        .sales-account-copy strong {
          overflow: hidden;
          color: #f0f6ff;
          font-size: 11px;
          font-weight: 650;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sales-account-copy span {
          overflow: hidden;
          color: #8da8c8;
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sales-logout {
          display: flex;
          width: 34px;
          height: 34px;
          min-width: 34px;
          align-items: center;
          justify-content: center;
          color: #a7bdd6;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .sales-logout:hover {
          color: #ffb4b4;
          background: rgba(255, 95, 95, 0.1);
          border-color: rgba(255, 95, 95, 0.14);
        }

        .sales-logout:disabled {
          cursor: wait;
          opacity: 0.6;
        }

        .sales-sidebar-toggle {
          position: absolute;
          z-index: 2;
          top: 90px;
          right: -1px;
          display: flex;
          width: 25px;
          height: 30px;
          align-items: center;
          justify-content: center;
          color: #9bb5d2;
          background: #173858;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-right: 0;
          border-radius: 8px 0 0 8px;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .sales-sidebar:hover .sales-sidebar-toggle,
        .sales-sidebar-toggle:focus-visible {
          opacity: 1;
        }

        .sidebar-collapsed .sales-brand {
          justify-content: center;
          padding: 0 10px;
        }

        .sidebar-collapsed .sales-brand-copy,
        .sidebar-collapsed .sales-sidebar-heading,
        .sidebar-collapsed .sales-nav-copy,
        .sidebar-collapsed .sales-active-dot,
        .sidebar-collapsed .sales-promo-copy,
        .sidebar-collapsed .sales-account-copy,
        .sidebar-collapsed .sales-logout,
        .sidebar-collapsed .sales-footer-version {
          display: none;
        }

        .sidebar-collapsed .sales-nav {
          padding: 0 12px;
        }

        .sidebar-collapsed .sales-nav-link {
          justify-content: center;
          padding: 0;
        }

        .sidebar-collapsed .sales-nav-link.active {
          box-shadow: inset 0 -3px 0 #55adff;
        }

        .sidebar-collapsed .sales-sidebar-promo {
          justify-content: center;
          padding: 10px 0;
          margin: 12px 9px;
        }

        .sidebar-collapsed .sales-sidebar-footer {
          display: flex;
          justify-content: center;
          padding: 13px 8px;
        }

        .sidebar-collapsed .sales-account {
          justify-content: center;
        }

        .sidebar-collapsed .sales-sidebar-toggle {
          top: 91px;
          right: -1px;
        }

        .sales-main {
          min-width: 0;
          min-height: 100vh;
          margin-left: var(--current-sidebar-width);
          transition: margin-left 0.28s cubic-bezier(0.2, 0.75, 0.25, 1);
        }

        .sales-topbar {
          position: sticky;
          z-index: 50;
          top: 0;
          display: flex;
          min-height: var(--sales-header-height);
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 13px 30px;
          background: rgba(255, 255, 255, 0.91);
          border-bottom: 1px solid var(--sales-border);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .sales-topbar-left {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 13px;
        }

        .sales-mobile-menu,
        .sales-desktop-toggle {
          display: flex;
          width: 39px;
          height: 39px;
          min-width: 39px;
          align-items: center;
          justify-content: center;
          color: #405875;
          background: white;
          border: 1px solid #e5ebf2;
          border-radius: 11px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .sales-mobile-menu:hover,
        .sales-desktop-toggle:hover {
          color: #1769aa;
          background: #f0f7ff;
          border-color: #c8dff5;
        }

        .sales-mobile-menu {
          display: none;
        }

        .sales-topbar-heading {
          min-width: 0;
        }

        .sales-topbar-heading h1 {
          margin: 0;
          color: #172b45;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.4px;
        }

        .sales-topbar-heading p {
          margin: 4px 0 0;
          color: #8492a5;
          font-size: 11px;
        }

        .sales-topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sales-status {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 11px;
          color: #3e8062;
          background: #effaf4;
          border: 1px solid #d9f0e2;
          border-radius: 9px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .sales-status-dot {
          width: 6px;
          height: 6px;
          background: #37b878;
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(55, 184, 120, 0.12);
        }

        .sales-user-chip {
          display: flex;
          max-width: 235px;
          align-items: center;
          gap: 9px;
          padding: 5px 10px 5px 5px;
          background: #fff;
          border: 1px solid #e8edf4;
          border-radius: 12px;
        }

        .sales-user-avatar {
          display: flex;
          width: 32px;
          height: 32px;
          min-width: 32px;
          align-items: center;
          justify-content: center;
          color: #1769aa;
          font-size: 12px;
          font-weight: 800;
          background: linear-gradient(145deg, #e7f3ff, #d4e9ff);
          border-radius: 9px;
        }

        .sales-user-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 3px;
        }

        .sales-user-copy strong {
          overflow: hidden;
          color: #344963;
          font-size: 10px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sales-user-copy span {
          color: #96a2b2;
          font-size: 9px;
        }

        .sales-content {
          width: 100%;
          min-width: 0;
          padding: 26px 30px 36px;
          animation: salesContentEnter 0.35s ease both;
        }

        @keyframes salesContentEnter {
          from {
            opacity: 0.7;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .sales-mobile-overlay {
          display: none;
        }

        .sales-loading {
          display: flex;
          min-height: 100vh;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 13px;
          color: #7d8ca1;
          background: #f5f7fb;
          font-size: 12px;
        }

        .sales-loading-spinner {
          width: 30px;
          height: 30px;
          border: 3px solid #dce8f5;
          border-top-color: #1769aa;
          border-radius: 50%;
          animation: salesSpin 0.75s linear infinite;
        }

        @keyframes salesSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (min-width: 1500px) {
          .sales-content {
            padding-right: 38px;
            padding-left: 38px;
          }
        }

        @media (max-width: 1100px) {
          .sales-content {
            padding: 23px 22px 32px;
          }

          .sales-topbar {
            padding-right: 22px;
            padding-left: 22px;
          }

          .sales-status {
            display: none;
          }
        }

        @media (max-width: 760px) {
          .sales-app {
            --current-sidebar-width: 0px !important;
          }

          .sales-sidebar {
            width: min(290px, 84vw);
            transform: translateX(-105%);
            transition: transform 0.3s cubic-bezier(0.2, 0.75, 0.25, 1);
            box-shadow: 18px 0 60px rgba(5, 22, 43, 0.25);
          }

          .mobile-sidebar-open .sales-sidebar {
            transform: translateX(0);
          }

          .sidebar-collapsed .sales-brand {
            justify-content: flex-start;
            padding: 0 20px;
          }

          .sidebar-collapsed .sales-brand-copy,
          .sidebar-collapsed .sales-sidebar-heading,
          .sidebar-collapsed .sales-nav-copy,
          .sidebar-collapsed .sales-active-dot,
          .sidebar-collapsed .sales-promo-copy,
          .sidebar-collapsed .sales-account-copy,
          .sidebar-collapsed .sales-logout {
            display: flex;
          }

          .sidebar-collapsed .sales-sidebar-heading {
            display: block;
          }

          .sidebar-collapsed .sales-nav {
            padding: 0 12px;
          }

          .sidebar-collapsed .sales-nav-link {
            justify-content: flex-start;
            gap: 13px;
            padding: 0 14px;
          }

          .sidebar-collapsed .sales-nav-link.active {
            box-shadow: inset 3px 0 0 #55adff;
          }

          .sidebar-collapsed .sales-sidebar-promo {
            justify-content: flex-start;
            padding: 13px 11px;
            margin: 12px;
          }

          .sidebar-collapsed .sales-sidebar-footer {
            display: block;
            padding: 13px 17px 17px;
          }

          .sidebar-collapsed .sales-account {
            justify-content: flex-start;
          }

          .sales-sidebar-toggle,
          .sales-desktop-toggle {
            display: none;
          }

          .sales-mobile-overlay {
            position: fixed;
            z-index: 70;
            inset: 0;
            display: block;
            background: rgba(6, 22, 42, 0.48);
            opacity: 0;
            visibility: hidden;
            backdrop-filter: blur(3px);
            transition:
              opacity 0.25s ease,
              visibility 0.25s ease;
          }

          .mobile-sidebar-open .sales-mobile-overlay {
            opacity: 1;
            visibility: visible;
          }

          .sales-topbar {
            min-height: 68px;
            gap: 10px;
            padding: 10px 15px;
          }

          .sales-mobile-menu {
            display: flex;
            width: 37px;
            height: 37px;
            min-width: 37px;
          }

          .sales-topbar-left {
            gap: 10px;
          }

          .sales-topbar-heading h1 {
            font-size: 14px;
          }

          .sales-topbar-heading p {
            max-width: 205px;
            overflow: hidden;
            font-size: 10px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .sales-topbar-right {
            gap: 0;
          }

          .sales-user-chip {
            max-width: 42px;
            padding: 4px;
            border: 0;
            background: transparent;
          }

          .sales-user-avatar {
            width: 34px;
            height: 34px;
            min-width: 34px;
          }

          .sales-user-copy {
            display: none;
          }

          .sales-content {
            padding: 19px 15px 28px;
          }
        }

        @media (max-width: 380px) {
          .sales-topbar {
            padding-right: 10px;
            padding-left: 10px;
          }

          .sales-topbar-heading h1 {
            font-size: 13px;
          }

          .sales-topbar-heading p {
            max-width: 150px;
          }

          .sales-content {
            padding-right: 11px;
            padding-left: 11px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sales-sidebar,
          .sales-main,
          .sales-nav-link,
          .sales-mobile-overlay {
            transition: none !important;
          }

          .sales-content {
            animation: none !important;
          }
        }
      `}</style>

      {authLoading ? (
        <div className="sales-loading">
          <div className="sales-loading-spinner" />
          <span>Menyiapkan Sales Tracker...</span>
        </div>
      ) : (
        <>
          <button
            type="button"
            aria-label="Tutup menu"
            className="sales-mobile-overlay"
            onClick={closeMobile}
            tabIndex={mobileOpen ? 0 : -1}
          />

          <aside className="sales-sidebar">
            <div className="sales-brand">
              <div className="sales-brand-icon">
                <Activity size={22} strokeWidth={2.4} />
              </div>

              <div className="sales-brand-copy">
                <strong>OTSUKA</strong>
                <span>SALES TRACKER</span>
              </div>
            </div>

            <button
              type="button"
              className="sales-sidebar-toggle"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? "Perbesar sidebar" : "Perkecil sidebar"}
              title={collapsed ? "Perbesar sidebar" : "Perkecil sidebar"}
            >
              {collapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>

            <div className="sales-sidebar-heading">MENU UTAMA</div>

            <nav className="sales-nav" aria-label="Navigasi utama">
              {links.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`sales-nav-link ${active ? "active" : ""}`}
                  >
                    <span className="sales-nav-icon">
                      <Icon size={19} strokeWidth={active ? 2.3 : 1.8} />
                    </span>

                    <span className="sales-nav-copy">
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>

                    {active && <span className="sales-active-dot" />}
                  </Link>
                );
              })}
            </nav>

            <div className="sales-sidebar-spacer" />

            <div className="sales-sidebar-promo">
              <div className="sales-promo-icon">
                <Zap size={16} />
              </div>

              <div className="sales-promo-copy">
                <strong>Sales Performance</strong>
                <span>Pantau target dan aktivitas penjualan dalam satu tempat.</span>
              </div>
            </div>

            <div className="sales-sidebar-footer">
              <div className="sales-account">
                <div className="sales-avatar">{initials}</div>

                <div className="sales-account-copy">
                  <strong>Sales Account</strong>
                  <span title={email}>{email}</span>
                </div>

                <button
                  type="button"
                  className="sales-logout"
                  onClick={logout}
                  disabled={loggingOut}
                  title={loggingOut ? "Sedang keluar..." : "Keluar"}
                  aria-label="Keluar dari akun"
                >
                  <LogOut size={17} />
                </button>
              </div>
            </div>
          </aside>

          <main className="sales-main">
            <header className="sales-topbar">
              <div className="sales-topbar-left">
                <button
                  type="button"
                  className="sales-mobile-menu"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Buka menu navigasi"
                  aria-expanded={mobileOpen}
                >
                  <Menu size={20} />
                </button>

                <button
                  type="button"
                  className="sales-desktop-toggle"
                  onClick={() => setCollapsed((value) => !value)}
                  aria-label={
                    collapsed ? "Buka sidebar" : "Tutup sidebar"
                  }
                  title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
                >
                  {collapsed ? (
                    <PanelLeftOpen size={19} />
                  ) : (
                    <PanelLeftClose size={19} />
                  )}
                </button>

                <div className="sales-topbar-heading">
                  <h1>{pageTitle}</h1>
                  <p>Ringkasan dan pencatatan target penjualan Anda</p>
                </div>
              </div>

              <div className="sales-topbar-right">
                <div className="sales-status">
                  <span className="sales-status-dot" />
                  Sales Tracker
                </div>

                <div className="sales-user-chip">
                  <div className="sales-user-avatar">{initials}</div>

                  <div className="sales-user-copy">
                    <strong>{email}</strong>
                    <span>
                      <ShieldCheck
                        size={11}
                        style={{
                          display: "inline",
                          verticalAlign: "middle",
                          marginRight: 3,
                        }}
                      />
                      Akun terverifikasi
                    </span>
                  </div>
                </div>
              </div>
            </header>

            <div className="sales-content">{children}</div>
          </main>
        </>
      )}
    </div>
  );
}
