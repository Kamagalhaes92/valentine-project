// src/pages/Intro.jsx
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import "../styles/intro.css";
import { MusicContext } from "../App";
import HamburgerMenu from "../components/HamburgerMenu";

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const isMobileW = (w) => w <= 768;

// start more left on desktop
const startDuckX = (w) => (isMobileW(w) ? 8 : 26);

const DIALOGUES = [
  "Hi! I have a delivery for you 💌",
  "Oh... is that a door? 🤔",
  "I wonder where it leads us...",
  "I think we should go there! 🦆✨",
];

const LEFT_JOKES = [
  "Wrong way bestie 😅➡️",
  "Plot twist: nothing over here… just vibes",
  "This area is under construction 🦆",
  "Nope. My GPS says: turn around 🗺️",
  "If you keep going left, you’ll end up in 2007 MySpace 😭",
];

const STATUS_LINES = [
  "Feeling romantic 💌",
  "Feeling sparkly ✨",
  "Feeling silly 🦆",
  "Feeling cozy ☕",
];

const LOG_LINES = [
  "💌 1 special letter today",
  "✨ I see you here!",
  "🦆 courier has arrived",
];

function safeId() {
  return (
    crypto?.randomUUID?.() ??
    `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
  );
}

/** StampNote: random choose between 3 stamps */
function StampNote({
  noteSrc = "/note.png",
  stampSrcs = ["/stamp.png", "/stamp2.png", "/stamp3.png"],
}) {
  const wrapRef = useRef(null);
  const [stamps, setStamps] = useState([]);

  const pickStamp = useCallback(() => {
    const list = stampSrcs?.length ? stampSrcs : ["/stamp.png"];
    return list[Math.floor(Math.random() * list.length)];
  }, [stampSrcs]);

  const addStamp = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;

    const w = el.clientWidth;
    const h = el.clientHeight;

    const pad = 20;
    const x = pad + Math.random() * (w - pad * 2);
    const y = pad + Math.random() * (h - pad * 2);
    const rot = Math.round(Math.random() * 18 - 9);

    setStamps((prev) => [
      ...prev,
      {
        id: safeId(),
        x,
        y,
        rot,
        s: 0.9 + Math.random() * 0.15,
        src: pickStamp(),
      },
    ]);
  }, [pickStamp]);

  const clear = () => setStamps([]);

  return (
    <section className="leftCard leftCard--note" aria-label="Stamp note">
      <div className="leftCardHead">
        <div className="leftCardTitle">Stamp Note</div>
        <button className="miniBtn" onClick={clear} type="button">
          Clear
        </button>
      </div>

      <div className="noteArea" ref={wrapRef}>
        <img className="notePaper" src={noteSrc} alt="Decorative note paper" />
        {stamps.map((s) => (
          <img
            key={s.id}
            className="noteStamp"
            src={s.src}
            alt=""
            style={{
              left: s.x,
              top: s.y,
              transform: `translate(-50%, -50%) rotate(${s.rot}deg) scale(${s.s})`,
            }}
          />
        ))}
      </div>

      <button className="stampBtn" onClick={addStamp} type="button">
        Stamp 💮
      </button>
    </section>
  );
}

export default function Intro() {
  const navigate = useNavigate();
  const audioRef = useContext(MusicContext);

  // ✅ IMPORTANT: these refs MUST live in Intro (not inside StampNote)
  const sceneRef = useRef(null);
  const doorRef = useRef(null);

  const [isMobile, setIsMobile] = useState(isMobileW(window.innerWidth));

  const [duckX, setDuckX] = useState(() => startDuckX(window.innerWidth));
  const [duckY, setDuckY] = useState(68);

  // loader phases: show -> hide -> gone
  const [loaderPhase, setLoaderPhase] = useState("show");
  const [loaded, setLoaded] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  const [jumping, setJumping] = useState(false);
  const [hearts, setHearts] = useState([]);
  const [sparkles, setSparkles] = useState([]);

  const [overrideLine, setOverrideLine] = useState("");
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [facing, setFacing] = useState("right");

  const [duckVoice, setDuckVoice] = useState(null);
  const [transitioning, setTransitioning] = useState(false);

  const [statusIndex, setStatusIndex] = useState(0);
  const [logLine, setLogLine] = useState(LOG_LINES[0]);

  const DUCKS = useMemo(
    () => [
      { key: "classic", label: "Classic", img: "/duck.png" },
      { key: "party", label: "Party", img: "/duck2.png" },
      { key: "angel", label: "Angel", img: "/duck3.png" },
    ],
    [],
  );
  const [selectedDuck, setSelectedDuck] = useState(DUCKS[0]);

  // keep duck on the “floor” depending on screen ratio
  useEffect(() => {
    const updateY = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const ratio = h / w;
      setDuckY(ratio > 1.9 ? 72 : ratio > 1.7 ? 70 : 66);
    };
    updateY();
    window.addEventListener("resize", updateY);
    return () => window.removeEventListener("resize", updateY);
  }, []);

  // responsive breakpoint + optional reset when crossing
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      const nextMobile = isMobileW(w);
      setIsMobile(nextMobile);

      setDuckX((prev) => {
        const nextStart = startDuckX(w);
        const wasMobile = prev <= 20;
        if (nextMobile && !wasMobile) return nextStart;
        if (!nextMobile && wasMobile) return nextStart;
        return prev;
      });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // loader timing
  useEffect(() => {
    const loaderTime = 2500;
    const fadeTime = 480;

    const t = setTimeout(() => {
      setLoaded(true);
      setSceneReady(true);
      setLoaderPhase("hide");
      window.setTimeout(() => setLoaderPhase("gone"), fadeTime);
    }, loaderTime);

    return () => clearTimeout(t);
  }, []);

  // rotate log line
  useEffect(() => {
    const t = setInterval(() => {
      setLogLine(LOG_LINES[Math.floor(Math.random() * LOG_LINES.length)]);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  const bubbleText = overrideLine || DIALOGUES[dialogueIndex];
  const bubbleTop = Math.max(16, duckY - 12);

  const playSfx = useCallback((src, volume = 0.9) => {
    const s = new Audio(src);
    s.volume = volume;
    s.play().catch(() => {});
  }, []);

  // voice pick
  useEffect(() => {
    if (!window.speechSynthesis) return;

    let tries = 0;
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return false;

      const preferred =
        voices.find((v) =>
          /zira|samantha|victoria|karen|tessa|serena/i.test(v.name),
        ) ||
        voices.find((v) => /female/i.test(v.name)) ||
        voices.find((v) => /en/i.test(v.lang)) ||
        voices[0];

      if (preferred) {
        setDuckVoice(preferred);
        return true;
      }
      return false;
    };

    if (pickVoice()) return;
    window.speechSynthesis.onvoiceschanged = () => pickVoice();

    const poll = setInterval(() => {
      tries += 1;
      if (pickVoice() || tries > 18) clearInterval(poll);
    }, 200);

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      clearInterval(poll);
    };
  }, []);

  const speak = useCallback(
    (text) => {
      if (!sceneReady) return;
      if (!window.speechSynthesis) return;
      if (!duckVoice) return;

      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = duckVoice;
      u.rate = 0.9;
      u.pitch = 1.35;
      u.volume = 1;
      window.speechSynthesis.speak(u);
    },
    [duckVoice, sceneReady],
  );

  // typewriter + speak
  useEffect(() => {
    if (!sceneReady) return;

    setTyped("");
    const startDelay = dialogueIndex === 0 ? 220 : 110;
    const speed = isMobileW(window.innerWidth) ? 18 : 24;

    const startTimer = setTimeout(() => {
      speak(bubbleText);

      let i = 0;
      const timer = setInterval(() => {
        i += 1;
        setTyped(bubbleText.slice(0, i));
        if (i >= bubbleText.length) clearInterval(timer);
      }, speed);

      return () => clearInterval(timer);
    }, startDelay);

    return () => clearTimeout(startTimer);
  }, [bubbleText, speak, dialogueIndex, sceneReady]);

  // ✅ SINGLE source of truth: duckNearDoor (px math inside scene)
  // ✅ SINGLE source of truth: duckNearDoor (X-only, reliable on desktop)
  const [duckNearDoor, setDuckNearDoor] = useState(false);

  const updateNearDoor = useCallback(() => {
    const sceneEl = sceneRef.current;
    const doorEl = doorRef.current;
    if (!sceneEl || !doorEl) return;

    const sceneRect = sceneEl.getBoundingClientRect();
    const doorRect = doorEl.getBoundingClientRect();

    // Duck X in px (viewport coords)
    const duckPxX = sceneRect.left + (duckX / 100) * sceneRect.width;

    // Door center X in px
    const doorCenterX = doorRect.left + doorRect.width / 2;

    // Tolerance: wider on desktop so it never "misses"
    const factor = isMobile ? 0.8 : 1.05; // desktop more forgiving
    const nearX = (doorRect.width / 2) * factor;

    setDuckNearDoor(Math.abs(duckPxX - doorCenterX) <= nearX);
  }, [duckX, isMobile]);

  useEffect(() => {
    updateNearDoor();
    window.addEventListener("resize", updateNearDoor);
    const raf = requestAnimationFrame(updateNearDoor);
    return () => {
      window.removeEventListener("resize", updateNearDoor);
      cancelAnimationFrame(raf);
    };
  }, [updateNearDoor, loaded]);

  const toggleMusic = useCallback(() => {
    const a = audioRef?.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, [audioRef]);

  const moveDuck = useCallback(
    (dx) => {
      if (dx > 0) {
        setFacing("right");
        setOverrideLine("");
      } else if (dx < 0) {
        setFacing("left");
        const joke = LEFT_JOKES[Math.floor(Math.random() * LEFT_JOKES.length)];
        setOverrideLine(joke);
      }

      setDuckX((prev) => {
        const maxX = isMobileW(window.innerWidth) ? 90 : 95;
        const next = clamp(prev + dx, 2, maxX);

        if (dx > 0) {
          if (next < 45) setDialogueIndex(0);
          else if (next < 60) setDialogueIndex(1);
          else if (next < 75) setDialogueIndex(2);
          else setDialogueIndex(3);

          setHearts((h) => [
            ...h,
            {
              id: safeId(),
              x: clamp(next - 2, 0, 98),
              y: clamp(duckY - 8 + Math.random() * 6, 5, 90),
              rot: (Math.random() * 40 - 20).toFixed(1),
              s: (0.7 + Math.random() * 0.6).toFixed(2),
            },
          ]);

          setJumping(true);
          window.setTimeout(() => setJumping(false), 220);
        }

        return next;
      });
    },
    [duckY],
  );

  // keyboard movement
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "ArrowRight" || e.key === "d") moveDuck(3);
      if (e.key === "ArrowLeft" || e.key === "a") moveDuck(-3);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveDuck]);

  const enterDoor = useCallback(() => {
    if (!duckNearDoor || transitioning) return;

    setTransitioning(true);
    playSfx("/door-aww.mp3", 0.9);

    setTimeout(() => {
      navigate("/valentine");
    }, 1800);
  }, [duckNearDoor, transitioning, navigate, playSfx]);

  // sparkles near door
  useEffect(() => {
    if (!duckNearDoor) return;

    const spawn = () => {
      setSparkles((prev) => [
        ...prev,
        {
          id: safeId(),
          left: 64 + Math.random() * 16,
          top: 38 + Math.random() * 28,
          s: 0.6 + Math.random() * 0.9,
          d: 800 + Math.random() * 700,
        },
      ]);
    };

    const interval = setInterval(spawn, 170);
    return () => clearInterval(interval);
  }, [duckNearDoor]);

  useEffect(() => {
    if (sparkles.length === 0) return;
    const t = setTimeout(() => setSparkles((p) => p.slice(-18)), 800);
    return () => clearTimeout(t);
  }, [sparkles]);

  const cycleStatus = () =>
    setStatusIndex((i) => (i + 1) % STATUS_LINES.length);

  return (
    <div className="introPage">
      <div className="screenFrame" aria-hidden="true">
        <img className="sf sf--tl" src="/frame-top-left.png" alt="" />
        <img className="sf sf--tr" src="/frame-top-right.png" alt="" />
        <img className="sf sf--bl" src="/frame-buttom-left.png" alt="" />
        <img className="sf sf--br" src="/frame-buttom-right.png" alt="" />
      </div>

      <HamburgerMenu />

      <div className="introGrid">
        {/* LEFT */}
        <aside className="leftCol" aria-label="Left column">
          <section className="leftCard leftCard--profile">
            <div className="profileWrap">
              <img className="profileGif" src="/profile.gif" alt="Profile" />
            </div>
          </section>

          <section className="leftCard leftCard--quotes">
            <div className="leftCardHead">
              <div className="leftCardTitle">Cute Quotes</div>
              <div className="leftCardTag">tiny reminders</div>
            </div>
            <ul className="quoteList">
              <li>All you need is love 💗</li>
              <li>Together, we’re unstoppable ✨</li>
              <li>You’ve got this 🧸</li>
            </ul>
          </section>

          <section className="leftCard leftCard--social">
            <div className="leftCardHead">
              <div className="leftCardTitle">Find me</div>
              <div className="leftCardTag">social</div>
            </div>

            <div className="socialRowMini">
              <a
                className="socialChip"
                href="https://www.linkedin.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                title="LinkedIn"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="socialSvg"
                  aria-hidden="true"
                >
                  <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5ZM.5 23.5h4V7.98h-4V23.5ZM8.5 7.98h3.83v2.12h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1v9.35h-4v-8.29c0-1.98-.04-4.52-2.75-4.52-2.75 0-3.17 2.15-3.17 4.38v8.43h-4V7.98Z" />
                </svg>
              </a>

              <a
                className="socialChip"
                href="https://github.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                title="GitHub"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="socialSvg"
                  aria-hidden="true"
                >
                  <path d="M12 .5C5.73.5.75 5.68.75 12.1c0 5.14 3.29 9.49 7.86 11.03.58.11.79-.26.79-.57v-2.2c-3.2.72-3.87-1.58-3.87-1.58-.53-1.38-1.29-1.75-1.29-1.75-1.05-.74.08-.73.08-.73 1.16.08 1.77 1.23 1.77 1.23 1.03 1.81 2.69 1.29 3.35.99.1-.77.4-1.29.73-1.59-2.55-.3-5.23-1.31-5.23-5.84 0-1.29.45-2.34 1.18-3.16-.12-.3-.51-1.52.11-3.16 0 0 .97-.32 3.18 1.21a10.7 10.7 0 0 1 2.9-.4c.98 0 1.97.14 2.9.4 2.2-1.53 3.18-1.21 3.18-1.21.62 1.64.23 2.86.11 3.16.74.82 1.18 1.87 1.18 3.16 0 4.54-2.69 5.53-5.25 5.83.41.37.78 1.11.78 2.24v3.32c0 .31.21.68.8.57 4.56-1.54 7.84-5.89 7.84-11.03C23.25 5.68 18.27.5 12 .5Z" />
                </svg>
              </a>

              <a
                className="socialChip"
                href="mailto:hello@example.com"
                aria-label="Email"
                title="Email"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="socialSvg"
                  aria-hidden="true"
                >
                  <path d="M2.5 6.5h19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-19a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Zm0 2.2v.2l9.2 5.7c.2.12.46.12.66 0l9.14-5.66v-.24L12 14.1 2.5 8.7Z" />
                </svg>
              </a>
            </div>
          </section>

          <StampNote
            noteSrc="/note.png"
            stampSrcs={["/stamp.png", "/stamp2.png", "/stamp3.png"]}
          />
        </aside>

        {/* CENTER */}
        <main className="centerCol" aria-label="Main scene">
          <div className="sceneTitleWrap">
            <div className="titleWrap" aria-hidden="true">
              <h1 className="introTitle">
                Special Delivery <span className="titleEmoji">💌</span>
              </h1>
              <div className="titleSub">A Surprise Awaits</div>
            </div>
          </div>

          <div ref={sceneRef} className={`scene ${loaded ? "isLoaded" : ""}`}>
            {transitioning && (
              <div className="doorTransition" aria-hidden="true">
                <div className="doorStars" />
                <div className="doorHearts" />
              </div>
            )}

            {loaderPhase !== "gone" && (
              <div
                className={`loaderOverlay ${
                  loaderPhase === "hide" ? "loaderOverlay--hide" : ""
                }`}
                role="status"
                aria-live="polite"
              >
                <div className="loaderCard">
                  <img
                    className="loaderButterfly"
                    src="/butterfly.gif"
                    alt=""
                  />
                  <div className="loaderText">loading your delivery…</div>
                  <div className="loaderHint">
                    🎧 best enjoyed with audio on
                  </div>
                </div>
              </div>
            )}

            <div className="sceneLayer" aria-hidden="false">
              {sparkles.map((s) => (
                <span
                  key={s.id}
                  className="sparkle"
                  style={{
                    left: `${s.left}%`,
                    top: `${s.top}%`,
                    transform: `translate(-50%, -50%) scale(${s.s})`,
                    animationDuration: `${s.d}ms`,
                  }}
                />
              ))}

              <button
                ref={doorRef}
                className={`door door--magic door--left ${
                  duckNearDoor ? "door--active" : ""
                }`}
                onClick={enterDoor}
                disabled={!duckNearDoor}
                aria-label="Enter the door"
                type="button"
              >
                <span className="doorRays" aria-hidden="true" />
              </button>
            </div>

            {duckNearDoor && (
              <button
                className={`enterBtn ${
                  isMobile ? "enterBtn--mobile" : "enterBtn--desktop"
                }`}
                onClick={enterDoor}
                type="button"
              >
                Enter ✨
              </button>
            )}

            {hearts.map((h) => (
              <div
                key={h.id}
                className="heart"
                style={{
                  left: `${h.x}%`,
                  top: `${h.y}%`,
                  transform: `rotate(${h.rot}deg) scale(${h.s})`,
                }}
              />
            ))}

            <div className="vignette" aria-hidden="true" />

            <div
              className="bubble bubble--glass"
              style={{ left: `${duckX}%`, top: `${bubbleTop}%` }}
            >
              {typed}
              <span className="caret" aria-hidden="true" />
            </div>

            <div
              className={`duck ${jumping ? "duck--jump" : ""} ${
                facing === "left" ? "duck--left" : ""
              }`}
              style={{
                left: `${duckX}%`,
                top: `${duckY}%`,
                backgroundImage: `url(${selectedDuck.img})`,
              }}
            />

            <div className="controls controls--inside">
              <button
                onClick={() => moveDuck(-3)}
                className="ctrl"
                aria-label="Move left"
                type="button"
              >
                ←
              </button>
              <button
                onClick={() => moveDuck(3)}
                className="ctrl"
                aria-label="Move right"
                type="button"
              >
                →
              </button>
            </div>
          </div>
        </main>

        {/* RIGHT */}
        <aside className="rightCol" aria-label="Right column widgets">
          <section className="audioCard" aria-label="Audio player">
            <button
              className="audioBtn"
              onClick={toggleMusic}
              type="button"
              aria-label="Toggle music"
            >
              <img
                className="audioImg"
                src="/audio-player.png"
                alt="Audio player"
              />
            </button>
            <div className="audioHint">tap to play / pause</div>
          </section>

          <aside className="pageFrame" aria-label="Status and delivery widgets">
            <div className="frameInner">
              <div className="frameHeaderRow">
                <div className="frameTag">welcome to the delivery room</div>
                <div className="frameMini">
                  <span className="miniDot" /> online
                </div>
              </div>

              <div className="frameStack">
                <section className="widget widget--status">
                  <div className="widgetHead">
                    <h3 className="widgetTitle">Status</h3>
                    <button
                      className="widgetArrow"
                      type="button"
                      onClick={cycleStatus}
                      aria-label="Change status"
                    >
                      ▾
                    </button>
                  </div>

                  <button
                    className="statusPill"
                    type="button"
                    onClick={cycleStatus}
                    aria-label="Current status"
                  >
                    <span className="statusHeart">♡</span>
                    <span className="statusText">
                      {STATUS_LINES[statusIndex]}
                    </span>
                    <span className="statusCaret">▾</span>
                  </button>
                </section>

                <section className="widget widget--log">
                  <h3 className="widgetTitle">Delivery Log</h3>
                  <div className="logItem">{logLine}</div>
                  <div className="logItem">🚪 door is shimmering…</div>
                </section>

                <section
                  className="widget widget--duckpicker"
                  aria-label="Choose delivery duck"
                >
                  <h3 className="widgetTitle">Choose your courier</h3>

                  <div className="duckChoices">
                    {DUCKS.map((d) => (
                      <button
                        key={d.key}
                        className={`duckChoice ${
                          selectedDuck.key === d.key ? "isSelected" : ""
                        }`}
                        type="button"
                        onClick={() => setSelectedDuck(d)}
                        aria-pressed={selectedDuck.key === d.key}
                        aria-label={`${d.label} Duck`}
                      >
                        <img src={d.img} alt="" />
                        <span>{d.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="tinyNote">
                    Pick one — it’ll deliver your letter 💌
                  </div>
                  <div className="frameFooter">coded with ♥ • Karine 2026</div>
                </section>
              </div>
            </div>
          </aside>
        </aside>
      </div>
    </div>
  );
}
