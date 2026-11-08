import * as React from 'react';
import { useState } from 'react';
import { ScreenSwitcherToolbar, ViewportMode, SCREEN_INVENTORY } from './components/layout/ScreenSwitcherToolbar';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { CarModelId } from './components/common/SvgCar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RaceProvider, useRace } from './context/RaceContext';

// PUBLIC SCREENS
import { Screen01Homepage } from './screens/public/Screen01Homepage';
import { Screen02HowToPlay } from './screens/public/Screen02HowToPlay';
import { Screen03About } from './screens/public/Screen03About';

// AUTH SCREENS
import { Screen04SignUp } from './screens/auth/Screen04SignUp';
import { Screen05Login } from './screens/auth/Screen05Login';
import { Screen06ForgotPassword } from './screens/auth/Screen06ForgotPassword';
import { Screen07ResetPassword } from './screens/auth/Screen07ResetPassword';
import { Screen08EmailVerification } from './screens/auth/Screen08EmailVerification';
import { Screen09GuestEntry } from './screens/auth/Screen09GuestEntry';

// GAMEPLAY SCREENS
import { Screen10RaceModeSelect } from './screens/gameplay/Screen10RaceModeSelect';
import { Screen11MatchmakingQueue } from './screens/gameplay/Screen11MatchmakingQueue';
import { Screen12PreRaceLobby } from './screens/gameplay/Screen12PreRaceLobby';
import { Screen13LiveRace } from './screens/gameplay/Screen13LiveRace';
import { Screen14Practice } from './screens/gameplay/Screen14Practice';
import { Screen15BotRace } from './screens/gameplay/Screen15BotRace';
import { Screen16RaceResults } from './screens/gameplay/Screen16RaceResults';
import { Screen17CreateRoom } from './screens/gameplay/Screen17CreateRoom';
import { Screen18RoomLobby } from './screens/gameplay/Screen18RoomLobby';

// ACCOUNT SCREENS
import { Screen19Dashboard } from './screens/account/Screen19Dashboard';
import { Screen20Profile } from './screens/account/Screen20Profile';
import { Screen21EditProfile } from './screens/account/Screen21EditProfile';
import { Screen22Statistics } from './screens/account/Screen22Statistics';
import { Screen23RaceHistory } from './screens/account/Screen23RaceHistory';

// GARAGE & SHOP
import { Screen24Garage } from './screens/garage_shop/Screen24Garage';
import { Screen25Shop } from './screens/garage_shop/Screen25Shop';
import { Screen26PurchaseModal } from './screens/garage_shop/Screen26PurchaseModal';
import { Screen27Achievements } from './screens/garage_shop/Screen27Achievements';
import { Screen28DailyChallenges } from './screens/garage_shop/Screen28DailyChallenges';

// SOCIAL & TOURNAMENTS
import { Screen29Leaderboard } from './screens/social/Screen29Leaderboard';
import { Screen30Friends } from './screens/social/Screen30Friends';
import { Screen31Notifications } from './screens/social/Screen31Notifications';
import { Screen32Tournaments } from './screens/social/Screen32Tournaments';

// PRACTICE & LEARNING
import { Screen33PracticeModes } from './screens/learning/Screen33PracticeModes';
import { Screen34PracticeResults } from './screens/learning/Screen34PracticeResults';

// SETTINGS & SUPPORT
import { Screen35Settings } from './screens/settings/Screen35Settings';
import { Screen36HelpFAQ } from './screens/settings/Screen36HelpFAQ';
import { Screen37ContactReport } from './screens/settings/Screen37ContactReport';
import { Screen38Legal } from './screens/settings/Screen38Legal';
import { Screen39SystemStates } from './screens/settings/Screen39SystemStates';

