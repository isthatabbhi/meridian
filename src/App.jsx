import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Lenis from 'lenis';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger, SidebarGroup, SidebarGroupLabel, useSidebar } from "@cloudflare/kumo/components/sidebar";
import { DropdownMenu } from "@cloudflare/kumo/components/dropdown";
import { Loader, SkeletonLine } from "@cloudflare/kumo/components/loader";
import { PageHeader } from "./components/kumo/page-header/page-header";
import { fetchStats } from './lib/api';
import StatusCodesBar from './components/StatusCodesBar';
import KpiCards from './components/KpiCards';
import CountryGlobe from './components/CountryGlobe';
import DeviceTypeChart from './components/DeviceTypeChart';
import RequestsChart from './components/RequestsChart';
import TopList from './components/TopList';
import EventsTable from './components/EventsTable';
import { Button, IconButton } from './components/Button';

/* ── Icons ───────────────────────────────────────────── */
function ExternalLinkIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 3.75H3.75v12.5h12.5v-3.75" /><path d="M11.25 2.5h6.25v6.25" /><path d="M17.5 2.5L8.75 11.25" />
    </svg>
  );
}
function PrintIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5V1h8v4" /><path d="M4 12H2V7h12v5h-2" /><rect x="4" y="10" width="8" height="5" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 9.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5l-1 1" /><path d="M9.5 6.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5l1-1" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}
function FilterIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 2h14l-5.5 6.5V14l-3-1.5V8.5L1 2z" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
      <polygon points="5,3 13,8 5,13" fill="currentColor" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
      <rect x="4" y="3" width="3" height="10" rx="0.5" fill="currentColor" />
      <rect x="9" y="3" width="3" height="10" rx="0.5" fill="currentColor" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" /><path d="M8 4v4l3 1.5" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 10 3l7 7.5" /><path d="M5 9.5V17h10V9.5" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M7 5h10M7 10h10M7 15h10" /><circle cx="3.5" cy="5" r="1" fill="currentColor" stroke="none" /><circle cx="3.5" cy="10" r="1" fill="currentColor" stroke="none" /><circle cx="3.5" cy="15" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
/* Sidebar / panel-left icon, for the bottom-left expand/collapse button. */
function PanelLeftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <line x1="6" y1="2" x2="6" y2="14" />
    </svg>
  );
}
function ChevronDown() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="3.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M13 3l-1.4 1.4M4.4 11.6L3 13" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9.5A6 6 0 1 1 6.5 2 4.5 4.5 0 0 0 14 9.5Z" />
    </svg>
  );
}

/* ── Sidebar: Kumo UI Sidebar, Cloudflare-style icon rail that expands
   to a labelled sidebar, exactly like the reference: one layout, the
   labels fade and slide in/out while the width animates, instead of
   swapping two separate layouts. 55px rail / 220px expanded over
   200ms with cubic-bezier(0.4,0,0.2,1), Cloudflare's sidebar timing
   (animation spec 2026-11-10), set on the SidebarProvider. The labels,
   site card and footer all share that easing and duration, so the
   whole expansion moves as one. Permanent on desktop (md+); on
   mobile it is a drawer opened by the hamburger. Only the buttons
   Meridian actually has: Overview, Events, Portfolio. No "Add a
   chart" anywhere. ── */
function SidebarNavLabel({ children }) {
  /* Labels fade with the width, like Cloudflare's rail.
     They show when the rail is expanded OR when it is peeking
     (hover-expanded), so a hover peek shows the labels too.
     Only opacity animates: max-width flips instantly (the sidebar's
     own width animation plus overflow-hidden reveals the text), so
     no layout-triggering max-width animation fights the width
     transition and the expansion stays smooth. */
  const { open, isPeeking } = useSidebar();
  const shown = open || isPeeking;
  return (
    <span className={`whitespace-nowrap overflow-hidden transition-opacity duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${shown ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0'}`}>
      {children}
    </span>
  );
}

