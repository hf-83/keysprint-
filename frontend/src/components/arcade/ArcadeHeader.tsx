import React, { useState } from 'react';
import { Gift, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';

export type ArcadeTab = 'play' | 'stats' | 'garage' | 'leaderboard' | 'friends' | 'account';

interface ArcadeHeaderProps {
  activeTab: ArcadeTab;
  onSelectTab: (tab: ArcadeTab) => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

const DAILY_GIFT_KEY = 'keysprint_daily_gift_date';

export const ArcadeHeader: React.FC<ArcadeHeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenAuth,
}) => {
  const { user, isAuthenticated, updateCoins, logout } = useAuth();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [giftClaimed, setGiftClaimed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(DAILY_GIFT_KEY) === todayStr;
  });

  const displayName = user?.profile?.nickname || 'Guest Racer';
  const coins = user?.stats?.coins ?? 250;
  const isRegistered = isAuthenticated && Boolean(user?.email);

  const handleClaimGift = () => {
    if (giftClaimed) return;
    localStorage.setItem(DAILY_GIFT_KEY, todayStr);
    setGiftClaimed(true);
    updateCoins(coins + 150);
    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.2 } });
    } catch {
      // ignore
    }
  };

  const navItems: Array<{ id: ArcadeTab; label: string }> = [
    { id: 'play', label: 'PLAY' },
    { id: 'stats', label: 'STATS' },
    { id: 'garage', label: 'GARAGE' },
    { id: 'leaderboard', label: 'TOP 500' },
    { id: 'friends', label: 'FRIENDS' },
  ];

  return (
    <header className="ar-header">
      <div className="ar-header-top">
        <div className="ar-header-left">
          <button
            type="button"
            className="ar-logo"
            onClick={() => onSelectTab('play')}
            aria-label="KeySprint Play"
          >
            <span className="ar-logo-key">Key</span>
            <span className="ar-logo-sprint">Sprint</span>
            <span className="ar-logo-arrows">&raquo;</span>
          </button>

          <button
            type="button"
            className={`ar-gift-btn ${giftClaimed ? 'claimed' : ''}`}
            onClick={handleClaimGift}
            title={giftClaimed ? 'Daily gift already claimed today!' : 'Click to bank +150 bonus coins!'}
          >
            <Gift size={22} color={giftClaimed ? '#64748b' : '#e03a26'} />
            <div className="ar-gift-text">
              <div>{giftClaimed ? 'GIFT BANKED' : 'DAILY GIFT OPEN'}</div>
              <span>{giftClaimed ? '+150 COINS ADDED' : 'CLICK TO BANK NOW'}</span>
            </div>
          </button>
        </div>

        <div className="ar-header-right">
          <button
            type="button"
            className="ar-coin-chip"
            onClick={() => onSelectTab('garage')}
            title="Your Coins — spend in Garage"
          >
            <span>🪙</span>
            <span>{coins.toLocaleString()}</span>
          </button>

          <button
            type="button"
            className="ar-user-pill"
            onClick={() => onSelectTab(isRegistered ? 'stats' : 'account')}
          >
            <User size={15} color="#0e9f8e" />
            <span>{displayName}</span>
          </button>

          {isRegistered ? (
            <button
              type="button"
              className="ar-auth-link"
              onClick={() => {
                logout();
                onSelectTab('play');
              }}
            >
              Logout
            </button>
          ) : (
            <>
              <button
                type="button"
                className="ar-auth-link"
                onClick={() => onOpenAuth('login')}
              >
                Login
              </button>
              <button
                type="button"
                className="ar-auth-link"
                onClick={() => onOpenAuth('signup')}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>

      <nav className="ar-nav-bar" aria-label="Game navigation">
        <div className="ar-nav-pill-wrap">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ar-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
};
