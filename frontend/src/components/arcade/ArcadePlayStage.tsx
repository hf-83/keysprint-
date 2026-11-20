import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Keyboard,
  Palette,
  Disc,
  ShoppingCart,
  Users,
  ArrowLeft,
  RotateCcw,
  Trophy,
  AlertTriangle,
  X,
  Sparkles,
  Flame,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SvgCar, CarModelId, WheelStyleId } from '../common/SvgCar';
import { CARS_DATA } from '../../data/carsData';
import { useRace, RacePlayer, RaceResultSummary } from '../../context/RaceContext';
import { useAuth } from '../../context/AuthContext';
import { computeTypingState } from '../../services/typingEngine';
import { recordKeystroke, getTopWeakKeys } from '../../services/telemetryService';
import { soundEngine } from '../../services/soundEngine';
import { api } from '../../services/api';
import { ArcadeTab } from './ArcadeHeader';

export type WorldTheme = 'sunset' | 'neon' | 'alpine';

export interface PaintSwatch {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  dark: string;
}

export const ARCADE_PAINTS: PaintSwatch[] = [
  { id: 'sunset', name: 'Sunset Orange', primary: '#EA580C', secondary: '#FB923C', dark: '#7C2D12' },
  { id: 'cyan', name: 'Electric Cyan', primary: '#0891B2', secondary: '#22D3EE', dark: '#164E63' },
  { id: 'emerald', name: 'Emerald', primary: '#16A34A', secondary: '#4ADE80', dark: '#14532D' },
  { id: 'crimson', name: 'Crimson', primary: '#DC2626', secondary: '#F87171', dark: '#7F1D1D' },
  { id: 'cobalt', name: 'Cobalt', primary: '#2563EB', secondary: '#60A5FA', dark: '#1E3A8A' },
  { id: 'gold', name: 'Gold Rush', primary: '#CA8A04', secondary: '#FACC15', dark: '#713F12' },
  { id: 'purple', name: 'Violet', primary: '#9333EA', secondary: '#C084FC', dark: '#581C87' },
  { id: 'stealth', name: 'Stealth', primary: '#334155', secondary: '#64748B', dark: '#0F172A' },
];

const FALLBACK_PASSAGES = [
  'Speed on the track comes from smooth rhythm and steady accuracy. Keep your eyes on the next word and let your fingers fly across the keys.',
  'Every great racer focuses on clean precision first. When your keystrokes stay sharp and accurate, your car accelerates past the entire field.',
  'Type smoothly down the asphalt highway without rushing into errors. Hold your line, nail each punctuation mark, and cross the finish line first.',
];

type StagePhase = 'hub' | 'countdown' | 'racing' | 'tricky' | 'finished';

interface ArcadePlayStageProps {
  onSelectTab: (tab: ArcadeTab) => void;
  paint: PaintSwatch;
  onSelectPaint: (paint: PaintSwatch) => void;
  wheelStyle: WheelStyleId;
  onCycleWheels: () => void;
  worldTheme: WorldTheme;
  onCycleWorld: () => void;
  autoStartPrivate?: boolean;
}

