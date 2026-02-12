import { useMemo, useState, useContext } from "react";
import "../styles/valentine.css";
import { MusicContext } from "../App";
import DrawCardModal from "../components/DrawCardModal";

export default function Valentine() {
  const audioRef = useContext(MusicContext);
  const [fallingHearts, setFallingHearts] = useState([]);
  const playSfx = (src, volume = 0.9) => {
    const s = new Audio(src);
    s.volume = volume;
    s.play().catch(() => {});
  };

  const [yes, setYes] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const spawnHearts = () => {
    const batch = Array.from({ length: 18 }).map(() => ({
      id: crypto.randomUUID(),
      left: Math.random() * 100, // vw
      delay: Math.random() * 0.6, // seconds
      size: 18 + Math.random() * 22, // px
      dur: 2.8 + Math.random() * 1.6, // seconds
    }));

    setFallingHearts(batch);

    // clear after animation ends
    setTimeout(() => setFallingHearts([]), 5200);
  };

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
      { left: 8, top: 20, size: 200, delay: 0.2 },
      { left: 78, top: 16, size: 180, delay: 0.9 },
      { left: 12, top: 68, size: 250, delay: 0.5 },
      { left: 70, top: 72, size: 185, delay: 1.4 },
      { left: 40, top: 10, size: 155, delay: 1.1 },
      { left: 45, top: 78, size: 200, delay: 1.8 },
    ],
    [],
  );

  const toggleMusic = () => {
    const a = audioRef?.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const spots = useMemo(
    () => [
      { x: 15, y: 30 },
      { x: 85, y: 30 },
      { x: 15, y: 75 },
      { x: 85, y: 75 },
      { x: 50, y: 25 },
      { x: 50, y: 80 },
      { x: 25, y: 55 },
      { x: 75, y: 55 },
      { x: 10, y: 55 },
      { x: 90, y: 55 },
    ],
    [],
  );

  const [noPos, setNoPos] = useState({ x: 62, y: 62 });

  const moveNo = () => {
    setIsRunning(true);

    const newSpot = spots[Math.floor(Math.random() * spots.length)];

    setNoPos(newSpot);
  };

  return (
    <div className="valentinePage">
      <img
        className="cornerSix cornerSix--left"
        src="/six.png"
        alt=""
        aria-hidden="true"
      />
      <img
        className="cornerSix cornerSix--right"
        src="/six.png"
        alt=""
        aria-hidden="true"
      />

      <div className="rightControls">
        <button
          className="iconBtn"
          onClick={toggleMusic}
          aria-label="Toggle music"
        >
          🎵
        </button>

        <button
          className="iconBtn"
          onClick={() => setShowCanvas(true)}
          aria-label="Open canvas"
        >
          Canvas ✍️
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
      <div className="duckLayer" aria-hidden="true">
        {duckImages.map((src, i) => (
          <img
            key={src}
            src={src}
            className={`sceneDuck ${yes ? "sceneDuck--party" : ""}`}
            style={{
              left: `${duckSpots[i].left}%`,
              top: `${duckSpots[i].top}%`,
              width: `${duckSpots[i].size}px`,
              animationDelay: `${duckSpots[i].delay}s`,
            }}
            alt=""
          />
        ))}
      </div>

      {/* YES screen */}

      {yes && (
        <div className="yesScreen">
          <div className="yesMessage">YAY!! 💘 I knew you’d say yes 🦆✨</div>

          <img className="yesGif" src="/giphy.gif" alt="" aria-hidden="true" />

          <button className="backBtn" onClick={() => setYes(false)}>
            ← Back
          </button>
        </div>
      )}

      {/* Question Frame (ONLY show when NOT yes) */}
      {!yes && (
        <div className="questionFrame">
          <div className="questionPanel">
            <div className="questionTitle">Will you be my valentine?</div>

            <div className="buttonRow">
              <button
                className="heartBtn heartBtn--yes"
                onClick={() => {
                  setYes(true);
                  playSfx("/clap.mp3", 0.9);
                  spawnHearts();
                }}
              >
                Yes
              </button>
              <button
                className={`heartBtn ${isRunning ? "noBtn--free" : ""}`}
                style={
                  isRunning ? { left: `${noPos.x}vw`, top: `${noPos.y}vh` } : {}
                }
                onMouseEnter={moveNo}
                onMouseDown={moveNo}
                onClick={moveNo}
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