function SidebarBrand({ dark }) {
  /* Dark mode gets the bright-blue mark (the brand dark blue is too dark
     on the dark sidebar); light mode keeps the original dark blue.
     The "Meridian" wordmark sits beside the mark and fades with the
     rail, so the main branding is back in the header. It shows on
     expand and on hover-peek alike. */
  const { open, isPeeking } = useSidebar();
  const shown = open || isPeeking;
  const markSrc = dark ? '/meridian-mark-light.png' : '/meridian-mark.png';
  return (
    <span className="flex items-center gap-2 min-w-0">
      <img src={markSrc} alt="Meridian" className="sidebar-logo w-8 h-8 object-contain shrink-0" />
      <span className={`whitespace-nowrap overflow-hidden transition-opacity duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] text-[20px] font-semibold text-[var(--text)] ${shown ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0'}`}>
        Meridian
      </span>
    </span>
  );
}

function SidebarSiteCard() {
  /* The site card names the SITE being tracked, not the product:
     the main "Meridian" branding now lives in the header above,
     so this card shows the domain and what it is. It shows on
     expand and on hover-peek alike. */
  const { open, isPeeking } = useSidebar();
  const shown = open || isPeeking;
  return (
    <div className={`transition-opacity duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${shown ? 'opacity-100' : 'opacity-0'}`}>
      <div className="mx-1 mb-3 px-3 py-2.5 rounded-[8px] border border-[var(--border)] bg-[var(--bg)] whitespace-nowrap">
        <p className="text-[13px] text-[var(--text)] font-medium">isthatabbhi.tech</p>
        <p className="text-[11px] text-[var(--muted)]">Portfolio</p>
      </div>
    </div>
  );
}

/* Bottom-left expand / collapse button. Kumo's SidebarTrigger.
   The panel icon stays static, no rotation, on the user's order. */
function SidebarExpandToggle() {
  return (
    <SidebarTrigger>
      <span className="inline-flex">
        <PanelLeftIcon />
      </span>
    </SidebarTrigger>
  );
}

function MeridianSidebar({ view, onNavigate, dark, onPeek }) {
  const { isMobile, setOpen } = useSidebar();
  const handleNavigate = (v) => {
    onNavigate(v);
    /* On phones the sidebar is a drawer; close it after navigating.
       On desktop this would collapse the rail, so leave it alone. */
    if (isMobile) setOpen(false);
  };
  /* Hover to peek, like Cloudflare's dashboard sidebar: hovering
     the collapsed rail expands it, moving the mouse away collapses
     it again, no click needed. This only sets the transient peek
     state; the pinned open state is separate, so a sidebar that is
     open by default on desktop does not collapse when the mouse
     moves away. Desktop only; on mobile the sidebar is a drawer,
     hover does nothing. */
  const handleMouseEnter = () => { if (!isMobile) onPeek(true); };
  const handleMouseLeave = () => { if (!isMobile) onPeek(false); };
  return (
    <Sidebar
      className="print:hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header: mark + name (name fades with the rail) */}
      <SidebarHeader className="gap-2">
        <SidebarBrand dark={dark} />
      </SidebarHeader>

      <SidebarContent>
        {/* Site card, only in the expanded rail */}
        <SidebarSiteCard />

        {/* Nav, organised in a Kumo Group with a "Workspace" label.
            The label renders as a thin divider when the rail is
            collapsed, so it never leaks text into the 55px rail. */}
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                icon={<HomeIcon />}
                active={view === 'overview'}
                tooltip="Overview"
                onClick={() => handleNavigate('overview')}
              >
                <SidebarNavLabel>Overview</SidebarNavLabel>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                icon={<ListIcon />}
                active={view === 'events'}
                tooltip="Events"
                onClick={() => handleNavigate('events')}
              >
                <SidebarNavLabel>Events</SidebarNavLabel>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              {/* Portfolio is a nav link (href), not an in-place
                  action, so it stays a MenuButton with an href, the
                  Kumo sidebar's link-capable nav item. A standalone
                  LinkButton would lose the nav styling. */}
              <SidebarMenuButton
                icon={<ExternalLinkIcon />}
                tooltip="Portfolio"
                href="https://isthatabbhi.tech"
                target="_blank"
                rel="noopener noreferrer"
              >
                <SidebarNavLabel>Portfolio</SidebarNavLabel>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Bottom-left expand / collapse button */}
      <SidebarFooter>
        <SidebarExpandToggle />
      </SidebarFooter>
    </Sidebar>
  );
}

