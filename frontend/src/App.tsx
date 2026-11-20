import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider } from './context/AuthContext';
import { RaceProvider, useRace } from './context/RaceContext';
import { ArcadeHeader, ArcadeTab } from './components/arcade/ArcadeHeader';
import {
  ArcadePlayStage,
  ARCADE_PAINTS,
  PaintSwatch,
  WorldTheme,
} from './components/arcade/ArcadePlayStage';
import {
  StatsPanel,
  GaragePanel,
  LeaderboardPanel,
  FriendsPanel,
  AccountPanel,
} from './components/arcade/ArcadeSubPanels';
import { WheelStyleId } from './components/common/SvgCar';

const VALID_TABS: ArcadeTab[] = ['play', 'stats', 'garage', 'leaderboard', 'friends', 'account'];
const WHEEL_ORDER: WheelStyleId[] = ['silver', 'gold', 'cyan', 'red', 'stealth'];
const WORLD_ORDER: WorldTheme[] = ['sunset', 'neon', 'alpine'];

const readHashTab = (): ArcadeTab => {
  if (typeof window === 'undefined') return 'play';
  const raw = window.location.hash.replace('#', '').toLowerCase() as ArcadeTab;
  return VALID_TABS.includes(raw) ? raw : 'play';
};

const AppContent: React.FC = () => {
  const { joinPrivateRoom } = useRace();

  const [activeTab, setActiveTab] = useState<ArcadeTab>(readHashTab);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [privateRaceActive, setPrivateRaceActive] = useState<boolean>(false);

  // Persisted Scenic World Theme (Defaults to Sunset Grand Prix — completely original!)
  const [worldTheme, setWorldTheme] = useState<WorldTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('keysprint_world_theme') as WorldTheme | null;
      if (saved && WORLD_ORDER.includes(saved)) return saved;
    }
    return 'sunset';
  });

  // Persisted Car Paint & Wheel Rims
  const [paint, setPaint] = useState<PaintSwatch>(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('keysprint_car_paint');
      const found = ARCADE_PAINTS.find((p) => p.id === savedId);
      if (found) return found;
    }
    return ARCADE_PAINTS[0];
  });

  const [wheelStyle, setWheelStyle] = useState<WheelStyleId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('keysprint_wheel_style') as WheelStyleId | null;
      if (saved && WHEEL_ORDER.includes(saved)) return saved;
    }
    return 'gold';
  });

  const handleCycleWorld = () => {
    const idx = WORLD_ORDER.indexOf(worldTheme);
    const next = WORLD_ORDER[(idx + 1) % WORLD_ORDER.length];
    setWorldTheme(next);
    localStorage.setItem('keysprint_world_theme', next);
  };

  const handleSelectPaint = (next: PaintSwatch) => {
    setPaint(next);
    localStorage.setItem('keysprint_car_paint', next.id);
  };

  const handleCycleWheels = () => {
    const idx = WHEEL_ORDER.indexOf(wheelStyle);
    const next = WHEEL_ORDER[(idx + 1) % WHEEL_ORDER.length];
    setWheelStyle(next);
    localStorage.setItem('keysprint_wheel_style', next);
  };

  const navigateTab = useCallback(
    (next: ArcadeTab) => {
      if (next === activeTab) return;
      if (typeof window !== 'undefined') {
        window.history.pushState({ tab: next }, '', `#${next}`);
      }
      setActiveTab(next);
    },
    [activeTab]
  );

  // Browser Back / Forward support
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const next = e.state?.tab as ArcadeTab | undefined;
      if (next && VALID_TABS.includes(next)) {
        setActiveTab(next);
      } else {
        setActiveTab(readHashTab());
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Invite URL ?room=CODE support
  const inviteHandledRef = useRef(false);
  useEffect(() => {
    if (inviteHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      inviteHandledRef.current = true;
      window.history.replaceState({}, document.title, `${window.location.pathname}#friends`);
      setActiveTab('friends');
      joinPrivateRoom(code).catch(() => {});
    }
  }, [joinPrivateRoom]);

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    navigateTab('account');
  };

  const mFar =
    worldTheme === 'neon' ? '#131d47' : worldTheme === 'alpine' ? '#2c6887' : '#3b194d';
  const mNear =
    worldTheme === 'neon' ? '#0b1029' : worldTheme === 'alpine' ? '#1b4757' : '#241136';
  const floodGlow =
    worldTheme === 'neon' ? '#22d3ee' : worldTheme === 'alpine' ? '#fef9c3' : '#fde68a';

  return (
    <div className="ar-world" data-world={worldTheme}>
      {/* ORIGINAL CINEMATIC GRAND PRIX HORIZON BACKDROP */}
      <div className="ar-bg-scenery" aria-hidden="true">
        <div className="ar-bg-sky" />
        <div className="ar-bg-sun" />

        {/* Layered Mountain Peaks + Grand Prix Floodlight Towers + Skyline */}
        <svg
          className="ar-bg-horizon-svg"
          viewBox="0 0 1440 210"
          preserveAspectRatio="none"
          width="100%"
          height="210"
        >
          {/* Distant Mountain Ridge */}
          <path
            d="M0 210 L0 135 L160 72 L320 128 L510 56 L720 122 L920 64 L1120 118 L1310 52 L1440 108 L1440 210 Z"
            fill={mFar}
            opacity="0.88"
          />
          {/* Closer Foothills & City Skyline Silhouette */}
          <path
            d="M0 210 L0 155 L110 120 L240 150 L390 105 L560 152 L750 115 L960 148 L1150 102 L1340 146 L1440 128 L1440 210 Z"
            fill={mNear}
          />
          {/* Left & Right Grand Prix Stadium Floodlight Towers */}
          <g stroke="rgba(255,255,255,0.28)" strokeWidth="3">
            <line x1="110" y1="210" x2="110" y2="54" />
            <line x1="1330" y1="210" x2="1330" y2="54" />
          </g>
          <g fill={floodGlow} opacity="0.9">
            <rect x="92" y="44" width="36" height="10" rx="3" />
            <rect x="1312" y="44" width="36" height="10" rx="3" />
            <circle cx="110" cy="49" r="24" opacity="0.22" />
            <circle cx="1330" cy="49" r="24" opacity="0.22" />
          </g>
          {/* Modern City Silhouette Left & Right */}
          <g fill={mNear} opacity="0.95">
            <rect x="16" y="128" width="32" height="82" />
            <rect x="54" y="102" width="28" height="108" />
            <rect x="148" y="138" width="44" height="72" />
            <rect x="1220" y="124" width="40" height="86" />
            <rect x="1268" y="96" width="34" height="114" />
            <rect x="1372" y="132" width="42" height="78" />
          </g>
        </svg>

        <div className="ar-bg-stands" />
        <div className="ar-bg-curb" />
        <div className="ar-bg-road">
          <div className="ar-bg-road-dashes" />
          <div className="ar-bg-finish-line" />
        </div>
      </div>

      {/* CLEAN TOP BAR & GAME NAV */}
      <ArcadeHeader
        activeTab={activeTab}
        onSelectTab={navigateTab}
        onOpenAuth={handleOpenAuth}
      />

      {/* CENTER FRAMED ARCADE GAME STAGE */}
      <main className="ar-stage-outer">
        <div className="ar-stage-frame">
          {activeTab === 'play' && (
            <ArcadePlayStage
              onSelectTab={navigateTab}
              paint={paint}
              onSelectPaint={handleSelectPaint}
              wheelStyle={wheelStyle}
              onCycleWheels={handleCycleWheels}
              worldTheme={worldTheme}
              onCycleWorld={handleCycleWorld}
              autoStartPrivate={privateRaceActive}
            />
          )}

          {activeTab === 'stats' && (
            <StatsPanel onBack={() => navigateTab('play')} />
          )}

          {activeTab === 'garage' && (
            <GaragePanel
              onBack={() => navigateTab('play')}
              paint={paint}
              onSelectPaint={handleSelectPaint}
              wheelStyle={wheelStyle}
            />
          )}

          {activeTab === 'leaderboard' && (
            <LeaderboardPanel onBack={() => navigateTab('play')} />
          )}

          {activeTab === 'friends' && (
            <FriendsPanel
              onBack={() => navigateTab('play')}
              onEnterRoomRace={() => {
                setPrivateRaceActive(true);
                navigateTab('play');
              }}
            />
          )}

          {activeTab === 'account' && (
            <AccountPanel
              initialMode={authMode}
              onSuccess={(tab) => navigateTab(tab)}
              onBack={() => navigateTab('play')}
            />
          )}
        </div>
      </main>

      {/* SLIM CLEAN FOOTER */}
      <footer className="ar-footer">
        &copy; {new Date().getFullYear()} KeySprint &bull; Real-Time Multiplayer Typing Racing
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <RaceProvider>
        <AppContent />
      </RaceProvider>
    </AuthProvider>
  );
};

export default App;