export const ArcadePlayStage: React.FC<ArcadePlayStageProps> = ({
  onSelectTab,
  paint,
  onSelectPaint,
  wheelStyle,
  onCycleWheels,
  worldTheme,
  onCycleWorld,
  autoStartPrivate = false,
}) => {
  const { user, ensureGuestSession, equipCar } = useAuth();
  const {
    roomStatus,
    passageText,
    players,
    lastResult,
    joinMatchmaking,
    startBotRace,
    leaveRoom,
    sendProgress,
    submitFinalRace,
    setPassageText,
  } = useRace();

  const [phase, setPhase] = useState<StagePhase>('hub');
  const [textMode, setTextMode] = useState<'scroll' | 'box'>('scroll');
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [botPace, setBotPace] = useState<'easy' | 'normal' | 'advanced'>('normal');
  const [showPaintTray, setShowPaintTray] = useState<boolean>(false);
  const [lightStep, setLightStep] = useState<number>(3);
  const [localCarId, setLocalCarId] = useState<CarModelId | null>(null);

  // Typing counters
  const [typedInput, setTypedInput] = useState('');
  const [totalKeys, setTotalKeys] = useState(0);
  const [correctKeys, setCorrectKeys] = useState(0);
  const [streak, setStreak] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [localResult, setLocalResult] = useState<RaceResultSummary | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [isTrickyDrill, setIsTrickyDrill] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const isFinishingRef = useRef(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ownedIds = new Set<string>([
    'starter',
    'blaze',
    ...(user?.inventory?.filter((i) => i.itemType === 'car' || !i.itemType).map((i) => i.itemId) || []),
  ]);
  const ownedCars = CARS_DATA.filter((c) => ownedIds.has(c.id));
  const equippedItem = user?.inventory?.find((i) => i.isEquipped);
  const userCarId: CarModelId = localCarId || (equippedItem?.itemId as CarModelId) || 'blaze';
  const currentCarObj = CARS_DATA.find((c) => c.id === userCarId) || CARS_DATA[0];
  const userNickname = user?.profile?.nickname || 'You';
  const prevBestWpm = user?.stats?.verifiedBestWpm ?? 0;

  const weakKeys = getTopWeakKeys(5);
  const trickyCount = Math.max(3, weakKeys.length);

  const cycleCarBody = (dir: number) => {
    const list = ownedCars.length > 0 ? ownedCars : CARS_DATA.slice(0, 3);
    const idx = list.findIndex((c) => c.id === userCarId);
    const next = list[(idx + dir + list.length) % list.length] || list[0];
    setLocalCarId(next.id);
    if (user?.id) {
      equipCar(next.id).catch(() => {});
    }
  };

  useEffect(() => {
    soundEngine.enabled = soundOn;
  }, [soundOn]);

  const clearCountdownTimer = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearCountdownTimer();
  }, []);

  const resetTyping = useCallback(() => {
    setTypedInput('');
    setTotalKeys(0);
    setCorrectKeys(0);
    setStreak(0);
    setElapsedSec(0);
    setLocalResult(null);
    setIsNewBest(false);
    isFinishingRef.current = false;
  }, []);

  // Sync live socket room transitions (for private rooms / multiplayer)
  useEffect(() => {
    if (autoStartPrivate && roomStatus === 'racing' && phase !== 'racing') {
      resetTyping();
      setIsTrickyDrill(false);
      setPhase('racing');
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [autoStartPrivate, roomStatus, phase, resetTyping]);

  // Elapsed timer during live race or tricky drill
  useEffect(() => {
    if (phase !== 'racing' && phase !== 'tricky') return;
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Launch a Race right inside this stage!
  const handleStartRace = useCallback(async () => {
    clearCountdownTimer();
    setShowPaintTray(false);
    setIsTrickyDrill(false);
    resetTyping();

    if (!user) {
      ensureGuestSession().catch(() => {});
    }

    setPhase('countdown');
    setLightStep(3);
    soundEngine.playCountdown(false);

    joinMatchmaking();
    let step = 3;
    countdownTimerRef.current = setInterval(async () => {
      step -= 1;
      if (step > 0) {
        setLightStep(step);
        soundEngine.playCountdown(false);
      } else {
        clearCountdownTimer();
        setLightStep(0);
        soundEngine.playCountdown(true);
        if (roomStatus !== 'racing') {
          await startBotRace(botPace);
        }
        setPhase('racing');
        setTimeout(() => inputRef.current?.focus(), 40);
      }
    }, 750);
  }, [user, ensureGuestSession, joinMatchmaking, startBotRace, botPace, roomStatus, resetTyping]);

  // Launch Tricky Keys drill right inside the stage!
  const handleStartTrickyKeys = useCallback(async () => {
    clearCountdownTimer();
    setShowPaintTray(false);
    setIsTrickyDrill(true);
    resetTyping();

    const targetKeys = weakKeys.map((w) => w.key).filter((k) => k.trim().length > 0);
    try {
      const res = await api.getPracticeDrill({
        mode: targetKeys.length > 0 ? 'keys' : 'normal',
        keys: targetKeys.join(''),
      });
      if (res?.text) {
        setPassageText(res.text);
      } else {
        setPassageText(FALLBACK_PASSAGES[0]);
      }
    } catch {
      setPassageText(
        targetKeys.length > 0
          ? `Focus carefully on your tricky keys (${targetKeys.join(', ')}): quick rhythm, exact finger placement, quiet focus, and crisp clean strokes.`
          : FALLBACK_PASSAGES[0]
      );
    }

    setPhase('tricky');
    setTimeout(() => inputRef.current?.focus(), 40);
  }, [weakKeys, resetTyping, setPassageText]);

  const handleExitToHub = useCallback(() => {
    clearCountdownTimer();
    leaveRoom();
    resetTyping();
    setIsTrickyDrill(false);
    setPhase('hub');
  }, [leaveRoom, resetTyping]);

  // Global keyboard shortcuts (Enter on hub/results starts race; typing during race focuses input)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' && e.target !== inputRef.current) return;

      if ((phase === 'hub' || phase === 'finished') && e.key === 'Enter') {
        e.preventDefault();
        if (phase === 'finished' && isTrickyDrill) {
          handleStartTrickyKeys();
        } else {
          handleStartRace();
        }
      } else if ((phase === 'racing' || phase === 'tricky') && document.activeElement !== inputRef.current) {
        if (e.key.length === 1 || e.key === 'Backspace') {
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, isTrickyDrill, handleStartRace, handleStartTrickyKeys]);

  const activePassage = passageText || FALLBACK_PASSAGES[0];
  const typingState = computeTypingState(activePassage, typedInput, totalKeys, correctKeys, elapsedSec);

  const isOpponent = useCallback(
    (p: RacePlayer) => {
      if (p.socketId === 'local_you' || p.socketId === 'local-you') return false;
      if (user?.id && p.userId === user.id) return false;
      return true;
    },
    [user?.id]
  );

  // Automatic Finish Handler
  const finishRaceAutomatically = useCallback(
    (finalWpm: number, finalAcc: number) => {
      if (isFinishingRef.current) return;
      isFinishingRef.current = true;
      setPhase('finished');
      soundEngine.playFinish();

      const fasterOpponents = isTrickyDrill
        ? 0
        : players.filter((p) => isOpponent(p) && p.finished).length;
      const place = Math.max(1, fasterOpponents + 1);
      const dur = Math.max(1, elapsedSec);
      const min = Math.floor(dur / 60);
      const sec = Math.floor(dur % 60);
      const cleanWpm = Math.max(1, finalWpm);

      if (!isTrickyDrill && prevBestWpm > 0 && cleanWpm > prevBestWpm) {
        setIsNewBest(true);
      }

      const summary: RaceResultSummary = {
        wpm: cleanWpm,
        accuracy: finalAcc,
        time: `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`,
        durationSec: dur,
        place,
        coinsEarned: isTrickyDrill ? 60 : 100 + Math.floor((finalAcc / 100) * 50),
        xpEarned: place === 1 ? 100 : 70,
      };
      setLocalResult(summary);

      if (place <= 2) {
        try {
          confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } });
        } catch {
          // ignore
        }
      }

      if (!isTrickyDrill) {
        submitFinalRace({
          wpm: cleanWpm,
          accuracy: finalAcc,
          durationSec: dur,
          place,
        })
          .then((res) => setLocalResult(res))
          .catch(() => {});
      }
    },
    [isTrickyDrill, players, isOpponent, elapsedSec, prevBestWpm, submitFinalRace]
  );

  useEffect(() => {
    if (
      (phase === 'racing' || phase === 'tricky') &&
      !isFinishingRef.current &&
      (typingState.isComplete || typingState.progressPercent >= 100)
    ) {
      finishRaceAutomatically(typingState.wpm, typingState.accuracy);
    }
  }, [phase, typingState.isComplete, typingState.progressPercent, typingState.wpm, typingState.accuracy, finishRaceAutomatically]);

  const handleTypingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if ((phase !== 'racing' && phase !== 'tricky') || isFinishingRef.current) return;
    const val = e.target.value;

    let nextTotal = totalKeys;
    let nextCorrect = correctKeys;

    if (val.length > typedInput.length) {
      const idx = val.length - 1;
      const typedChar = val[idx];
      const expectedChar = activePassage[idx] || '';
      const ok = typedChar === expectedChar;

      nextTotal += 1;
      setTotalKeys(nextTotal);
      if (ok) {
        nextCorrect += 1;
        setCorrectKeys(nextCorrect);
        setStreak((s) => s + 1);
        soundEngine.playKey();
      } else {
        setStreak(0);
        soundEngine.playError();
      }
      if (expectedChar) {
        recordKeystroke(expectedChar, !ok);
      }
    }

    setTypedInput(val);

    const next = computeTypingState(activePassage, val, nextTotal, nextCorrect, elapsedSec);
    if (!isTrickyDrill) {
      sendProgress(next.progressPercent, next.wpm, next.accuracy);
    }

    const done =
      next.isComplete ||
      next.correctPrefixLength >= activePassage.trim().length ||
      val.trim() === activePassage.trim();

    if (done) {
      finishRaceAutomatically(next.wpm, next.accuracy);
    }
  };

  const opponents = players.filter(isOpponent).slice(0, 3);
  const liveLanes = isTrickyDrill
    ? [
        {
          id: 'you',
          name: `${userNickname} (Drill)`,
          carId: userCarId,
          progress: typingState.progressPercent,
          wpm: typingState.wpm,
          isYou: true,
        },
      ]
    : [
        {
          id: 'you',
          name: `${userNickname} (You)`,
          carId: userCarId,
          progress: phase === 'finished' ? 100 : typingState.progressPercent,
          wpm: typingState.wpm,
          isYou: true,
        },
        ...opponents.map((opp, i) => ({
          id: opp.socketId || `opp-${i}`,
          name: opp.nickname.replace(' [AI]', ''),
          carId: (opp.carId as CarModelId) || 'golden',
          progress: opp.progress,
          wpm: opp.wpm,
          isYou: false,
        })),
      ];

  const sortedRanks = [...liveLanes].sort((a, b) => b.progress - a.progress);
  const myRank = sortedRanks.findIndex((r) => r.isYou) + 1;
  const formattedTime = `${String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:${String(elapsedSec % 60).padStart(2, '0')}`;
  const displayResult = localResult || lastResult;
  const nitroActive = (phase === 'racing' || phase === 'tricky') && streak >= 12 && !typingState.hasError;

  const curIdx = typingState.correctPrefixLength;
  const doneSlice = activePassage.slice(Math.max(0, curIdx - 22), curIdx);
  const curChar = activePassage[curIdx] ?? '';
  const upcomingSlice = activePassage.slice(curIdx + 1, curIdx + 68);

  const worldLabel = worldTheme === 'sunset' ? 'SUNSET' : worldTheme === 'neon' ? 'NEON' : 'ALPINE';

  return (
    <div className={`ar-track-scene ${phase === 'racing' || phase === 'tricky' ? 'is-racing' : ''}`}>
      {/* TOP-LEFT BOT PACE SELECTOR ON HUB */}
      {phase === 'hub' && (
        <div className="ar-hub-pace-bar" title="Choose opponent race speed">
          {(['easy', 'normal', 'advanced'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              className={`ar-pace-btn ${botPace === tier ? 'active' : ''}`}
              onClick={() => setBotPace(tier)}
            >
              {tier === 'easy' ? 'Easy' : tier === 'normal' ? 'Normal' : 'Pro'}
            </button>
          ))}
        </div>
      )}

      {/* TOP-RIGHT STAGE TOGGLES (TEXT + SOUND + SCENIC WORLD) */}
      <div className="ar-stage-top-toggles">
        <button
          type="button"
          className="ar-gloss-toggle orange"
          onClick={() => setTextMode((m) => (m === 'scroll' ? 'box' : 'scroll'))}
          title="Switch between scrolling tape and full text box"
        >
          <span className="ar-gloss-toggle-icon">A</span>
          <span>TEXT: {textMode === 'scroll' ? 'SCROLL' : 'BOX'}</span>
        </button>

        <button
          type="button"
          className="ar-gloss-toggle purple"
          onClick={() => setSoundOn((s) => !s)}
          title="Toggle race sound effects"
        >
          <span className="ar-gloss-toggle-icon">
            {soundOn ? <Volume2 size={12} /> : <VolumeX size={12} />}
          </span>
          <span>SOUND: {soundOn ? 'ON' : 'OFF'}</span>
        </button>

        <button
          type="button"
          className="ar-gloss-toggle cyan"
          onClick={onCycleWorld}
          title="Switch scenic world background (Sunset / Neon / Alpine)"
        >
          <span className="ar-gloss-toggle-icon">
            <Sparkles size={12} />
          </span>
          <span>WORLD: {worldLabel}</span>
        </button>
      </div>

      {/* INLINE PAINT CUSTOMIZER TRAY */}
      {phase === 'hub' && showPaintTray && (
        <div className="ar-customizer-tray">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <strong style={{ fontSize: 13 }}>🎨 Paint Your Car ({paint.name})</strong>
            <button
              type="button"
              onClick={() => setShowPaintTray(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
          <div className="ar-swatch-row">
            {ARCADE_PAINTS.map((sw) => (
              <button
                key={sw.id}
                type="button"
                className={`ar-swatch ${paint.id === sw.id ? 'active' : ''}`}
                style={{ background: sw.primary }}
                title={sw.name}
                onClick={() => onSelectPaint(sw)}
              />
            ))}
          </div>
        </div>
      )}

      {/* SKY / STADIUM BACKDROP + LIVE TYPING BAR */}
      <div className="ar-stage-sky">
        <div className="ar-stage-skyline" />
        <div className="ar-stage-trees" />
        <div className="ar-stage-fence" />

        {phase === 'hub' ? (
          <div className="ar-stage-hub-title">
            <div className="ar-stage-logo-big">
              <span className="ar-logo-key">Key</span>
              <span className="ar-logo-sprint">Sprint</span>
              <span className="ar-logo-arrows">&raquo;</span>
            </div>
            <div className="ar-stage-status-sub">
              {worldLabel} Circuit • Press START RACE or Enter
            </div>
          </div>
        ) : (
          <>
            {/* Live HUD Bar */}
            <div className="ar-race-hud-top">
              <div className="ar-hud-pills">
                <button type="button" className="ar-exit-btn" onClick={handleExitToHub}>
                  <ArrowLeft size={13} />
                  <span>Exit</span>
                </button>
                <span className="ar-hud-chip wpm">{typingState.wpm} WPM</span>
                <span className="ar-hud-chip acc">{typingState.accuracy}% ACC</span>
                {!isTrickyDrill && (
                  <span className="ar-hud-chip">POS #{myRank}/{liveLanes.length}</span>
                )}
                <span className="ar-hud-chip">{formattedTime}</span>
                {nitroActive && (
                  <span className="ar-hud-chip nitro">
                    <Flame size={12} /> NITRO • {streak}
                  </span>
                )}
                {typingState.hasError && (
                  <span className="ar-hud-chip err">
                    <AlertTriangle size={12} /> Backspace!
                  </span>
                )}
              </div>
            </div>

            {/* Typing Box (Scroll Mode or Box Mode) */}
            {(phase === 'racing' || phase === 'tricky') && (
              <div
                className={`ar-typing-box ${typingState.hasError ? 'has-error' : ''}`}
                onClick={() => inputRef.current?.focus()}
              >
                {textMode === 'scroll' ? (
                  <div className="ar-typing-scroll-track">
                    <span className="ar-scroll-done">
                      <span className="ar-scroll-done-inner">{doneSlice}</span>
                    </span>
                    <span className={typingState.hasError ? 'ar-char-err' : 'ar-char-cur'}>
                      {curChar === ' ' ? '␣' : curChar}
                    </span>
                    <span className="ar-char-next" style={{ whiteSpace: 'pre' }}>
                      {upcomingSlice}
                    </span>
                  </div>
                ) : (
                  <div className="ar-typing-multiline">
                    {typingState.diff.map((c) => (
                      <span
                        key={c.index}
                        className={
                          c.status === 'correct'
                            ? 'ar-char-ok'
                            : c.status === 'incorrect'
                            ? 'ar-char-err'
                            : c.status === 'current'
                            ? 'ar-char-cur'
                            : 'ar-char-next'
                        }
                      >
                        {c.status === 'incorrect' && c.expected === ' ' ? '␣' : c.expected}
                      </span>
                    ))}
                  </div>
                )}

                <input
                  ref={inputRef}
                  type="text"
                  className="ar-hidden-input"
                  value={typedInput}
                  onChange={handleTypingChange}
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-label="Type passage"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* CURB */}
      <div className="ar-stage-curb" />

      {/* ASPHALT RACETRACK */}
      <div className="ar-stage-road">
        {nitroActive && <div className="ar-speed-lines" aria-hidden="true" />}

        {phase === 'hub' ? (
          <>
            {/* Parked Hero Car + Quick Model Switcher */}
            <div className="ar-hub-car-spot">
              <button
                type="button"
                className="ar-car-arrow-btn"
                onClick={() => cycleCarBody(-1)}
                title="Previous car"
                aria-label="Previous car"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="ar-hub-car-bounce">
                <SvgCar
                  id={userCarId}
                  size={150}
                  paintOverride={paint}
                  wheelStyle={wheelStyle}
                />
              </div>

              <button
                type="button"
                className="ar-car-arrow-btn"
                onClick={() => cycleCarBody(1)}
                title="Next car"
                aria-label="Next car"
              >
                <ChevronRight size={16} />
              </button>

              <span className="ar-car-name-tag">
                {currentCarObj.name} • {paint.name}
              </span>
            </div>

            {/* Bottom Action Deck */}
            <div className="ar-hub-deck">
              <div className="ar-hub-side">
                <button
                  type="button"
                  className="ar-pill-action teal"
                  onClick={handleStartTrickyKeys}
                >
                  <span className="ar-pill-icon-circle">
                    <Keyboard size={17} color="#0f766e" />
                  </span>
                  <span>
                    Tricky
                    <br />
                    Keys
                  </span>
                  <span className="ar-notif-badge">{trickyCount}</span>
                </button>

                <button
                  type="button"
                  className="ar-pill-action sky"
                  onClick={() => setShowPaintTray((v) => !v)}
                >
                  <span className="ar-pill-icon-circle">
                    <Palette size={17} color="#0369a1" />
                  </span>
                  <span>
                    Paint
                    <br />
                    My Car
                  </span>
                </button>
              </div>

              {/* BIG ROUND START RACE BUTTON */}
              <button
                type="button"
                className="ar-start-circle-btn"
                onClick={handleStartRace}
              >
                <span>START</span>
                <span>RACE</span>
              </button>

              <div className="ar-hub-side">
                <button
                  type="button"
                  className="ar-pill-action purple"
                  onClick={onCycleWheels}
                  title={`Current rims: ${wheelStyle} — click to cycle!`}
                >
                  <span className="ar-pill-icon-circle">
                    <Disc size={18} color="#6d28d9" />
                  </span>
                  <span>
                    Change
                    <br />
                    Wheels
                  </span>
                </button>

                <div className="ar-hub-stack">
                  <button
                    type="button"
                    className="ar-pill-action blue"
                    onClick={() => onSelectTab('garage')}
                  >
                    <span className="ar-pill-icon-circle">
                      <ShoppingCart size={13} color="#1d4ed8" />
                    </span>
                    <span>STORE</span>
                  </button>
                  <button
                    type="button"
                    className="ar-pill-action blue"
                    onClick={() => onSelectTab('friends')}
                  >
                    <span className="ar-pill-icon-circle">
                      <Users size={13} color="#1d4ed8" />
                    </span>
                    <span>FRIENDS</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          liveLanes.map((lane) => {
            const leftPct = Math.min(82, Math.max(2, lane.progress * 0.8));
            return (
              <div key={lane.id} className={`ar-road-lane ${lane.isYou ? 'is-you' : ''}`}>
                <div className="ar-lane-finish" />
                <div className="ar-lane-racer-tag">
                  <span>{lane.name}</span>
                  <span style={{ opacity: 0.85 }}>{lane.wpm} WPM</span>
                </div>
                <div className="ar-lane-car-wrap" style={{ left: `${leftPct}%` }}>
                  <SvgCar
                    id={lane.carId}
                    size={96}
                    animatedNitro={
                      (lane.isYou && nitroActive) ||
                      (phase === 'racing' && lane.progress > 3 && lane.progress < 100)
                    }
                    paintOverride={lane.isYou ? paint : null}
                    wheelStyle={lane.isYou ? wheelStyle : 'silver'}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* COUNTDOWN TRAFFIC LIGHT OVERLAY */}
      {phase === 'countdown' && (
        <div className="ar-countdown-modal">
          <div className="ar-traffic-box">
            <span className={`ar-bulb ${lightStep === 0 ? 'green' : lightStep <= 3 ? 'red' : ''}`} />
            <span className={`ar-bulb ${lightStep === 0 ? 'green' : lightStep <= 2 ? 'red' : ''}`} />
            <span className={`ar-bulb ${lightStep === 0 ? 'green' : lightStep <= 1 ? 'red' : ''}`} />
          </div>
          <div className="ar-countdown-label">
            {lightStep > 0 ? `GET READY... ${lightStep}` : 'GO!'}
          </div>
        </div>
      )}

      {/* AUTOMATIC POST-RACE RESULTS OVERLAY */}
      {phase === 'finished' && displayResult && (
        <div className="ar-results-overlay">
          {isNewBest && (
            <span className="ar-pb-badge">
              <Flame size={13} /> New Personal Best!
            </span>
          )}
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 1 }}>
              {isTrickyDrill ? 'Tricky Keys Drill Complete' : 'Checkered Flag — Race Complete!'}
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, marginTop: 4 }}>
              {isTrickyDrill
                ? 'Awesome Practice! ⌨️'
                : displayResult.place === 1
                ? '1st Place — Victory! 🏆'
                : displayResult.place === 2
                ? '2nd Place — Great Run! 🥈'
                : displayResult.place === 3
                ? '3rd Place — Podium! 🥉'
                : `Finished #${displayResult.place}`}
            </h2>
          </div>

          <div className="ar-results-grid">
            <div className="ar-res-box">
              <div className="ar-res-val" style={{ color: '#38bdf8' }}>{displayResult.wpm}</div>
              <div className="ar-res-lbl">WPM</div>
            </div>
            <div className="ar-res-box">
              <div className="ar-res-val" style={{ color: '#4ade80' }}>{displayResult.accuracy}%</div>
              <div className="ar-res-lbl">Accuracy</div>
            </div>
            <div className="ar-res-box">
              <div className="ar-res-val">{displayResult.time}</div>
              <div className="ar-res-lbl">Time</div>
            </div>
            <div className="ar-res-box">
              <div className="ar-res-val" style={{ color: '#fbbf24' }}>+{displayResult.coinsEarned}</div>
              <div className="ar-res-lbl">Coins 🪙</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="ar-btn ar-btn-red"
              onClick={isTrickyDrill ? handleStartTrickyKeys : handleStartRace}
              style={{ padding: '11px 24px', fontSize: 15 }}
            >
              <RotateCcw size={16} />
              <span>{isTrickyDrill ? 'DRILL AGAIN (Enter)' : 'RACE AGAIN (Enter)'}</span>
            </button>
            <button type="button" className="ar-btn ar-btn-teal" onClick={handleExitToHub}>
              <ArrowLeft size={16} />
              <span>Back to Stage</span>
            </button>
            <button type="button" className="ar-btn ar-btn-light" onClick={() => onSelectTab('leaderboard')}>
              <Trophy size={15} />
              <span>Top 500</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
