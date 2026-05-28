"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  Library,
  Settings,
  Bell,
  ChevronDown,
  Sparkles,
  ArrowLeft,
  LogOut,
  User as UserIcon,
  CheckCircle2,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VedaLogo } from "@/components/brand/veda-logo";
import { useUser, userDisplay } from "@/lib/auth/use-user";
import { useAssignmentsStore } from "@/store/assignments";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
};

const navItems: NavItem[] = [
  { href: "/",            label: "Home",                 icon: LayoutDashboard, enabled: true },
  { href: "/groups",      label: "My Groups",            icon: Users,           enabled: true },
  { href: "/assignments", label: "Assignments",          icon: FileText,        enabled: true },
  { href: "/toolkit",     label: "AI Teacher's Toolkit", icon: BookOpen,        enabled: true },
  { href: "/library",     label: "My Library",           icon: Library,         enabled: true },
];

function isNavActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href === "/assignments") return pathname.startsWith("/assignments");
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const isNewAssignment = pathname === "/assignments/new";
  const isAssignmentDetail =
    /^\/assignments\/[^/]+$/.test(pathname) && !isNewAssignment;
  const isAssignmentsList = pathname === "/assignments";
  /* Figma 2:10625 — back arrow renders on the whole /assignments/* surface */
  const showBack = isNewAssignment || isAssignmentDetail || isAssignmentsList;

  const crumb = isNewAssignment
    ? "Create Assignment"
    : isAssignmentDetail
    ? "Assignment"
    : isAssignmentsList
    ? "Assignment"
    : pathname === "/groups"
    ? "My Groups"
    : pathname === "/toolkit"
    ? "AI Teacher's Toolkit"
    : pathname === "/library"
    ? "My Library"
    : pathname === "/settings"
    ? "Settings"
    : "Home";

  // Close drawer on route change
  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  React.useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  return (
    <div className="relative min-h-screen">
      {/* ── Desktop sidebar (Figma: left:12, top:12, bottom:12, width:304) ── */}
      <aside className="fixed bottom-3 left-3 top-3 z-40 hidden w-[304px] flex-col overflow-hidden rounded-2xl bg-white p-6 sidebar-shadow lg:flex">
        <SidebarInner />
      </aside>

      {/* ── Mobile drawer (slides in from left) ── */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* ── Content area ── */}
      <div className="px-3 lg:pl-[327px] lg:pr-3">
        <TopBar
          showBack={showBack}
          crumb={crumb}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <main className="pb-10">{children}</main>
      </div>
    </div>
  );
}

/* ─────────── Sidebar contents (shared by desktop + drawer) ─────────── */

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Logo + wordmark — Figma 2:10589/97 */}
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
      >
        <VedaLogo size={40} />
        <span
          className="text-[28px] font-bold leading-[20px] tracking-[-0.06em] text-foreground"
          style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
        >
          VedaAI
        </span>
      </Link>

      {/* Create Assignment pill — Figma 2:10599: border-4 #ff7950, bg #272727,
          h-42, px-43 py-8, sparkle icon + Medium 16 white text */}
      <div className="mt-10 w-full lg:mt-12">
        <Link
          href="/assignments/new"
          onClick={onNavigate}
          className="pill-cta h-[42px] w-full !border-[4px] px-6 text-[16px]"
        >
          <Sparkles className="h-[18px] w-[18px]" />
          <span>Create Assignment</span>
        </Link>
      </div>

      {/* Menu — Figma 2:10603: items h-40, icon 20, Regular 16 / Medium 16 active */}
      <nav className="mt-10 flex flex-col gap-2 lg:mt-12">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item.href, pathname);
          const className = cn(
            "flex h-10 items-center gap-2 rounded-lg px-3 text-[16px] tracking-[-0.04em]",
            "transition-colors duration-150",
            active
              ? "bg-[#f0f0f0] font-medium text-[#303030]"
              : "font-normal text-[rgba(94,94,94,0.8)] hover:bg-[#f6f6f6] hover:text-foreground"
          );

          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} className={className}>
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Bottom block — Figma 2:10615: Settings link + ProfileCard.
          ProfileCard is bound to live Supabase user data (DO NOT hard-code). */}
      <div className="flex flex-col gap-2">
        <Link
          href="/settings"
          onClick={onNavigate}
          className="flex h-10 items-center gap-2 rounded-lg px-3 text-[16px] tracking-[-0.04em] font-normal text-[rgba(94,94,94,0.8)] transition-colors duration-150 hover:bg-[#f6f6f6] hover:text-foreground"
        >
          <Settings className="h-5 w-5 shrink-0" />
          <span>Settings</span>
        </Link>

        <ProfileCard />
      </div>
    </>
  );
}

/* ─────────── Mobile drawer ─────────── */

function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
        tabIndex={open ? 0 : -1}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          "absolute bottom-3 left-3 top-3 flex w-[304px] max-w-[85vw] flex-col overflow-y-auto rounded-2xl bg-white p-6 sidebar-shadow",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]"
        )}
      >
        {/* Close button — top right of drawer */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#f6f6f6] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-[18px] w-[18px]" />
        </button>

        <SidebarInner onNavigate={onClose} />
      </aside>
    </div>
  );
}

