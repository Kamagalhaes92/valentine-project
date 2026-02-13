import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useContext,
} from "react";
import { useNavigate } from "react-router-dom";
import "../styles/intro.css";
import { MusicContext } from "../App";

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const DIALOGUES = [
  "Hi! I have a delivery for you 💌",
  "Oh... is that a door? 🤔",
  "I wonder where it leads us...",
  "I think we should go there! 🦆✨",
];

function safeId() {
  return (
    crypto?.randomUUID?.() ??
    `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
  );
}

export default function Intro() {
  const navigate = useNavigate();
  const audioRef = useContext(MusicContext);

  const doorRef = useRef(null);

  const isMobile = useMemo(() => window.innerWidth <= 768, []);
  const [duckX, setDuckX] = useState(isMobile ? 16 : 40);
  const [duckY, setDuckY] = useState(68);

  useEffect(() => {
    const updateY = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const ratio = h / w; // tall screens => bigger ratio

      // Tall phone screens need a LOWER Y to reach the floor line
      const y = ratio > 1.9 ? 72 : ratio > 1.7 ? 70 : 66;

      setDuckY(y);
    };

    updateY();
    window.addEventListener("resize", updateY);
    return () => window.removeEventListener("resize", updateY);
  }, []);

  const [jumping, setJumping] = useState(false);
  const [hearts, setHearts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [overrideLine, setOverrideLine] = useState("");
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [facing, setFacing] = useState("right");

  const [duckVoice, setDuckVoice] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const maxX = window.innerWidth <= 768 ? 94 : 95;

  // door zone measured from actual door element
  const [doorZone, setDoorZone] = useState({
    xMin: 80,
    xMax: 95,
    yMin: 40,
    yMax: 75,
  });

  // typewriter state
  const bubbleText = overrideLine || DIALOGUES[dialogueIndex];
  const [typed, setTyped] = useState("");

  const playSfx = useCallback((src, volume = 0.9) => {
    const s = new Audio(src);
    s.volume = volume;
    s.play().catch(() => {});
  }, []);

  const safeTop = 16; // percent - prevents bubble from going too high on mobile
  const bubbleTop = Math.max(safeTop, duckY - 12);

  // load animation trigger
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  // measure door zone on mount + resize
  useEffect(() => {
    const updateDoorZone = () => {
      if (!doorRef.current) return;

      const rect = doorRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const xMin = (rect.left / vw) * 100;
      const xMax = (rect.right / vw) * 100;
      const yMin = (rect.top / vh) * 100;
      const yMax = (rect.bottom / vh) * 100;

      // forgiving padding so it feels easier
      const padX = 4;
      const padY = 6;

      setDoorZone({
        xMin: Math.max(0, xMin - padX),
        xMax: Math.min(100, xMax + padX),
        yMin: Math.max(0, yMin - padY),
        yMax: Math.min(100, yMax + padY),
      });
    };

    updateDoorZone();
    window.addEventListener("resize", updateDoorZone);
    return () => window.removeEventListener("resize", updateDoorZone);
  }, []);

  const duckNearDoor =
    duckX >= doorZone.xMin &&
    duckX <= doorZone.xMax &&
    duckY >= doorZone.yMin &&
    duckY <= doorZone.yMax;

  // speech
  const speak = useCallback(
    (text) => {
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
    [duckVoice],
  );

  // pick voice once
  useEffect(() => {
    if (!window.speechSynthesis) return;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) =>
          /zira|samantha|victoria|karen|tessa|serena/i.test(v.name),
        ) ||
        voices.find((v) => /female/i.test(v.name)) ||
        voices.find((v) => /en/i.test(v.lang)) ||
        voices[0];

      if (preferred) setDuckVoice(preferred);
    };

    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // typewriter effect + speak (runs whenever bubbleText changes)
  useEffect(() => {
    setTyped("");

    const isMobileNow = window.innerWidth <= 768;
    const startDelay = dialogueIndex === 0 ? 900 : 120;
    const speed = isMobileNow ? 18 : 24; // smaller = faster typing

    const startTimer = setTimeout(() => {
      // speak after small delay so it doesn't feel late
      speak(bubbleText);

      let i = 0;
      const timer = setInterval(() => {
        i += 1;
        setTyped(bubbleText.slice(0, i));
        if (i >= bubbleText.length) clearInterval(timer);
      }, speed);

      // cleanup inner timer
      return () => clearInterval(timer);
    }, startDelay);

    return () => clearTimeout(startTimer);
  }, [bubbleText, speak, dialogueIndex]);

  // music toggle
  const toggleMusic = useCallback(() => {
    const a = audioRef?.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, [audioRef]);

  // movement
  const moveDuck = useCallback(
    (dx) => {
      if (dx > 0) {
        setFacing("right");
        setOverrideLine("");
      } else if (dx < 0) {
        setFacing("left");
        setOverrideLine("Umm... I think we should go the other way 😅➡️");
      }

      setDuckX((prev) => {
        const maxX = window.innerWidth <= 768 ? 90 : 95;
        const next = clamp(prev + dx, 2, maxX);

        // story only on right
        if (dx > 0) {
          if (next < 45) setDialogueIndex(0);
          else if (next < 60) setDialogueIndex(1);
          else if (next < 75) setDialogueIndex(2);
          else setDialogueIndex(3);
        }

        // hearts + hop only on right
        if (dx > 0) {
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

  // keyboard
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "ArrowRight" || e.key === "d") moveDuck(3);
      if (e.key === "ArrowLeft" || e.key === "a") moveDuck(-3);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveDuck]);

  // enter door
  const enterDoor = useCallback(() => {
    if (!duckNearDoor || transitioning) return;

    setTransitioning(true);
    playSfx("/door-aww.mp3", 0.9);

    // wait for the "inside the door" scene
    setTimeout(() => {
      navigate("/valentine");
    }, 1800);
  }, [duckNearDoor, transitioning, navigate, playSfx]);

  // sparkle particles near door when duck is close
  const [sparkles, setSparkles] = useState([]);
  useEffect(() => {
    if (!duckNearDoor) return;

    const spawn = () => {
      setSparkles((prev) => [
        ...prev,
        {
          id: safeId(),
          left: 82 + Math.random() * 14, // near right side where door is
          top: 38 + Math.random() * 28,
          s: 0.6 + Math.random() * 0.9,
          d: 800 + Math.random() * 700,
        },
      ]);
    };

    const interval = setInterval(spawn, 160);
    return () => clearInterval(interval);
  }, [duckNearDoor]);

  // cleanup sparkles automatically
  useEffect(() => {
    if (sparkles.length === 0) return;
    const t = setTimeout(() => setSparkles((p) => p.slice(-18)), 800);
    return () => clearTimeout(t);
  }, [sparkles]);

  return (
    <div className="intro">
      <div className={`scene ${loaded ? "isLoaded" : ""}`}>
        {transitioning && (
          <div className="doorTransition" aria-hidden="true">
            <div className="doorStars" />
            <div className="doorHearts" />
          </div>
        )}
        {/* Fancy music button */}
        <button
          className="musicToggle musicToggle--fancy"
          onClick={toggleMusic}
          aria-label="Toggle music"
        >
          <span className="musicIcon">🎵</span>
        </button>

        <div className="titleWrap" aria-hidden="true">
          <h1 className="introTitle">
            A little delivery for you <span className="titleEmoji">💌</span>
          </h1>
        </div>

        {/* Top decoration */}
        <img className="decorTop" src="/top.png" alt="" aria-hidden="true" />

        {/* Hearts trail */}
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

        {/* Door sparkles */}
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

        <div className="vignette" aria-hidden="true" />

        {/* Bubble with typewriter text */}
        <div
          className="bubble bubble--glass"
          style={{ left: `${duckX}%`, top: `${bubbleTop}%` }}
        >
          {typed}
          <span className="caret" aria-hidden="true" />
        </div>

        {/* Door */}
        <button
          ref={doorRef}
          className={`door door--magic ${duckNearDoor ? "door--active" : ""}`}
          onClick={enterDoor}
          disabled={!duckNearDoor}
          aria-label="Enter the door"
        >
          <span className="doorRays" aria-hidden="true" />
        </button>
        {duckNearDoor && window.innerWidth <= 768 && (
          <button className="enterBtn" onClick={enterDoor}>
            Enter ✨
          </button>
        )}

        {/* Duck */}
        <div
          className={`duck ${jumping ? "duck--jump" : ""} ${facing === "left" ? "duck--left" : ""}`}
          style={{ left: `${duckX}%`, top: `${duckY}%` }}
        />

        {/* Balloons */}
        <img
          className="balloon balloon--left"
          src="/three.png"
          alt=""
          aria-hidden="true"
        />
        <img
          className="balloon balloon--right"
          src="/three.png"
          alt=""
          aria-hidden="true"
        />

        {/* Controls */}
        <div className="controls">
          <button
            onClick={() => moveDuck(-3)}
            className="ctrl"
            aria-label="Move left"
          >
            ←
          </button>
          <button
            onClick={() => moveDuck(3)}
            className="ctrl"
            aria-label="Move right"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
