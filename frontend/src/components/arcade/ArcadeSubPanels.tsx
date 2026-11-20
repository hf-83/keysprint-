import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  Lock,
  Copy,
  Users,
  Play,
  Trophy,
  Loader2,
  Search,
  Edit3,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRace } from '../../context/RaceContext';
import { api } from '../../services/api';
import { CARS_DATA } from '../../data/carsData';
import { GLOBAL_LEADERBOARD } from '../../data/mockData';
import { SvgCar, CarModelId, WheelStyleId } from '../common/SvgCar';
import { getTopWeakKeys } from '../../services/telemetryService';
import { ARCADE_PAINTS, PaintSwatch } from './ArcadePlayStage';
import { ArcadeTab } from './ArcadeHeader';
import { RaceRecord } from '../../types';

/* ==========================================================================
   1. STATS PANEL
   ========================================================================== */
export const StatsPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const [history, setHistory] = useState<RaceRecord[]>([]);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(user?.profile?.nickname || '');

  useEffect(() => {
    setNameDraft(user?.profile?.nickname || '');
  }, [user?.profile?.nickname]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .getRaceHistory()
      .then((res) => {
        if (Array.isArray(res?.history)) setHistory(res.history.slice(0, 6));
      })
      .catch(() => {});
  }, [isAuthenticated, user?.stats?.racesCount]);

  const weakKeys = getTopWeakKeys(5);

  const saveName = async () => {
    if (!nameDraft.trim()) return;
    try {
      await updateProfile({ nickname: nameDraft.trim() });
      setEditing(false);
    } catch {
      setEditing(false);
    }
  };

  return (
    <div className="ar-panel-view">
      <div className="ar-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 className="ar-panel-title">Driver Stats</h2>
          {isAuthenticated &&
            (editing ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="ar-input"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  style={{ width: 150, padding: '4px 8px', fontSize: 13 }}
                />
                <button type="button" className="ar-btn ar-btn-teal" onClick={saveName} style={{ padding: '4px 10px' }}>
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="ar-btn ar-btn-light"
                onClick={() => setEditing(true)}
                style={{ padding: '5px 10px', fontSize: 12 }}
              >
                <Edit3 size={12} />
                <span>{user?.profile?.nickname || 'Driver'}</span>
              </button>
            ))}
        </div>

        <button type="button" className="ar-btn ar-btn-navy" onClick={onBack}>
          <ArrowLeft size={14} />
          <span>Back to Play</span>
        </button>
      </div>

      <div className="ar-stat-row">
        <div className="ar-stat-tile">
          <strong>{user?.stats?.verifiedBestWpm ?? 0}</strong>
          <span>Best WPM</span>
        </div>
        <div className="ar-stat-tile">
          <strong>{Math.round(user?.stats?.avgWpm ?? 0)}</strong>
          <span>Avg WPM</span>
        </div>
        <div className="ar-stat-tile">
          <strong style={{ color: '#0d9488' }}>{Math.round(user?.stats?.accuracy ?? 100)}%</strong>
          <span>Accuracy</span>
        </div>
        <div className="ar-stat-tile">
          <strong>
            {user?.stats?.racesCount ?? 0} / {user?.stats?.winsCount ?? 0}W
          </strong>
          <span>Races / Wins</span>
        </div>
      </div>

      {weakKeys.length > 0 && (
        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <strong style={{ fontSize: 13, color: '#334155' }}>Tricky Keys Detected:</strong>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {weakKeys.map((wk) => (
              <span
                key={wk.key}
                style={{
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: '#fee2e2',
                  color: '#b91c1c',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                &apos;{wk.key === ' ' ? 'Space' : wk.key}&apos; ({wk.errorRate}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 ? (
        <table className="ar-table">
          <thead>
            <tr>
              <th>Mode</th>
              <th>Place</th>
              <th>Speed</th>
              <th>Accuracy</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td style={{ textTransform: 'capitalize', fontWeight: 700 }}>{h.mode}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>#{h.place}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#145369' }}>{h.wpm} WPM</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: '#0d9488', fontWeight: 700 }}>{h.accuracy}%</td>
                <td style={{ color: '#64748b' }}>{new Date(h.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: 14 }}>
          Complete your first race to record your speed history here!
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   2. GARAGE & STORE PANEL
   ========================================================================== */
export const GaragePanel: React.FC<{
  onBack: () => void;
  paint: PaintSwatch;
  onSelectPaint: (p: PaintSwatch) => void;
  wheelStyle: WheelStyleId;
}> = ({ onBack, paint, onSelectPaint, wheelStyle }) => {
  const { user, equipCar, purchaseCar } = useAuth();
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const ownedIds = new Set<string>([
    'starter',
    'blaze',
    ...(user?.inventory?.filter((i) => i.itemType === 'car' || !i.itemType).map((i) => i.itemId) || []),
  ]);
  const equippedId: CarModelId =
    (user?.inventory?.find((i) => i.isEquipped)?.itemId as CarModelId) || 'blaze';
  const coins = user?.stats?.coins ?? 250;

  const handleCarClick = async (carId: CarModelId, price: number) => {
    setBusyId(carId);
    setMsg(null);
    try {
      if (ownedIds.has(carId)) {
        await equipCar(carId);
        setMsg('Car equipped!');
      } else {
        if (coins < price) {
          setMsg(`You need ${price.toLocaleString()} coins to unlock this car.`);
          return;
        }
        const res = await purchaseCar(carId, price, 'car');
        if (res.success) {
          await equipCar(carId);
          setMsg('Unlocked & equipped!');
        } else {
          setMsg(res.error || 'Could not unlock right now.');
        }
      }
    } finally {
      setBusyId(null);
      setTimeout(() => setMsg(null), 2600);
    }
  };

  return (
    <div className="ar-panel-view">
      <div className="ar-panel-header">
        <div>
          <h2 className="ar-panel-title">Garage &amp; Store</h2>
          <span style={{ fontSize: 12.5, color: '#64748b' }}>
            Balance: <strong style={{ color: '#92400e' }}>🪙 {coins.toLocaleString()}</strong> • Paint: <strong>{paint.name}</strong>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {msg && (
            <span style={{ padding: '5px 10px', borderRadius: 999, background: '#dcfce7', color: '#166534', fontSize: 12, fontWeight: 700 }}>
              {msg}
            </span>
          )}
          <button type="button" className="ar-btn ar-btn-navy" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Back to Play</span>
          </button>
        </div>
      </div>

      {/* Paint Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>Paint:</span>
        {ARCADE_PAINTS.map((sw) => (
          <button
            key={sw.id}
            type="button"
            className={`ar-swatch ${paint.id === sw.id ? 'active' : ''}`}
            style={{ background: sw.primary, borderColor: paint.id === sw.id ? '#0f172a' : '#cbd5e1' }}
            title={sw.name}
            onClick={() => onSelectPaint(sw)}
          />
        ))}
      </div>

      {/* Cars Grid */}
      <div className="ar-card-grid">
        {CARS_DATA.slice(0, 8).map((car) => {
          const owned = ownedIds.has(car.id);
          const equipped = equippedId === car.id;
          return (
            <div key={car.id} className={`ar-car-card ${equipped ? 'equipped' : ''}`}>
              <SvgCar id={car.id} size={104} paintOverride={equipped ? paint : null} wheelStyle={wheelStyle} />
              <div style={{ fontWeight: 800, fontSize: 14 }}>{car.name}</div>
              <button
                type="button"
                className={`ar-btn ${equipped ? 'ar-btn-teal' : owned ? 'ar-btn-navy' : 'ar-btn-red'}`}
                style={{ width: '100%', padding: '7px 10px', fontSize: 12.5 }}
                disabled={equipped || busyId === car.id}
                onClick={() => handleCarClick(car.id, car.price)}
              >
                {equipped ? (
                  <>
                    <Check size={13} /> Equipped
                  </>
                ) : owned ? (
                  'Select Car'
                ) : (
                  <>
                    <Lock size={12} /> {car.price} 🪙
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ==========================================================================
   3. TOP 500 LEADERBOARD PANEL
   ========================================================================== */
export const LeaderboardPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Array<{ rank: number; name: string; wpm: number; accuracy: number; races: number; userId?: string }>>([]);

  useEffect(() => {
    let alive = true;
    api
      .getLeaderboard()
      .then((res) => {
        if (alive && Array.isArray(res?.leaderboard) && res.leaderboard.length > 0) {
          setRows(
            res.leaderboard.map((item: any, idx: number) => ({
              rank: item.rank || idx + 1,
              userId: item.userId,
              name: item.nickname || 'Driver',
              wpm: item.wpm || 0,
              accuracy: item.accuracy || 100,
              races: item.races || 1,
            }))
          );
          setLoading(false);
          return;
        }
        if (alive) {
          setRows(GLOBAL_LEADERBOARD.map((g) => ({ rank: g.rank, name: g.name, wpm: g.wpm, accuracy: g.accuracy, races: g.races })));
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setRows(GLOBAL_LEADERBOARD.map((g) => ({ rank: g.rank, name: g.name, wpm: g.wpm, accuracy: g.accuracy, races: g.races })));
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="ar-panel-view">
      <div className="ar-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Trophy size={22} color="#d97706" />
          <h2 className="ar-panel-title">Top 500 Racers</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              className="ar-input"
              placeholder="Search racer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 170, padding: '7px 10px 7px 30px', fontSize: 13 }}
            />
          </div>
          <button type="button" className="ar-btn ar-btn-navy" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Back to Play</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
          <Loader2 size={24} className="ks-spinner" />
        </div>
      ) : (
        <table className="ar-table">
          <thead>
            <tr>
              <th style={{ width: 64 }}>Rank</th>
              <th>Driver</th>
              <th>Best Speed</th>
              <th>Accuracy</th>
              <th>Races</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 12).map((r) => {
              const isMe = (user?.id && r.userId === user.id) || (user?.profile?.nickname && r.name === user.profile.nickname);
              return (
                <tr key={`${r.rank}-${r.name}`} className={isMe ? 'me' : ''}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                    {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                  </td>
                  <td style={{ fontWeight: 700 }}>{r.name} {isMe ? '(You)' : ''}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#d9261c' }}>{r.wpm} WPM</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#0d9488', fontWeight: 700 }}>{r.accuracy}%</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#64748b' }}>{r.races}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

/* ==========================================================================
   4. FRIENDS / PRIVATE ROOM PANEL
   ========================================================================== */
export const FriendsPanel: React.FC<{ onBack: () => void; onEnterRoomRace: () => void }> = ({
  onBack,
  onEnterRoomRace,
}) => {
  const { user } = useAuth();
  const { roomCode, roomMeta, roomError, players, createPrivateRoom, joinPrivateRoom, startPrivateRace, toggleReady, clearRoomError } = useRace();
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    clearRoomError();
    const code = `SPRINT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    createPrivateRoom({
      roomName: `${user?.profile?.nickname || 'Driver'}'s Race`,
      roomCode: code,
      maxPlayers: 4,
      trackId: 'green-valley',
      fillWithBots: true,
      botDifficulty: 'normal',
    });
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    await joinPrivateRoom(joinCode.trim());
  };

  const copyLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ar-panel-view">
      <div className="ar-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={22} color="#1878b5" />
          <h2 className="ar-panel-title">Race With Friends</h2>
        </div>
        <button type="button" className="ar-btn ar-btn-navy" onClick={onBack}>
          <ArrowLeft size={14} />
          <span>Back to Play</span>
        </button>
      </div>

      {!roomCode ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 17, fontWeight: 800 }}>Host a Private Room</h3>
            <p style={{ fontSize: 13.5, color: '#64748b' }}>
              Create an instant room code and send the link to your friends to race head-to-head.
            </p>
            <div>
              <button type="button" className="ar-btn ar-btn-red" onClick={handleCreate}>
                <Users size={15} />
                <span>Create Private Room</span>
              </button>
            </div>
          </div>

          <form
            onSubmit={handleJoin}
            style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 800 }}>Join a Friend&apos;s Room</h3>
            <p style={{ fontSize: 13.5, color: '#64748b' }}>
              Enter the room code shared by your friend (e.g. <code>SPRINT-AB12</code>).
            </p>
            {roomError && <div style={{ color: '#dc2626', fontSize: 13, fontWeight: 700 }}>{roomError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="ar-input"
                placeholder="SPRINT-XXXX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <button type="submit" className="ar-btn ar-btn-teal">
                Join
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ background: '#ffffff', border: '2px solid #0e9f8e', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0e9f8e', textTransform: 'uppercase' }}>Room Ready</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{roomCode}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="ar-btn ar-btn-light" onClick={copyLink}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Invite Link Copied!' : 'Copy Invite Link'}</span>
              </button>
              {roomMeta?.isHost ? (
                <button
                  type="button"
                  className="ar-btn ar-btn-red"
                  onClick={() => {
                    startPrivateRace();
                    onEnterRoomRace();
                  }}
                >
                  <Play size={14} fill="currentColor" />
                  <span>Start Race Now</span>
                </button>
              ) : (
                <button type="button" className="ar-btn ar-btn-teal" onClick={toggleReady}>
                  Toggle Ready
                </button>
              )}
            </div>
          </div>

          <div style={{ fontSize: 13.5, color: '#475569' }}>
            Drivers in lobby ({players.length || 1}):{' '}
            <strong>{players.map((p) => p.nickname).join(', ') || user?.profile?.nickname || 'You'}</strong>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   5. ACCOUNT (LOGIN / SIGN UP) PANEL
   ========================================================================== */
export const AccountPanel: React.FC<{
  initialMode: 'login' | 'signup';
  onSuccess: (tab: ArcadeTab) => void;
  onBack: () => void;
}> = ({ initialMode, onSuccess, onBack }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register({
          email: email.trim(),
          password,
          nickname: nickname.trim() || 'Racer',
          countryCode: 'PK',
        });
      }
      onSuccess('play');
    } catch (err: any) {
      setError(err?.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ar-panel-view" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 className="ar-panel-title" style={{ fontSize: 20 }}>
            {mode === 'login' ? 'Driver Login' : 'Create Account'}
          </h2>
          <button type="button" className="ar-btn ar-btn-light" onClick={onBack} style={{ padding: '5px 10px', fontSize: 12 }}>
            <ArrowLeft size={13} /> Back
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className={`ar-btn ${mode === 'login' ? 'ar-btn-navy' : 'ar-btn-light'}`}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={`ar-btn ${mode === 'signup' ? 'ar-btn-navy' : 'ar-btn-light'}`}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fee2e2', color: '#b91c1c', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <input
              className="ar-input"
              placeholder="Driver Nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
          )}
          <input
            className="ar-input"
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="ar-input"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <button type="submit" className="ar-btn ar-btn-red" disabled={busy} style={{ padding: '11px' }}>
            {busy ? 'Please wait...' : mode === 'login' ? 'Login & Race' : 'Create Free Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
