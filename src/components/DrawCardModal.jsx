import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/drawCard.css";

const EMOJIS = ["💖", "😘", "🌹", "🦆", "✨"];

export default function DrawCardModal({ onClose }) {
  const [showPreview, setShowPreview] = useState(false);
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  const [brush, setBrush] = useState(12);
  const [color, setColor] = useState("#7b3fe4"); // purple
  const [label, setLabel] = useState(""); // "what is this for?"
  const [previewUrl, setPreviewUrl] = useState("");
  const [activeEmoji, setActiveEmoji] = useState(null);
  const [toName, setToName] = useState("");
  const [fromName, setFromName] = useState("");
  const [note, setNote] = useState(
    "You are my heart, my life, my one and only thought. 💖",
  );

  // Track last point for smoother strokes
  const lastPoint = useRef({ x: 0, y: 0 });

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Pen style
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color;
      ctx.lineWidth = brush;

      // Cute glow
      ctx.shadowColor = "rgba(123, 63, 228, 0.35)";
      ctx.shadowBlur = 4;
    };

    resize();
    window.addEventListener("resize", resize);

    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep ctx updated when brush/color changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = color;
    ctx.lineWidth = brush;
    ctx.shadowColor = color + "55"; // quick glow
    ctx.shadowBlur = 4;
  }, [brush, color]);

  const getPos = (e) => {
    if (e.touches) e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e) => {
    const { x, y } = getPos(e);

    // ✅ If an emoji is selected, place it and do NOT draw
    if (activeEmoji) {
      stampEmojiAt(activeEmoji, x, y);
      setActiveEmoji(null); // optional: unselect after placing
      return;
    }

    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    lastPoint.current = { x, y };
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);

    // smoother marker feel
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    lastPoint.current = { x, y };
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPreviewUrl("");
  };

  const updatePreviewImage = () => {
    const url = buildFinalCardDataUrl(); // or canvas.toDataURL if you haven't built the final card yet
    setPreviewUrl(url);
  };

  const makePreview = () => {
    updatePreviewImage();
    setShowPreview(true);
  };

  const download = () => {
    const url = previewUrl || buildFinalCardDataUrl();
    setPreviewUrl(url);

    const a = document.createElement("a");
    a.href = url;
    a.download = toName ? `valentine-for-${toName}.png` : "valentine-card.png";
    a.click();
  };

  const share = async () => {
    const url = previewUrl || buildFinalCardDataUrl();
    setPreviewUrl(url);

    const blob = await (await fetch(url)).blob();
    const fileName = toName
      ? `valentine-for-${toName}.png`
      : "valentine-card.png";
    const file = new File([blob], fileName, { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: "Valentine Card 💘",
          text: toName ? `A card for ${toName}` : "I made you a card 💌",
          files: [file],
        });
        return;
      } catch {
        return;
      }
    }

    download();
  };
  const stampEmojiAt = (emoji, x, y) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.font = "48px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, x, y);
    ctx.restore();

    updatePreviewImage(); // ✅ update image silently, don't open modal
  };

  const buildFinalCardDataUrl = () => {
    const drawCanvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;

    // final output size (nice for download)
    const W = 900;
    const H = 600;

    const out = document.createElement("canvas");
    out.width = W * dpr;
    out.height = H * dpr;

    const ctx = out.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // ✅ Background (light pink)
    ctx.fillStyle = "#ffe6f1";
    ctx.fillRect(0, 0, W, H);

    // ✅ inner white card
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    roundRect(ctx, 40, 40, W - 80, H - 80, 26);
    ctx.fill();

    // ✅ cute border
    ctx.strokeStyle = "rgba(255, 79, 134, 0.45)";
    ctx.lineWidth = 6;
    roundRect(ctx, 40, 40, W - 80, H - 80, 26);
    ctx.stroke();

    // ✅ top quote/message
    ctx.fillStyle = "#333";
    ctx.font = "700 26px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    wrapText(ctx, note || "Happy Valentine’s Day! 💖", W / 2, 95, W - 140, 30);

    // ✅ drawing area frame
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 3;
    roundRect(ctx, 120, 150, W - 240, 300, 18);
    ctx.stroke();

    // ✅ draw the user's drawing into the card
    // drawCanvas has device pixels; easiest is using drawImage with scaling
    ctx.drawImage(drawCanvas, 120, 150, W - 240, 300);

    // ✅ To / From at bottom
    ctx.fillStyle = "#ff4f86";
    ctx.font = "800 34px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(toName ? `For ${toName}` : "For my Valentine", W / 2, 510);

    ctx.fillStyle = "#666";
    ctx.font = "700 22px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(fromName ? `From ${fromName}` : "From ________", W / 2, 548);

    return out.toDataURL("image/png");
  };
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(" ");
    let line = "";
    let yy = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, yy);
        line = words[n] + " ";
        yy += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, yy);
  }

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="modal modal--big modal--scrapbook">
        <div className="modalTop">
          <div className="modalTitle">Draw your Valentine card ✍️</div>
          <button className="modalClose" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* NEW: label input */}
        <div className="metaRow">
          <label className="metaLabel">
            To:
            <input
              className="metaInput"
              value={toName}
              onChange={(e) => setToName(e.target.value)}
              placeholder="Karine"
            />
          </label>

          <label className="metaLabel">
            From:
            <input
              className="metaInput"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Your Name"
            />
          </label>

          <label className="metaLabel metaLabel--wide">
            Message:
            <input
              className="metaInput"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write something cute…"
            />
          </label>
          <label className="metaLabel">
            What is this for?
            <input
              className="metaInput"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex: For Lucas / For my Valentine / For Mom"
            />
          </label>

          <label className="brush">
            Brush
            <input
              type="range"
              min="2"
              max="20"
              value={brush}
              onChange={(e) => setBrush(Number(e.target.value))}
            />
          </label>

          <label className="brush">
            Color
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
        </div>

        {/* NEW: emoji stamps */}
        <div className="emojiRow">
          {activeEmoji && (
            <div className="stampHint">
              Tap the canvas to place: <span>{activeEmoji}</span>
            </div>
          )}
          <div className="emojiTitle">Add cute emojis:</div>
          <div className="emojiBtns">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className={`emojiBtn ${activeEmoji === e ? "emojiBtn--active" : ""}`}
                onClick={() => setActiveEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="canvasWrap">
          <canvas
            ref={canvasRef}
            className="drawCanvas drawCanvas--pink"
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={end}
          />
        </div>

        {/* Preview */}
        <div className="previewRow">
          <button type="button" onClick={makePreview}>
            Preview
          </button>
          <button type="button" onClick={clear}>
            Clear
          </button>
          <button type="button" onClick={download}>
            Download
          </button>
          <button type="button" onClick={share}>
            Share 💌
          </button>
        </div>

        {/* ✅ PREVIEW OVERLAY GOES RIGHT HERE */}
        {showPreview && previewUrl && (
          <div className="previewOverlay" role="dialog" aria-modal="true">
            <div className="previewModal">
              <div className="previewTop">
                <div className="previewHeading">CARD PREVIEW</div>
                <button
                  type="button"
                  className="previewClose"
                  onClick={() => setShowPreview(false)}
                  aria-label="Close preview"
                >
                  ✕
                </button>
              </div>

              <img
                className="previewBigImg"
                src={previewUrl}
                alt="Card preview"
              />

              <div className="previewActions">
                <button type="button" onClick={download}>
                  Download
                </button>
                <button type="button" onClick={share}>
                  Share 💌
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
