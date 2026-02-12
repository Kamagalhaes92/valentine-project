import { useEffect, useMemo, useState, useCallback, useContext } from "react";
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

export default function Intro() {
  const navigate = useNavigate();
  const audioRef = useContext(MusicContext);

  // --- State ---
  const isMobile = window.innerWidth <= 768;

  const [duckX, setDuckX] = useState(isMobile ? 15 : 40);
  const [duckY] = useState(55); // fixed for now
  const [jumping, setJumping] = useState(false);
  const [hearts, setHearts] = useState([]);
  const [overrideLine, setOverrideLine] = useState("");
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [facing, setFacing] = useState("right"); // "right" | "left"
  const [duckVoice, setDuckVoice] = useState(null);

  // --- Config / derived values ---
  const doorZone = useMemo(() => {
    const isMobile = window.innerWidth <= 768;

    return isMobile
      ? { xMin: 75, xMax: 95, yMin: 35, yMax: 80 }
      : { xMin: 80, xMax: 95, yMin: 40, yMax: 75 };
  }, []);

  const duckNearDoor =
    duckX >= doorZone.xMin &&
    duckX <= doorZone.xMax &&
    duckY >= doorZone.yMin &&
    duckY <= doorZone.yMax;

  const bubbleText = overrideLine || DIALOGUES[dialogueIndex];

  // --- Helpers ---
  const toggleMusic = useCallback(() => {
    const a = audioRef?.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, [audioRef]);

  const speak = useCallback(
    (text) => {
      if (!window.speechSynthesis) return;
      if (!duckVoice) return;

      window.speechSynthesis.cancel();

      const u = new SpeechSynthesisUtterance(text);
      u.voice = duckVoice;
      u.rate = 0.9;
      u.pitch = 1.4;
      u.volume = 1;

      window.speechSynthesis.speak(u);
    },
    [duckVoice],
  );

  // --- Effects: load voice once ---
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

  // --- Effects: speak whenever bubble text changes ---
  useEffect(() => {
    speak(bubbleText);
  }, [bubbleText, speak]);

  // --- Movement ---
  const moveDuck = useCallback(
    (dx) => {
      // Left = override line stays until you go right
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

        // Progress story only when moving right
        if (dx > 0) {
          if (next < 45) setDialogueIndex(0);
          else if (next < 60) setDialogueIndex(1);
          else if (next < 75) setDialogueIndex(2);
          else setDialogueIndex(3);
        }

        // Hearts + jump only when moving right
        if (dx > 0) {
          setHearts((h) => [
            ...h,
            {
              id: crypto.randomUUID(),
              x: clamp(next - 2, 0, 98),
              y: clamp(duckY - 10 + Math.random() * 8, 5, 90),
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

  // --- Keyboard controls ---
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "ArrowRight" || e.key === "d") moveDuck(3);
      if (e.key === "ArrowLeft" || e.key === "a") moveDuck(-3);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveDuck]);

  return (
    <div className="intro">
      <div className="scene">
        <button className="musicToggle" onClick={toggleMusic}>
          🎵
        </button>
        {/* Top decoration */}
        <img className="decorTop" src="/top.png" alt="" aria-hidden="true" />

        {/* Hearts */}
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

        {/* Bubble */}
        <div
          className="bubble"
          style={{ left: `${duckX}%`, top: `${duckY - 18}%` }}
        >
          {bubbleText}
        </div>

        {/* Door */}
        <button
          className={`door ${duckNearDoor ? "door--glow" : ""}`}
          onClick={() => duckNearDoor && navigate("/valentine")}
          disabled={!duckNearDoor}
          aria-label="Enter the door"
        />

        {/* Duck */}
        <div
          className={`duck ${jumping ? "duck--jump" : ""} ${
            facing === "left" ? "duck--left" : ""
          }`}
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

        {/* Mobile controls */}
        <div className="controls">
          <button onClick={() => moveDuck(-3)} className="ctrl">
            ←
          </button>
          <button onClick={() => moveDuck(3)} className="ctrl">
            →
          </button>
        </div>
      </div>
    </div>
  );
}