/* ─────────── Sidebar profile card ─────────── */

function ProfileCard() {
  const { user, loading } = useUser();
  const { name, school, initials } = userDisplay(user);

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-[#f0f0f0] p-3">
      <Avatar initials={initials} className="h-12 w-12 shrink-0" />
      <div className="min-w-0 flex-1">
        {loading ? (
          <div className="space-y-1.5">
            <div className="h-3 w-24 animate-pulse rounded bg-[#e0e0e0]" />
            <div className="h-2.5 w-16 animate-pulse rounded bg-[#e0e0e0]" />
          </div>
        ) : (
          <>
            <div className="truncate text-[15px] font-bold leading-tight text-foreground">
              {name}
            </div>
            <div className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {school}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────── Top bar ─────────── */

function TopBar({
  showBack,
  crumb,
  onMenuClick,
}: {
  showBack: boolean;
  crumb: string;
  onMenuClick: () => void;
}) {
  return (
    <header
      className={cn(
        "sticky top-3 z-30 mb-5 flex h-14 items-center gap-2 overflow-hidden rounded-2xl",
        "bg-[rgba(255,255,255,0.78)] pl-3 pr-3 backdrop-blur lg:pl-6",
        "shadow-[0_1px_2px_rgba(15,15,15,0.04)]"
      )}
    >
      {/* Mobile: hamburger button */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-[#f0f0f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
      >
        <Menu className="h-[20px] w-[20px]" />
      </button>

      {/* Desktop: back button or spacer */}
      {showBack ? (
        <Link
          href="/"
          aria-label="Back"
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-foreground transition-shadow duration-150 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:flex"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Link>
      ) : (
        <div className="hidden w-1 lg:block" />
      )}

      {/* Breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <LayoutDashboard className="hidden h-[18px] w-[18px] shrink-0 text-[#a9a9a9] sm:block" />
        <span className="truncate text-[15px] font-semibold tracking-[-0.04em] text-[#a9a9a9] sm:text-[16px]">
          {crumb}
        </span>
      </div>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-2">
        <NotificationsButton />
        <ProfileMenu />
      </div>
    </header>
  );
}

/* ─────────── Notifications popover ─────────── */

function NotificationsButton() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { byId, order } = useAssignmentsStore();

  const notifications = React.useMemo(() => {
    const cutoff = Date.now() - 1000 * 60 * 60 * 24;
    return order
      .map((id) => byId[id])
      .filter(
        (a) =>
          a &&
          a.status === "completed" &&
          new Date(a.updatedAt).getTime() > cutoff
      )
      .slice(0, 5);
  }, [byId, order]);

  const hasUnread = notifications.length > 0;

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#f6f6f6] text-foreground transition-colors duration-150 hover:bg-[#ececec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Bell className="h-[18px] w-[18px]" />
        {hasUnread && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#ff5623] ring-2 ring-[#f6f6f6]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#ececec] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[#f0f0f0] px-4 py-3">
            <h3 className="text-[14px] font-semibold text-foreground">
              Notifications
            </h3>
            {notifications.length > 0 && (
              <span className="rounded-full bg-[#fff0ea] px-2 py-0.5 text-[11px] font-semibold text-[#ff5623]">
                {notifications.length}
              </span>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f6f6f6]">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="mt-3 text-[14px] font-medium text-foreground">
                  You&rsquo;re all caught up
                </p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  Completed assignments will appear here.
                </p>
              </div>
            ) : (
              <ul>
                {notifications.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/assignments/${a.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#fafafa]"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[13.5px] font-medium leading-snug text-foreground">
                          {a.title}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          Paper ready • {a.subject}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Profile pill + dropdown ─────────── */

function ProfileMenu() {
  const { user, signOut } = useUser();
  const { name, email, initials } = userDisplay(user);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl bg-white py-1.5 pl-1.5 pr-2 text-[14px] font-medium text-foreground shadow-sm transition-shadow duration-150 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:pr-3"
      >
        <Avatar initials={initials} className="h-8 w-8" />
        <span className="hidden truncate sm:inline max-w-[120px]">{name}</span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-[240px] overflow-hidden rounded-2xl border border-[#ececec] bg-white shadow-xl"
        >
          <div className="flex items-center gap-3 border-b border-[#f0f0f0] px-4 py-3">
            <Avatar initials={initials} className="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-semibold text-foreground">
                {name}
              </div>
              {email && (
                <div className="truncate text-[11.5px] text-muted-foreground">
                  {email}
                </div>
              )}
            </div>
          </div>
          <div className="p-1.5">
            <Link
              role="menuitem"
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-foreground transition-colors hover:bg-[#f6f6f6]"
            >
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              Account settings
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] text-[#c53535] transition-colors hover:bg-[#fdecec]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── shared bits ─────────── */

function Avatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff8a63] to-[#d45e3e] text-[13px] font-semibold tracking-tight text-white",
        className
      )}
    >
      {initials}
    </span>
  );
}
