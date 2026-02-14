// src/pages/Valentine.jsx
import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import "../styles/valentine.css";

import { MusicContext } from "../App";
import HamburgerMenu from "../components/HamburgerMenu";
import DrawCardModal from "../components/DrawCardModal";
import { loadCardById } from "../firebase";

const DUCK_IMAGES = [
  "/duck1.png",
  "/duck2.png",
  "/duck3.png",
  "/duck4.png",
  "/duck5.png",
  "/duck6.png",
];

const DUCK_SPOTS = [
  // TOP (spread out more)
  { left: 18, top: 18, size: 190, delay: 0.2, mLeft: 50, mTop: 14, mSize: 170 },
  { left: 82, top: 20, size: 200, delay: 0.9, mLeft: 50, mTop: 82, mSize: 190 },

  // SIDES / BOTTOM
  { left: 12, top: 78, size: 240, delay: 0.5 },
  { left: 88, top: 78, size: 210, delay: 1.4 },
  { left: 50, top: 10, size: 160, delay: 1.1 },
  { left: 50, top: 88, size: 200, delay: 1.8 },
];

function safeUUID() {
  return (
    crypto?.randomUUID?.() ??
    `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
  );
}

export default function Valentine() {
  const navigate = useNavigate();
  const audioRef = useContext(MusicContext);
  const [receiverCreateMode, setReceiverCreateMode] = useState(false);

  // -----------------------------
  // Mode: receiver (?card=...) or visitor
  // -----------------------------
  const cardId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("card") || sessionStorage.getItem("pendingCardId") || "";
  }, []);

  const isReceiver = Boolean(cardId);

  // -----------------------------
  // Responsive helper
  // -----------------------------
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 640px)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // -----------------------------
  // Receiver card data
  // -----------------------------
  const [receivedCard, setReceivedCard] = useState(null);

  useEffect(() => {
    if (!cardId) return;

    loadCardById(cardId)
      .then((data) => {
        setReceivedCard(data);
        sessionStorage.removeItem("pendingCardId");
      })
      .catch(console.error);
  }, [cardId]);

  const questionTitle = useMemo(() => {
    const name = receivedCard?.toName?.trim();
    return name
      ? `${name}, will you be my valentine?`
      : "Will you be my valentine?";
  }, [receivedCard]);

  // -----------------------------
  // Flow state
  // -----------------------------
  const [envelopeOpen, setEnvelopeOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false); // receiver only
  const [showQuestion, setShowQuestion] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);

  // Seal hint appears after a few seconds (when closed)
  const [showSealHint, setShowSealHint] = useState(false);

  useEffect(() => {
    if (envelopeOpen) return;
    setShowSealHint(false);
    const t = window.setTimeout(() => setShowSealHint(true), 2500);
    return () => window.clearTimeout(t);
  }, [envelopeOpen]);

  // -----------------------------
  // YES state + falling hearts
  // -----------------------------
  const [yes, setYes] = useState(false);
  const [fallingHearts, setFallingHearts] = useState([]);

  const spawnHearts = useCallback(() => {
    const batch = Array.from({ length: 18 }).map(() => ({
      id: safeUUID(),
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      size: 18 + Math.random() * 22,
      dur: 2.8 + Math.random() * 1.6,
    }));
    setFallingHearts(batch);
    window.setTimeout(() => setFallingHearts([]), 5200);
  }, []);

  // -----------------------------
  // "No" button run-around inside panel
  // -----------------------------
  const panelRef = useRef(null);
  const noBtnRef = useRef(null);

  const [isRunning, setIsRunning] = useState(false);
  const [noStyle, setNoStyle] = useState({ left: "68%", top: "62%" });

  const moveNo = useCallback(() => {
    setIsRunning(true);

    const panel = panelRef.current;
    const btn = noBtnRef.current;
    if (!panel || !btn) return;

    const pad = 10;
    const pw = panel.clientWidth;
    const ph = panel.clientHeight;
    const bw = btn.offsetWidth;
    const bh = btn.offsetHeight;

    const maxX = Math.max(pad, pw - bw - pad);
    const maxY = Math.max(pad, ph - bh - pad);

    const x = pad + Math.random() * (maxX - pad);
    const y = pad + Math.random() * (maxY - pad);

    setNoStyle({ left: `${x}px`, top: `${y}px` });
  }, []);

  // -----------------------------
  // Audio helpers
  // -----------------------------
  const toggleMusic = useCallback(() => {
    const a = audioRef?.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, [audioRef]);

  const playSfx = useCallback((src, volume = 0.9) => {
    const s = new Audio(src);
    s.volume = volume;
    s.play().catch(() => {});
  }, []);

  // -----------------------------
  // Download helper (receiver)
  // -----------------------------
  const downloadFromUrl = useCallback(
    async (url, filename = "valentine-card.png") => {
      try {
        const res = await fetch(url, { mode: "cors" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = objUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

        URL.revokeObjectURL(objUrl);
      } catch (e) {
        console.error("Download failed, falling back to opening image:", e);

        // Fallback: open the image in a new tab so the user can long-press / save / download
        // (This avoids CORS restrictions entirely)
        window.open(url, "_blank", "noopener,noreferrer");

        // Optional: keep your alert, but I’d soften it:
        // alert("Your browser blocked the direct download. The image opened in a new tab so you can save it.");
      }
    },
    [],
  );

  // -----------------------------
  // Reset to closed envelope (close button)
  // -----------------------------
  const resetToEnvelope = useCallback(() => {
    setYes(false);
    setFallingHearts([]);

    setShowCanvas(false);
    setShowQuestion(false);

    setIsRunning(false);
    setNoStyle({ left: "68%", top: "62%" });

    setEnvelopeOpen(false);
    setHasOpened(false);

    // ✅ IMPORTANT: if they arrived as receiver, next open should allow creating a card
    if (isReceiver) setReceiverCreateMode(true);
  }, [isReceiver]);

  // -----------------------------
  // Open envelope
  // -----------------------------
  const onEnvelopeOpen = useCallback(() => {
    if (envelopeOpen) return;

    setEnvelopeOpen(true);
    playSfx("/seal-pop.mp3", 0.9);

    window.setTimeout(() => {
      if (isReceiver) {
        if (receiverCreateMode) {
          setShowCanvas(true); // ✅ second open = create card
        } else {
          setHasOpened(true); // ✅ first open = question
          setShowQuestion(true);
        }
      } else {
        setShowCanvas(true);
      }
    }, 520);
  }, [envelopeOpen, isReceiver, receiverCreateMode, playSfx]);

  {
    isReceiver && (
      <button
        className="ctaHeart"
        onClick={() => {
          setReceiverCreateMode(true);
          setShowCanvas(true);
        }}
        type="button"
      >
        ...
      </button>
    );
  }

  // -----------------------------
  // Reset on tab switch / bfcache
  // -----------------------------
  useEffect(() => {
    const hardReset = () => {
      setEnvelopeOpen(false);
      setHasOpened(false);
      setShowQuestion(false);
      setShowCanvas(false);
      setYes(false);
      setIsRunning(false);
      setNoStyle({ left: "68%", top: "62%" });
    };

    hardReset();

    const onVis = () => {
      if (document.visibilityState === "visible") hardReset();
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", hardReset);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", hardReset);
    };
  }, []);

  // -----------------------------
  // YES click (no cute messages)
  // -----------------------------
  const onYes = useCallback(() => {
    setYes(true);
    playSfx("/clap.mp3", 0.9);
    spawnHearts();
  }, [playSfx, spawnHearts]);

  // -----------------------------
  // Visibility rules
  // -----------------------------
  const showEnvelope = !yes && (!isReceiver || !hasOpened);
  const showReceiverQuestion = !yes && isReceiver && hasOpened && showQuestion;

  // fewer ducks on desktop so they don’t stack in the header zone
  const visibleDuckCount = isMobile ? 2 : 4;

  return (
    <div className="valentinePage">
      <HamburgerMenu />

      {/* TOP BAR */}
      <div className="valTopBar">
        <h1 className="valTitle">
          {isReceiver ? "A Valentine for you 💌" : "Create Something Special 🎔"}
        </h1>

        <div className="valTopRight">
          <button
            className="iconBtn"
            onClick={toggleMusic}
            aria-label="Toggle music"
            type="button"
          >
            🎵
          </button>

          {/* Keep as you had it: only receiver sees it in header */}
          {isReceiver && !receiverCreateMode && (
            <button
              className="ctaHeart"
              onClick={() => setShowCanvas(true)}
              type="button"
            >
              <span className="ctaHalo" aria-hidden="true" />
              <span className="ctaSparkles" aria-hidden="true" />
              <span className="ctaLabel">Create Card</span>
            </button>
          )}
        </div>
      </div>

      {/* corner 6s */}
      <img
        className="cornerSix cornerSix--left"
        src="/6.png"
        alt=""
        aria-hidden="true"
      />
      <img
        className="cornerSix cornerSix--right"
        src="/6.png"
        alt=""
        aria-hidden="true"
      />

      {/* sprinkles */}
      <div className="sprinkleLayer" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="sprinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${6 + Math.random() * 6}s`,
              transform: `translate3d(0,0,0) scale(${0.7 + Math.random() * 0.9})`,
            }}
          />
        ))}
      </div>

      {/* falling hearts */}
      <div className="fallingHearts" aria-hidden="true">
        {fallingHearts.map((h) => (
          <div
            key={h.id}
            className="fallHeart"
            style={{
              left: `${h.left}vw`,
              width: `${h.size}px`,
              height: `${h.size}px`,
              animationDelay: `${h.delay}s`,
              animationDuration: `${h.dur}s`,
            }}
          />
        ))}
      </div>

      {/* ducks */}
      {DUCK_IMAGES.slice(0, visibleDuckCount).map((src, i) => {
        const spot = DUCK_SPOTS[i];
        const left = isMobile && spot.mLeft != null ? spot.mLeft : spot.left;
        const top = isMobile && spot.mTop != null ? spot.mTop : spot.top;
        const size = isMobile && spot.mSize != null ? spot.mSize : spot.size;

        return (
          <img
            key={`${src}_${i}`}
            src={src}
            className={`sceneDuck ${yes ? "sceneDuck--party" : ""}`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${size}px`,
              animationDelay: `${spot.delay}s`,
            }}
            alt=""
            aria-hidden="true"
          />
        );
      })}

      {/* YES SCREEN */}
      {yes && (
        <div className="yesScreen">
          {receivedCard && (
            <>
              <div className="receivedCard">
                {receivedCard.label?.trim() && (
                  <div className="receivedCardLabel">{receivedCard.label}</div>
                )}

                {/* ✅ Avoid duplicate message:
                    - If image exists, show ONLY the image (PNG already contains message)
                    - If no image, show ONLY the note text
                */}
                {receivedCard.imageUrl ? (
                  <img
                    className="receivedCardImg"
                    src={receivedCard.imageUrl}
                    alt="Valentine card"
                    loading="lazy"
                  />
                ) : (
                  <div className="receivedCardBody">
                    {receivedCard.note || "💌"}
                  </div>
                )}
              </div>

              {receivedCard.imageUrl && (
                <div className="receivedCardActions">
                  <button
                    className="receivedActionBtn"
                    type="button"
                    onClick={() =>
                      downloadFromUrl(
                        receivedCard.imageUrl,
                        receivedCard.toName
                          ? `valentine-for-${receivedCard.toName}.png`
                          : "valentine-card.png",
                      )
                    }
                  >
                    ⬇️ Download
                  </button>
                </div>
              )}
            </>
          )}

          <button className="backBtn" type="button" onClick={resetToEnvelope}>
            ← Back
          </button>
        </div>
      )}

      {/* ENVELOPE */}
      {showEnvelope && (
        <div className="centerStack">
          <button
            className={`envelope ${envelopeOpen ? "isOpen" : ""}`}
            onClick={onEnvelopeOpen}
            type="button"
            aria-label="Open envelope"
          >
            <span className="envelopeBack" aria-hidden="true" />
            <span className="envelopePaper" aria-hidden="true" />
            <span className="envelopeFlap" aria-hidden="true" />

            <span className="sealWrap" aria-hidden="true">
              <span className="sealHeart">
                <span className="sealHeartIcon">💗</span>
              </span>

              {showSealHint && (
                <span className="sealHint">
                  {isReceiver
                    ? "Press the seal 💌"
                    : "Press the seal to start 💌"}
                </span>
              )}
            </span>
          </button>
        </div>
      )}

      {/* RECEIVER QUESTION */}
      {showReceiverQuestion && (
        <div className="questionFrame">
          <div className="questionCard" ref={panelRef}>
            <button
              type="button"
              className="questionClose"
              onClick={resetToEnvelope}
              aria-label="Close"
            >
              ✕
            </button>

            <h2 className="questionTitle">{questionTitle}</h2>

            <div className="buttonRow">
              <button
                className="heartBtn heartBtn--yes"
                onClick={onYes}
                type="button"
              >
                Yes
              </button>

              <button
                ref={noBtnRef}
                className={`heartBtn heartBtn--no ${isRunning ? "isRunning" : ""}`}
                style={isRunning ? noStyle : undefined}
                onClick={moveNo}
                type="button"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAW MODAL */}
      {showCanvas && <DrawCardModal onClose={resetToEnvelope} />}
    </div>
  );
}