/* Hamburger: opens the sidebar drawer on phones. Hidden on desktop. */
function HamburgerButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <span className="md:hidden">
      <IconButton
        icon={<MenuIcon />}
        title="Open sidebar"
        onClick={toggleSidebar}
      />
    </span>
  );
}

/* ── App ─────────────────────────────────────────────── */
export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveRefresh, setLiveRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [fetching, setFetching] = useState(false);
  // Sidebar: pinned open by default on desktop (md+, 768px), so the
  // labels show without hovering; on phones it starts as a closed
  // drawer. The bottom-left button toggles the pinned state. Hover
  // only sets a transient peek, so a default-open sidebar does not
  // collapse when the mouse moves away, and a manually collapsed
  // rail still expands on hover and collapses on leave.
  const [sidebarPinned, setSidebarPinned] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const [sidebarPeek, setSidebarPeek] = useState(false);
  const sidebarOpen = sidebarPinned || sidebarPeek;
  const [view, setView] = useState('overview');
  const [typeFilter, setTypeFilter] = useState('all');
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const copyTimerRef = useRef(null);
  const hasLoadedRef = useRef(false);
  // Theme: dark is the default; saved choice persists across visits
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('meridian-theme');
      return saved ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark);
    /* Kumo resolves its light-dark() tokens from data-mode. */
    document.documentElement.dataset.mode = dark ? 'dark' : 'light';
    try { localStorage.setItem('meridian-theme', dark ? 'dark' : 'light'); } catch {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#030303' : '#f6f8fa');
  }, [dark]);

  /* Lenis smooth inertia scroll for mouse wheel only. Touch stays
     native: syncTouch intercepted touch scrolling and fought the
     phone's hardware momentum, so it felt laggy and sticky on
     mobile. Native touch scrolling is smooth; Lenis eases the wheel
     on desktop. Inner scroll areas (country list, events table)
     carry data-lenis-prevent and scroll natively. */
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      syncTouch: false,
      infinite: false,
    });
    let rafId;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  const handleCopyLink = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied('failed');
    } finally {
      setCopying(false);
    }
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };
  const intervalRef = useRef(null);

  const doFetch = useCallback(async () => {
    setFetching(true);
    try {
      const result = await fetchStats();
      setData(result);
      setError(null);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => { doFetch(); }, [doFetch]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (liveRefresh) {
      intervalRef.current = setInterval(doFetch, 300000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [liveRefresh, doFetch]);

  const TIME_RANGES = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: 'all', label: 'All time' },
  ];
  const currentRangeLabel = TIME_RANGES.find((r) => r.value === timeRange)?.label || 'Last 24 hours';

  // Start of the selected time range, as a timestamp. 0 means all time.
  const rangeSince = useMemo(() => {
    const now = Date.now();
    if (timeRange === '24h') return now - 24 * 60 * 60 * 1000;
    if (timeRange === '7d') return now - 7 * 24 * 60 * 60 * 1000;
    if (timeRange === '30d') return now - 30 * 24 * 60 * 60 * 1000;
    return 0;
  }, [timeRange]);

  const TYPE_FILTERS = [
    { value: 'all', label: 'All event types' },
    { value: 'pageview', label: 'Pageview' },
    { value: 'project_click', label: 'Project click' },
    { value: 'resume_download', label: 'Resume download' },
    { value: 'contact', label: 'Contact' },
  ];
  const currentFilterLabel = TYPE_FILTERS.find((f) => f.value === typeFilter)?.label || 'All event types';

  // Recent events, filtered by the selected time range and event type
  const filteredEvents = useMemo(() => {
    if (!data?.recent) return [];
    return data.recent.filter((e) => {
      if (rangeSince > 0 && new Date(e.at).getTime() < rangeSince) return false;
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      return true;
    });
  }, [data, rangeSince, typeFilter]);

  // Top paths, all-time from the stats endpoint (pageviews by page).
  // Falls back to the recent 20 events if the endpoint has no field.
  const topPaths = useMemo(() => {
    if (data?.pageviewsByPath) {
      return Object.entries(data.pageviewsByPath)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([label, count]) => ({ label, count }));
    }
    if (!data?.recent) return [];
    const counts = {};
    data.recent.forEach((e) => {
      const page = e.page || '/';
      counts[page] = (counts[page] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([label, count]) => ({ label, count }));
  }, [data]);

  // Top client IPs, from the stats endpoint
  const topClientIps = useMemo(() => {
    if (!data?.topClientIps) return [];
    return Object.entries(data.topClientIps)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  }, [data]);

  // Derive top hosts from project clicks + pageviews
  const topHosts = useMemo(() => {
    if (!data) return [];
    const hosts = {};
    if (data.pageviews > 0) {
      hosts['isthatabbhi.tech'] = data.pageviews;
    }
    if (data.projectClicksByLink) {
      Object.entries(data.projectClicksByLink).forEach(([url, count]) => {
        try {
          const host = new URL(url).hostname;
          hosts[host] = (hosts[host] || 0) + count;
        } catch {}
      });
    }
    return Object.entries(hosts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  }, [data]);

  // Top operating systems and browsers, parsed from stored user agents
  const topOS = useMemo(() => {
    if (!data?.byOS) return [];
    return Object.entries(data.byOS)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  }, [data]);

  const topBrowsers = useMemo(() => {
    if (!data?.byBrowser) return [];
    return Object.entries(data.byBrowser)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  }, [data]);

  // Top user agents, from the stats endpoint
  const topUserAgents = useMemo(() => data?.topUserAgents || [], [data]);

  // Top HTTP versions, cache statuses and origin status codes, from
  // the stats endpoint (Worker records request.cf.httpProtocol and
  // request.cf.cacheStatus on each track; origin status is 200 for
  // every stored event). Cloudflare's Traffic overview has these
  // three tables in the third Top N row; old events count as Unknown.
  const topHttpVersions = useMemo(() => {
    if (!data?.byHttpVersion) return [];
    return Object.entries(data.byHttpVersion)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  }, [data]);

  const topCacheStatuses = useMemo(() => {
    if (!data?.byCacheStatus) return [];
    return Object.entries(data.byCacheStatus)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  }, [data]);

  const topOriginStatusCodes = useMemo(() => {
    if (!data?.byOriginStatus) return [];
    return Object.entries(data.byOriginStatus)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  }, [data]);

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={(next) => { setSidebarPinned(next); setSidebarPeek(false); }}
      collapsible="icon"
      animationDuration={200}
      className="bg-[var(--bg)] text-[var(--text)] font-sans"
      /* Sidebar background matches the page colour in each theme:
         #030303 in dark, the light page colour in light mode.
         A fixed #030303 here made the sidebar black in light mode.
         Kumo sets --sidebar-bg to var(--color-kumo-base) on this
         wrapper via a class, so it is set here as an inline style,
         which beats the class. --bg is the theme page colour. */
      style={{ '--sidebar-width': '220px', '--sidebar-width-icon': '55px', '--sidebar-easing': 'cubic-bezier(0.4, 0, 0.2, 1)', '--sidebar-bg': 'var(--bg)' }}
    >
      <MeridianSidebar view={view} onNavigate={(v) => setView(v)} dark={dark} onPeek={setSidebarPeek} />

      {/* Main content, flexed beside the sidebar (55px rail / 220px expanded) */}
      <main className="flex-1 min-w-0 min-h-screen">
        <div className="px-4 pb-16 md:px-6 w-full">
          {/* ── Header row, locked (sticky) at the top so the
              Traffic overview / Recent events title and actions
              stay visible while scrolling. Same bar in both views,
              only the title changes. Now Kumo's PageHeader block
              (CLI-installed, customised in
              src/components/kumo/page-header/): title on the left
              with the mobile hamburger as its leading slot, actions
              on the right. No tabs (the sidebar handles Overview /
              Events navigation) and no breadcrumbs. ── */}
          <div className="sticky top-0 z-40 bg-[var(--bg)] border-b border-[var(--border)] -mx-4 px-4 py-3 md:-mx-6 md:px-6 mb-4 print:hidden">
            <PageHeader
              spacing="compact"
              title={view === 'events' ? 'Recent events' : 'Traffic overview'}
              leading={<HamburgerButton />}
            >
              {/* Icon-only on mobile so the three actions fit beside
                  the title on one row; labels return from the sm
                  breakpoint. Per the Kumo Button docs, icon-only
                  buttons use shape="square" with an aria-label; the
                  sm:w-auto sm:px-2 restores the text-button layout
                  on desktop, where the labels are visible (a square
                  is a fixed 26px box and would clip the text). */}
              <Button
                variant="secondary"
                size="sm"
                icon={dark ? <SunIcon /> : <MoonIcon />}
                title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
                aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
                shape="square"
                className="sm:w-auto sm:px-2"
                onClick={() => setDark(!dark)}
              >
                <span className="hidden sm:inline">{dark ? 'Light' : 'Dark'}</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<PrintIcon />}
                title="Print"
                aria-label="Print"
                shape="square"
                className="sm:w-auto sm:px-2"
                onClick={() => window.print()}
              >
                <span className="hidden sm:inline">Print</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<LinkIcon />}
                title="Copy link"
                aria-label="Copy link"
                shape="square"
                loading={copying}
                onClick={handleCopyLink}
                className={copied === 'failed' ? 'text-red-400! sm:w-auto sm:px-2' : copied ? 'text-[var(--text)]! bg-[var(--surface-2)]! sm:w-auto sm:px-2' : 'sm:w-auto sm:px-2'}
              >
                <span className="hidden sm:inline">{copied === 'failed' ? 'Copy failed' : copied ? 'Copied!' : 'Copy link'}</span>
              </Button>
            </PageHeader>
          </div>

          {/* ── Filter / refresh row ── */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5 print:hidden">
            {/* Event type filter dropdown, Events view only */}
            {view === 'events' ? (
            <DropdownMenu>
              <DropdownMenu.Trigger>
                <Button
                  variant="secondary"
                  size="md"
                  icon={<FilterIcon />}
                  className={typeFilter !== 'all' ? 'text-[var(--text)] bg-[var(--surface-2)]' : ''}
                >
                  {typeFilter === 'all' ? 'Add filter' : currentFilterLabel}
                  {typeFilter !== 'all' && (
                    <span
                      onClick={(e) => { e.stopPropagation(); setTypeFilter('all'); }}
                      className="ml-1 text-[var(--muted)] hover:text-[var(--text)]"
                      title="Clear filter"
                    >
                      ×
                    </span>
                  )}
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="start">
                {TYPE_FILTERS.map((f) => (
                  <DropdownMenu.Item
                    key={f.value}
                    selected={typeFilter === f.value}
                    onClick={() => { setTypeFilter(f.value); setView('events'); }}
                  >
                    {f.label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="toggle"
                size="md"
                active={liveRefresh}
                icon={liveRefresh ? <PauseIcon /> : <PlayIcon />}
                onClick={() => { setLiveRefresh(!liveRefresh); if (!liveRefresh) doFetch(); }}
                aria-pressed={liveRefresh}
                title={liveRefresh ? 'Live refresh is on, click to turn off' : 'Live refresh is off, click to turn on'}
              >
                Live refresh
              </Button>
              {/* Time range dropdown, a small 8px gap beside Live
                  refresh, like the reference. */}
              <DropdownMenu>
                <DropdownMenu.Trigger>
                  <Button
                    variant="secondary"
                    size="md"
                    icon={<ClockIcon />}
                  >
                    {currentRangeLabel} <ChevronDown />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  {TIME_RANGES.map((r) => (
                    <DropdownMenu.Item
                      key={r.value}
                      selected={timeRange === r.value}
                      onClick={() => setTimeRange(r.value)}
                    >
                      {r.label}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu>
            </div>
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="mb-4 px-4 py-2 rounded-[8px] border border-red-800/50 bg-red-900/20 text-[12px] text-red-400">
              Failed to fetch data: {error}
            </div>
          )}

          {/* ── Loading: Kumo SkeletonLine placeholders shaped like the
              dashboard panels, plus a Loader spinner while the first
              fetch is in flight. SkeletonLine takes a fixed height
              via className (it is an 8px line by default) and full
              width via minWidth/maxWidth 100. ── */}
          {loading && !data ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 py-2 text-[12px] text-[var(--muted)]">
                <Loader size="sm" aria-label="Loading live stats" />
                Loading live stats
              </div>
              <SkeletonLine minWidth={100} maxWidth={100} className="h-[110px] rounded-[12px] border border-[var(--border)]" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <SkeletonLine key={n} minWidth={100} maxWidth={100} className="h-[150px] rounded-[12px] border border-[var(--border)]" />
                ))}
              </div>
              <SkeletonLine minWidth={100} maxWidth={100} className="h-[360px] rounded-[12px] border border-[var(--border)]" />
              <SkeletonLine minWidth={100} maxWidth={100} className="h-[320px] rounded-[12px] border border-[var(--border)]" />
              <SkeletonLine minWidth={100} maxWidth={100} className="h-[340px] rounded-[12px] border border-[var(--border)]" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <SkeletonLine key={n} minWidth={100} maxWidth={100} className="h-[180px] rounded-[12px] border border-[var(--border)]" />
                ))}
              </div>
            </div>
          ) : view === 'events' ? (
            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-4 md:px-5">
              <p className="text-[12px] text-[var(--muted)] mb-3">
                {filteredEvents.length} of {data?.recent?.length || 0} most recent events
                {typeFilter !== 'all' ? ` · ${currentFilterLabel}` : ''} · {currentRangeLabel}
              </p>
              <EventsTable events={filteredEvents} loading={false} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status codes bar */}
              <div className="animate-enter" style={{ animationDelay: '0ms' }}>
                <StatusCodesBar data={data} />
              </div>

              {/* KPI cards */}
              <div className="animate-enter" style={{ animationDelay: '40ms' }}>
                <KpiCards data={data} timeRange={timeRange} />
              </div>

              {/* Requests by country + device type: Cloudflare's
                  dashboard config (user-supplied 2026-11-10) puts the
                  globe at width 7 and the donut at width 5 of 12, so
                  the globe is wider. Side by side on wide screens,
                  stacked below the xl breakpoint. */}
              <div className="animate-enter grid grid-cols-1 gap-4 xl:grid-cols-12" style={{ animationDelay: '80ms' }}>
                <div className="xl:col-span-7">
                  <CountryGlobe data={data} dark={dark} />
                </div>
                <div className="xl:col-span-5">
                  <DeviceTypeChart data={data} dark={dark} />
                </div>
              </div>

              {/* Requests over time */}
              <div className="animate-enter" style={{ animationDelay: '120ms' }}>
                <RequestsChart data={data} since={rangeSince} timeRange={timeRange} dark={dark} />
              </div>

              {/* Bottom tables: 3 columns on wide screens, 2 at lg,
                  stacked below. Cloudflare's Traffic overview order:
                  row 1 paths / client IPs / hosts, row 2 OS /
                  browsers / user agents, row 3 HTTP versions / cache
                  statuses / origin status codes. */}
              <div className="animate-enter grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" style={{ animationDelay: '160ms' }}>
                <TopList title="Top paths" items={topPaths} />
                <TopList title="Top client IPs" items={topClientIps} />
                <TopList title="Top hosts" items={topHosts} />
                <TopList title="Top operating systems" items={topOS} />
                <TopList title="Top browsers" items={topBrowsers} />
                <TopList title="Top user agents" items={topUserAgents} />
                <TopList title="Top HTTP versions" items={topHttpVersions} />
                <TopList title="Top cache statuses" items={topCacheStatuses} />
                <TopList title="Top origin status codes" items={topOriginStatusCodes} />
              </div>
            </div>
          )}
        </div>

        {/* Footer, like the FinGuard site */}
        <footer className={`fixed bottom-0 right-0 z-40 print:hidden border-t border-[var(--border)] bg-[var(--bg)] px-4 h-12 flex items-center justify-between gap-2 text-xs text-[var(--muted)] transition-[left] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] left-0 ${sidebarOpen ? 'md:left-[220px]' : 'md:left-[55px]'}`}>
          <span className="flex items-center gap-1.5">
            <img src="/india-flag.png" alt="India" width="17" height="11" className="shrink-0 rounded-[2px] shadow-[0_0_1px_rgba(255,255,255,0.35)] object-cover" />
            Bengaluru
          </span>
          <span>&copy; 2026 Abhishek Kumar</span>
        </footer>
      </main>
    </SidebarProvider>
  );
}
