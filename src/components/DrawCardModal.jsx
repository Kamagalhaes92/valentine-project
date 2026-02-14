import { useCallback, useEffect, useRef, useState } from "react";
import "../styles/drawCard.css";

import { saveCard, uploadCardImage } from "../firebase";

const EMOJIS = ["💖", "😘", "🌹", "🦆", "✨"];

export default function DrawCardModal({ onClose }) {
  const [shareUrl, setShareUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // ---------------------------
  // Refs
  // ---------------------------
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  // ---------------------------
  // UI state
  // ---------------------------
  const [activeEmoji, setActiveEmoji] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [strokeCount, setStrokeCount] = useState(0);
  const MAX_STROKES = 5;

  // ---------------------------
  // Card fields
  // ---------------------------
  const [toName, setToName] = useState("");
  const [fromName, setFromName] = useState("");
  const [label, setLabel] = useState("");
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState(
    "You are my heart, my life, my one and only thought. 💖",
  );

  // ---------------------------
  // Brush
  // ---------------------------
  const [brush, setBrush] = useState(12);
  const [color, setColor] = useState("#7b3fe4");

  // ---------------------------
  // Canvas helpers
  // ---------------------------
  const getCtx = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return null;
    return c.getContext("2d");
  }, []);

  const applyPenStyle = useCallback(
    (ctx) => {
      if (!ctx) return;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color;
      ctx.lineWidth = brush;
      ctx.shadowColor = `${color}55`;
      ctx.shadowBlur = 4;
    },
    [brush, color],
  );

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // keep drawing when resizing
    const snapshot = document.createElement("canvas");
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    snapshot.getContext("2d")?.drawImage(canvas, 0, 0);

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // restore old content
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(
      snapshot,
      0,
      0,
      snapshot.width,
      snapshot.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    ctx.restore();

    applyPenStyle(ctx);
  }, [applyPenStyle]);

  const getPosFromPointerEvent = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  // ---------------------------
  // Build final card image
  // ---------------------------
  const buildFinalCardDataUrl = useCallback(() => {
    const drawCanvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;

    const W = 720;
    const H = 480;

    const out = document.createElement("canvas");
    out.width = W * dpr;
    out.height = H * dpr;

    const ctx = out.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = "#ffe6f1";
    ctx.fillRect(0, 0, W, H);

    // Card
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    roundRect(ctx, 40, 40, W - 80, H - 80, 26);
    ctx.fill();

    // Border
    ctx.strokeStyle = "rgba(255, 79, 134, 0.45)";
    ctx.lineWidth = 6;
    roundRect(ctx, 40, 40, W - 80, H - 80, 26);
    ctx.stroke();

    // Top message
    ctx.fillStyle = "#333";
    ctx.font = "700 26px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    wrapText(ctx, note || "Happy Valentine’s Day! 💖", W / 2, 95, W - 140, 30);

    // Optional label
    if (label.trim()) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.font = "700 16px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillText(label.trim(), W / 2, 135);
    }

    // Drawing frame
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 3;
    roundRect(ctx, 120, 150, W - 240, 300, 18);
    ctx.stroke();

    // User drawing
    if (drawCanvas) ctx.drawImage(drawCanvas, 120, 150, W - 240, 300);

    // To/From
    ctx.fillStyle = "#ff4f86";
    ctx.font = "800 34px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(toName ? `For ${toName}` : "For my Valentine", W / 2, 510);

    ctx.fillStyle = "#666";
    ctx.font = "700 22px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(fromName ? `From ${fromName}` : "From ________", W / 2, 548);

    return out.toDataURL("image/png", 0.85);
  }, [fromName, label, note, toName]);

  // ---------------------------
  // Canvas interactions (Pointer Events)
  // ---------------------------
  const stampEmojiAt = useCallback(
    (emoji, x, y) => {
      const ctx = getCtx();
      if (!ctx) return;

      ctx.save();
      ctx.shadowBlur = 0;
      ctx.font = "48px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, x, y);
      ctx.restore();
    },
    [getCtx],
  );

  const onPointerDown = useCallback(
    (e) => {
      if (!activeEmoji && strokeCount >= MAX_STROKES) return;
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (!canvas || !ctx) return;

      canvas.setPointerCapture?.(e.pointerId);

      const { x, y } = getPosFromPointerEvent(e);

      // Emoji mode
      if (activeEmoji) {
        stampEmojiAt(activeEmoji, x, y);
        setActiveEmoji(null);
        return;
      }

      setStrokeCount((n) => n + 1);
      drawingRef.current = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [activeEmoji, getCtx, getPosFromPointerEvent, stampEmojiAt],
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!drawingRef.current) return;

      const ctx = getCtx();
      if (!ctx) return;

      const { x, y } = getPosFromPointerEvent(e);

      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [getCtx, getPosFromPointerEvent],
  );

  const onPointerUp = useCallback(() => {
    drawingRef.current = false;
  }, []);

  // ---------------------------
  // Actions
  // ---------------------------
  const clearCanvas = useCallback(() => {
    setStrokeCount(0);
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.restore();

    setPreviewUrl("");
    setShowPreview(false);
  }, [getCtx]);

  const makePreview = useCallback(() => {
    const url = buildFinalCardDataUrl();
    setPreviewUrl(url);
    setShowPreview(true);
  }, [buildFinalCardDataUrl]);

  const download = useCallback(() => {
    const url = previewUrl || buildFinalCardDataUrl();
    setPreviewUrl(url);

    const a = document.createElement("a");
    a.href = url;
    a.download = toName ? `valentine-for-${toName}.png` : "valentine-card.png";
    a.click();
  }, [buildFinalCardDataUrl, previewUrl, toName]);

  const share = useCallback(async () => {
    try {
      setIsSaving(true);

      // Build preview (dataUrl)
      const dataUrl = previewUrl || buildFinalCardDataUrl();
      setPreviewUrl(dataUrl);
      setShowPreview(true);

      // Convert to Blob and upload to Storage
      const blob = await (await fetch(dataUrl)).blob();
      const imageUrl = await uploadCardImage(blob, "valentine.png");

      // Save card to Firestore (store the imageUrl from Storage!)
      const cardId = await saveCard({
        toName,
        fromName,
        label,
        note,
        imageUrl, // <- this is what Valentine page must render
        createdAt: Date.now(),
      });

      // Create share link (will be localhost in dev, real domain after deploy)
      const url = `${window.location.origin}/valentine?card=${cardId}`;
      setShareUrl(url);

      // optional: auto copy
      // await navigator.clipboard.writeText(url);
    } catch (err) {
      console.error(err);
      alert(`Share failed: ${err?.message || err}`);
    } finally {
      setIsSaving(false);
    }
  }, [previewUrl, buildFinalCardDataUrl, toName, fromName, label, note]);

  // ---------------------------
  // Mount effects
  // ---------------------------
  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    const ctx = getCtx();
    applyPenStyle(ctx);
  }, [applyPenStyle, getCtx]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showPreview) setShowPreview(false);
        else onClose?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, showPreview]);

  // ---------------------------
  // Render
  // ---------------------------
  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target.classList.contains("modalOverlay")) onClose?.();
      }}
    >
      <div className="modal modal--big modal--scrapbook">
        <div className="modalTop">
          <div className="modalTitle">Draw your Valentine card ✍️</div>
          <button className="modalClose" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Scrollable middle so small phones still see buttons */}
        <div className="modalMiddle">
          <div className="metaRow">
            <label className="metaLabel">
              To:
              <input
                className="metaInput"
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                placeholder="Someone special"
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
                onChange={(e) => {
                  setNote(e.target.value);
                  setShareUrl("");
                }}
                placeholder="Write something cute…"
              />
            </label>

            <label className="metaLabel">
              What is this for?
              <input
                className="metaInput"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ex: For Friend / For Mom / For my Valentine"
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

          <div className="emojiRow">
            {activeEmoji && (
              <div className="stampHint">
                Tap the canvas to place: <span>{activeEmoji}</span>
              </div>
            )}

            <div className="emojiTitle">Add cute emojis:</div>
            <div className="strokeHint">
              Strokes left: {Math.max(0, MAX_STROKES - strokeCount)}
            </div>

            <div className="emojiBtns">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`emojiBtn ${
                    activeEmoji === emoji ? "emojiBtn--active" : ""
                  }`}
                  onClick={() => setActiveEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="canvasWrap">
            <canvas
              ref={canvasRef}
              className="drawCanvas drawCanvas--pink"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={onPointerUp}
            />
          </div>
        </div>

        <div className="previewRow">
          <button type="button" onClick={makePreview}>
            Preview
          </button>
          <button type="button" onClick={clearCanvas}>
            Clear
          </button>
          <button type="button" onClick={download}>
            Download
          </button>
          <button type="button" onClick={share} disabled={isSaving}>
            {isSaving ? "Saving..." : "Share 💌"}
          </button>
        </div>

        {shareUrl && (
          <div className="shareInline">
            <div className="shareInlineTitle">
              Your surprise link is ready 💌
            </div>
            <input
              className="shareInlineUrl"
              value={shareUrl}
              readOnly
              onFocus={(e) => e.target.select()}
            />

            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(shareUrl)}
            >
              Copy link
            </button>
          </div>
        )}

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
                {shareUrl && (
                  <div className="shareBox">
                    <div className="shareTitle">
                      Okay… now send the surprise 💌
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(shareUrl);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1400);
                        } catch {
                          alert(
                            "Couldn’t copy. Select the link and copy manually.",
                          );
                        }
                      }}
                    >
                      {copied ? "Copied! 💘" : "Copy link"}
                    </button>

                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `I need to ask you something… 💌 Promise you’ll go all the way to the end: ${shareUrl}`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>

                    <a
                      href={`sms:?&body=${encodeURIComponent(
                        `I need to ask you something… 💌 ${shareUrl}`,
                      )}`}
                    >
                      Text message
                    </a>

                    <a
                      href={`mailto:?subject=${encodeURIComponent(
                        "Can I ask you something? 💌",
                      )}&body=${encodeURIComponent(
                        `I need to ask you something… 💌 Promise you’ll go all the way to the end: ${shareUrl}`,
                      )}`}
                    >
                      Email
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------
// Helpers
// ---------------------------
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
