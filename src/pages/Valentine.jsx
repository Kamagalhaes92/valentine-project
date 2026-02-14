import { useEffect, useMemo, useRef, useState, useContext } from "react";
import "../styles/valentine.css";
import { MusicContext } from "../App";
import DrawCardModal from "../components/DrawCardModal";
import HamburgerMenu from "../components/HamburgerMenu";
import { loadCardById } from "../firebase";

export default function Valentine() {
  const audioRef = useContext(MusicContext);

  const [fallingHearts, setFallingHearts] = useState([]);
  const [yes, setYes] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [receivedCard, setReceivedCard] = useState(null);
  const cardId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("card");
  }, []);

  // ✅ MOBILE: only 2 ducks
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 640px)").matches,
  );

  const cuteYesMessages = [
    "Life is better with you in it — today, tomorrow, and every day after 🌷 🦆✨",
    "You make my world softer, brighter, and so much happier 💗✨ I’m so lucky to have you.",
    "However love looks for us, I’m grateful we share it 💞 You mean more than you know",
  ];

  const [yesMessage, setYesMessage] = useState("");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const playSfx = (src, volume = 0.9) => {
    const s = new Audio(src);
    s.volume = volume;
    s.play().catch(() => {});
  };

  const spawnHearts = () => {
    const batch = Array.from({ length: 18 }).map(() => ({
      id: crypto.randomUUID(),
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      size: 18 + Math.random() * 22,
      dur: 2.8 + Math.random() * 1.6,
    }));
    setFallingHearts(batch);
    setTimeout(() => setFallingHearts([]), 5200);
  };

  useEffect(() => {
    if (!cardId) return;
    loadCardById(cardId).then(setReceivedCard).catch(console.error);
  }, [cardId]);
  // Ducks
  const duckImages = useMemo(
    () => [
      "/duck1.png",
      "/duck2.png",
      "/duck3.png",
      "/duck4.png",
      "/duck5.png",
      "/duck6.png",
    ],
    [],
  );

  const duckSpots = useMemo(
    () => [
      // Duck 1 (mobile: top center)
      {
        left: 50,
        top: 18,
        size: 220,
        delay: 0.2,
        mLeft: 50,
        mTop: 14,
        mSize: 180,
      },

      // Duck 2 (mobile: bottom center)
      {
        left: 86,
        top: 24,
        size: 200,
        delay: 0.9,
        mLeft: 50,
        mTop: 84,
        mSize: 200,
      },

      // remaining ducks (desktop only)
      { left: 14, top: 74, size: 260, delay: 0.5 },
      { left: 80, top: 78, size: 205, delay: 1.4 },
      { left: 50, top: 12, size: 170, delay: 1.1 },
      { left: 52, top: 84, size: 210, delay: 1.8 },
    ],
    [],
  );

  const visibleDuckCount = isMobile ? 2 : duckImages.length;

  const toggleMusic = () => {
    const a = audioRef?.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  // ✅ Keep NO inside the panel
  const panelRef = useRef(null);
  const noBtnRef = useRef(null);
  const [noStyle, setNoStyle] = useState({ left: "68%", top: "62%" });
  const [isRunning, setIsRunning] = useState(false);

  const moveNo = () => {
    setIsRunning(true);

    const panel = panelRef.current;
    const btn = noBtnRef.current;
    if (!panel || !btn) return;

    const pad = 10; // keep away from edges a bit
    const pw = panel.clientWidth;
    const ph = panel.clientHeight;
    const bw = btn.offsetWidth;
    const bh = btn.offsetHeight;

    const maxX = Math.max(pad, pw - bw - pad);
    const maxY = Math.max(pad, ph - bh - pad);

    const x = pad + Math.random() * (maxX - pad);
    const y = pad + Math.random() * (maxY - pad);

    // store as px for consistent bounds
    setNoStyle({ left: `${x}px`, top: `${y}px` });
  };

  return (
    <div className="valentinePage">
      <HamburgerMenu />

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

      {/* ✨ new floating sprinkles layer */}
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

      <div className="rightControls">
        <button
          className="iconBtn"
          onClick={toggleMusic}
          aria-label="Toggle music"
        >
          🎵
        </button>

        <button
          className="ctaHeart"
          onClick={() => setShowCanvas(true)}
          aria-label="Create card"
        >
          <span className="ctaHalo" aria-hidden="true" />
          <span className="ctaSparkles" aria-hidden="true" />
          <span className="ctaLabel">Create Card</span>
        </button>
      </div>

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

      {/* Ducks scattered */}
      {duckImages.slice(0, visibleDuckCount).map((src, i) => {
        const spot = duckSpots[i];
        const left = isMobile && spot.mLeft != null ? spot.mLeft : spot.left;
        const top = isMobile && spot.mTop != null ? spot.mTop : spot.top;
        const size = isMobile && spot.mSize != null ? spot.mSize : spot.size;

        return (
          <img
            key={src}
            src={src}
            className={`sceneDuck ${yes ? "sceneDuck--party" : ""}`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${size}px`,
              animationDelay: `${spot.delay}s`,
            }}
            alt=""
          />
        );
      })}

      {yes && (
        <div className="yesScreen">
          <div className="yesMessage">{yesMessage}</div>

          {/* 💌 Shared card appears here */}
          {receivedCard && (
            <div className="receivedCard">
              {receivedCard.label?.trim() && (
                <div className="receivedCardLabel">{receivedCard.label}</div>
              )}

              <div className="receivedCardBody">
                {receivedCard.note || "💌"}
              </div>

              <div className="receivedCardMeta">
                <div className="receivedCardTo">
                  {receivedCard.toName
                    ? `For ${receivedCard.toName}`
                    : "For my Valentine"}
                </div>
                <div className="receivedCardFrom">
                  — {receivedCard.fromName || "Someone who loves you"}
                </div>
              </div>

              {receivedCard.imageUrl && (
                <img
                  className="receivedCardImg"
                  src={receivedCard.imageUrl}
                  alt="Valentine card"
                  loading="lazy"
                />
              )}
            </div>
          )}

          <img className="yesGif" src="/giphy.gif" alt="" />

          <button className="backBtn" onClick={() => setYes(false)}>
            ← Back
          </button>
        </div>
      )}

      {!yes && (
        <div className="questionFrame">
          {/* ✅ Modern inner card + relative positioning */}
          <div className="questionCard" ref={panelRef}>
            <h1 className="questionTitle">Will you be my valentine?</h1>

            <div className="buttonRow">
              <button
                className="heartBtn heartBtn--yes"
                onClick={async () => {
                  const random =
                    cuteYesMessages[
                      Math.floor(Math.random() * cuteYesMessages.length)
                    ];

                  setYesMessage(random);
                  setYes(true);

                  playSfx("/clap.mp3", 0.9);
                  spawnHearts();

                  // 🔗 check if someone opened a shared link
                  setYes(true);
                }}
              >
                Yes
              </button>

              <button
                ref={noBtnRef}
                className={`heartBtn heartBtn--no ${isRunning ? "isRunning" : ""}`}
                style={isRunning ? noStyle : undefined}
                onClick={moveNo} // ✅ only click triggers running
                type="button"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {showCanvas && <DrawCardModal onClose={() => setShowCanvas(false)} />}
    </div>
  );
}