// ADMIN PANEL
import { AdminLayout } from './screens/admin/AdminLayout';
import { Admin01Overview } from './screens/admin/Admin01Overview';
import { Admin02UserManagement } from './screens/admin/Admin02UserManagement';
import { Admin03PassageCMS } from './screens/admin/Admin03PassageCMS';
import { Admin04GameConfig } from './screens/admin/Admin04GameConfig';
import { Admin05GarageShopConfig } from './screens/admin/Admin05GarageShopConfig';
import { Admin06RewardsXPConfig } from './screens/admin/Admin06RewardsXPConfig';
import { Admin07AntiCheat } from './screens/admin/Admin07AntiCheat';
import { Admin08Analytics } from './screens/admin/Admin08Analytics';
import { Admin09StaffAudit } from './screens/admin/Admin09StaffAudit';

// RESPONSIVE & OVERVIEW
import { ScreenResponsiveViews } from './screens/responsive/ScreenResponsiveViews';
import { ScreenOverviewBoard } from './screens/overview/ScreenOverviewBoard';

const AppContent: React.FC = () => {
  const { user, updateCoins, equipCar, purchaseCar } = useAuth();
  const { incomingChallenge, dismissChallenge, joinPrivateRoom } = useRace();
  const [currentScreenId, setCurrentScreenId] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return window.location.hash.replace('#', '') || 'screen-01';
    }
    return 'screen-01';
  });

  const handleNavigate = React.useCallback((nextScreenId: string) => {
    if (nextScreenId === currentScreenId) return;
    if (typeof window !== 'undefined') {
      window.history.pushState({ screenId: nextScreenId }, '', `#${nextScreenId}`);
    }
    setCurrentScreenId(nextScreenId);
  }, [currentScreenId]);

  React.useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.screenId) {
        setCurrentScreenId(e.state.screenId);
      } else if (typeof window !== 'undefined') {
        const hash = window.location.hash.replace('#', '');
        setCurrentScreenId(hash || 'screen-01');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [showDevToolbar, setShowDevToolbar] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('dev') === 'true';
    }
    return false;
  });

  // Toggle Dev Toolbar hotkey (Ctrl+Shift+D or Cmd+Shift+D)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setShowDevToolbar(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle URL invite parameter ?room=CODE
  const inviteHandledRef = React.useRef(false);
  React.useEffect(() => {
    if (inviteHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const roomCodeParam = params.get('room');
    if (roomCodeParam) {
      inviteHandledRef.current = true;
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      joinPrivateRoom(roomCodeParam).then((res) => {
        if (res.success) {
          setCurrentScreenId('screen-18');
        } else {
          setCurrentScreenId('screen-17');
        }
      });
    }
  }, [joinPrivateRoom]);

  const liveCoins = user?.stats?.coins ?? 0;
  const liveLevel = user?.stats?.level ?? 1;
  const equippedCarItem = user?.inventory?.find(i => i.isEquipped);
  const liveEquippedCar: CarModelId = (equippedCarItem?.itemId as CarModelId) || 'blaze';

  const isAdminScreen = currentScreenId.startsWith('admin-');

  // Render Screen Content
  const renderScreen = () => {
    // ADMIN SCREENS (Wrapped in AdminLayout)
    if (isAdminScreen) {
      return (
        <AdminLayout
          currentAdminId={currentScreenId}
          onNavigateAdmin={(id: string) => handleNavigate(id)}
          onExitAdmin={() => handleNavigate('screen-01')}
        >
          {currentScreenId === 'admin-01' && <Admin01Overview />}
          {currentScreenId === 'admin-02' && <Admin02UserManagement />}
          {currentScreenId === 'admin-03' && <Admin03PassageCMS />}
          {currentScreenId === 'admin-04' && <Admin04GameConfig />}
          {currentScreenId === 'admin-05' && <Admin05GarageShopConfig />}
          {currentScreenId === 'admin-06' && <Admin06RewardsXPConfig />}
          {currentScreenId === 'admin-07' && <Admin07AntiCheat />}
          {currentScreenId === 'admin-08' && <Admin08Analytics />}
          {currentScreenId === 'admin-09' && <Admin09StaffAudit />}
        </AdminLayout>
      );
    }

    // REGULAR & SHOWCASE SCREENS
    switch (currentScreenId) {
      // SECTION A — PUBLIC
      case 'screen-01':
        return <Screen01Homepage onNavigate={handleNavigate} />;
      case 'screen-02':
        return <Screen02HowToPlay onNavigate={handleNavigate} />;
      case 'screen-03':
        return <Screen03About onNavigate={handleNavigate} />;

      // SECTION B — AUTH
      case 'screen-04':
        return <Screen04SignUp onNavigate={handleNavigate} />;
      case 'screen-05':
        return <Screen05Login onNavigate={handleNavigate} />;
      case 'screen-06':
        return <Screen06ForgotPassword onNavigate={handleNavigate} />;
      case 'screen-07':
        return <Screen07ResetPassword onNavigate={handleNavigate} />;
      case 'screen-08':
        return <Screen08EmailVerification onNavigate={handleNavigate} />;
      case 'screen-09':
        return <Screen09GuestEntry onNavigate={handleNavigate} />;

      // SECTION C — GAMEPLAY
      case 'screen-10':
        return <Screen10RaceModeSelect onNavigate={handleNavigate} />;
      case 'screen-11':
        return <Screen11MatchmakingQueue onNavigate={handleNavigate} />;
      case 'screen-12':
        return <Screen12PreRaceLobby onNavigate={handleNavigate} />;
      case 'screen-13':
        return <Screen13LiveRace onNavigate={handleNavigate} />;
      case 'screen-14':
        return <Screen14Practice onNavigate={handleNavigate} />;
      case 'screen-15':
        return <Screen15BotRace onNavigate={handleNavigate} />;
      case 'screen-16':
        return <Screen16RaceResults onNavigate={handleNavigate} />;
      case 'screen-17':
        return <Screen17CreateRoom onNavigate={handleNavigate} />;
      case 'screen-18':
        return <Screen18RoomLobby onNavigate={handleNavigate} />;

      // SECTION D — ACCOUNT
      case 'screen-19':
        return <Screen19Dashboard onNavigate={handleNavigate} level={liveLevel} />;
      case 'screen-20':
        return <Screen20Profile onNavigate={handleNavigate} />;
      case 'screen-21':
        return <Screen21EditProfile onNavigate={handleNavigate} />;
      case 'screen-22':
        return <Screen22Statistics onNavigate={handleNavigate} />;
      case 'screen-23':
        return <Screen23RaceHistory onNavigate={handleNavigate} />;

      // SECTION E — GARAGE & SHOP
      case 'screen-24':
        return (
          <Screen24Garage 
            onNavigate={handleNavigate}
            equippedCarId={liveEquippedCar}
          />
        );
      case 'screen-25':
        return (
          <Screen25Shop 
            onNavigate={handleNavigate}
            coins={liveCoins}
          />
        );
      case 'screen-26':
        return (
          <div className="py-5 text-center">
            <Screen26PurchaseModal
              item={{
                name: 'Golden Flash Hypercar',
                price: 1800,
                category: 'Epic',
                carId: 'golden',
                desc: 'Gold-plated aerodynamic composite chassis.'
              }}
              userCoins={liveCoins}
              onClose={() => handleNavigate('screen-25')}
              onConfirm={async (cost: number) => {
                await purchaseCar('golden', cost);
                handleNavigate('screen-24');
              }}
            />
          </div>
        );
      case 'screen-27':
        return <Screen27Achievements onNavigate={handleNavigate} />;
      case 'screen-28':
        return (
          <Screen28DailyChallenges 
            onNavigate={handleNavigate}
            onClaimReward={(c: number) => updateCoins(liveCoins + c)}
          />
        );

      // SECTION F — SOCIAL
      case 'screen-29':
        return <Screen29Leaderboard onNavigate={handleNavigate} />;
      case 'screen-30':
        return <Screen30Friends onNavigate={handleNavigate} />;
      case 'screen-31':
        return <Screen31Notifications onNavigate={handleNavigate} />;
      case 'screen-32':
        return <Screen32Tournaments onNavigate={handleNavigate} />;

      // SECTION G — PRACTICE
      case 'screen-33':
        return <Screen33PracticeModes onNavigate={handleNavigate} />;
      case 'screen-34':
        return <Screen34PracticeResults onNavigate={handleNavigate} />;

      // SECTION H — SETTINGS & SUPPORT
      case 'screen-35':
        return <Screen35Settings onNavigate={handleNavigate} />;
      case 'screen-36':
        return <Screen36HelpFAQ onNavigate={handleNavigate} />;
      case 'screen-37':
        return <Screen37ContactReport onNavigate={handleNavigate} />;
      case 'screen-38':
        return <Screen38Legal onNavigate={handleNavigate} />;
      case 'screen-39':
        return <Screen39SystemStates onNavigate={handleNavigate} />;

      // SECTION J & K — RESPONSIVE & OVERVIEW
      case 'responsive-views':
        return <ScreenResponsiveViews onNavigate={handleNavigate} />;
      case 'overview-board':
        return <ScreenOverviewBoard onSelectScreen={handleNavigate} />;

      default:
        return <Screen01Homepage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className={`app-root viewport-${showDevToolbar ? viewport : 'desktop'}`}>
      {/* MASTER TOP TOOLBAR (Only shown when explicitly toggled by dev/reviewer) */}
      {showDevToolbar && (
        <ScreenSwitcherToolbar
          currentScreenId={currentScreenId}
          onSelectScreen={handleNavigate}
          viewport={viewport}
          onSetViewport={setViewport}
        />
      )}

      {/* VIEWPORT RESIZING FRAME */}
      <div className={`viewport-frame-container ${showDevToolbar ? viewport : 'desktop'}`}>
        <div className="viewport-inner-canvas">
          {/* Main Website Header (unless on Admin screen) */}
          {!isAdminScreen && (
            <Header
              currentScreenId={currentScreenId}
              onNavigate={handleNavigate}
              coins={liveCoins}
              level={liveLevel}
            />
          )}

          {/* REAL-TIME INCOMING CHALLENGE TOAST */}
          {incomingChallenge && (
            <div className="card-cream border-orange p-3 mx-4 my-2 flex-between shadow-lg" style={{ borderRadius: 12 }}>
              <div className="flex-center gap-2">
                <span style={{ fontSize: 24 }}>{incomingChallenge.challengerAvatar || '🏎️'}</span>
                <div>
                  <strong>{incomingChallenge.challengerName}</strong> challenged you to a race!
                  <span className="text-xs text-secondary block font-mono">Room Code: {incomingChallenge.roomCode}</span>
                </div>
              </div>
              <div className="flex-center gap-2">
                <button
                  className="btn btn-primary btn-sm flex-center gap-1"
                  onClick={async () => {
                    const code = incomingChallenge.roomCode;
                    dismissChallenge();
                    await joinPrivateRoom(code);
                    handleNavigate('screen-18');
                  }}
                >
                  <span>Accept & Race</span>
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={dismissChallenge}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Active Screen View */}
          <div className="screen-active-viewport">
            {renderScreen()}
          </div>

          {/* Main Website Footer (unless on Admin screen or Live Race) */}
          {!isAdminScreen && currentScreenId !== 'screen-13' && (
            <Footer onNavigate={handleNavigate} />
          )}
        </div>
      </div>

      {/* Subtle floating dev tools toggle */}
      <button
        onClick={() => setShowDevToolbar(prev => !prev)}
        style={{
          position: 'fixed',
          bottom: 12,
          right: 12,
          zIndex: 9999,
          background: showDevToolbar ? '#EA580C' : 'rgba(30, 41, 59, 0.85)',
          color: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: 20,
          padding: '5px 12px',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          backdropFilter: 'blur(6px)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          opacity: 0.7,
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
        title="Toggle Screen Switcher Dev Toolbar (Ctrl+Shift+D)"
      >
        <span>{showDevToolbar ? '✕' : '🛠️'}</span>
        <span>{showDevToolbar ? 'Hide Dev Bar' : 'Screens (50+)'}</span>
      </button>
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
