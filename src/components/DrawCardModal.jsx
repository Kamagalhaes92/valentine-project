import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/drawCard.css";
import { saveCard, uploadCardImage } from "../firebase";

const EMOJIS = ["💖", "😘", "🌹", "🦆", "✨"];
const MAX_STROKES = 5;

export default function DrawCardModal({ onClose }) {
  // ---------------------------
  // Refs
  // ---------------------------
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  // ---------------------------
  // Form state
  // ---------------------------
  const [toName, setToName] = useState("");
  const [fromName, setFromName] = useState("");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState(
    "You are my heart, my life, my one and only thought. 💖",
  );

  // ---------------------------
  // Drawing state
  // ---------------------------
  const [activeEmoji, setActiveEmoji] = useState(null);
  const [strokeCount, setStrokeCount] = useState(0);
  const [brush, setBrush] = useState(10);
  const [color, setColor] = useState("#ff4f86");

  // ---------------------------
  // Preview / share
  // ---------------------------
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canShare = useMemo(
    () => toName.trim() && fromName.trim(),
    [toName, fromName],
  );
  const strokesLeft = Math.max(0, MAX_STROKES - strokeCount);

  // ---------------------------
  // Canvas helpers
  // ---------------------------
  const getCtx = useCallback(() => {
    const c = canvasRef.current;
    return c ? c.getContext("2d") : null;
  }, []);

  const applyPenStyle = useCallback(
    (ctx) => {
      if (!ctx) return;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color;
      ctx.lineWidth = brush;
      ctx.shadowColor = `${color}33`;
      ctx.shadowBlur = 3;
    },
    [brush, color],
  );

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // snapshot so resize doesn't wipe drawings
    const snap = document.createElement("canvas");
    snap.width = canvas.width;
    snap.height = canvas.height;
    snap.getContext("2d")?.drawImage(canvas, 0, 0);

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    // map drawing coords to CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // restore snapshot scaled to new size
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(
      snap,
      0,
      0,
      snap.width,
      snap.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    ctx.restore();

    applyPenStyle(ctx);
  }, [applyPenStyle]);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  // ---------------------------
  // Drawing logic
  // ---------------------------
  const stampEmojiAt = useCallback(
    (emoji, x, y) => {
      const ctx = getCtx();
      if (!ctx) return;

      ctx.save();
      ctx.shadowBlur = 0;
      ctx.font = "44px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, x, y);
      ctx.restore();
    },
    [getCtx],
  );

  const onPointerDown = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (!canvas || !ctx) return;

      canvas.setPointerCapture?.(e.pointerId);

      const { x, y } = getPos(e);

      // Emoji stamping
      if (activeEmoji) {
        stampEmojiAt(activeEmoji, x, y);
        setActiveEmoji(null);
        return;
      }

      // Limit strokes
      if (strokeCount >= MAX_STROKES) return;

      setStrokeCount((n) => n + 1);
      drawingRef.current = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [activeEmoji, getCtx, getPos, stampEmojiAt, strokeCount],
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!drawingRef.current) return;
      const ctx = getCtx();
      if (!ctx) return;

      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [getCtx, getPos],
  );

  const onPointerUp = useCallback(() => {
    drawingRef.current = false;
  }, []);

  // ---------------------------
  // Build card PNG
  // ---------------------------
  const buildFinalCardDataUrl = useCallback(() => {
    const drawCanvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;

    const W = 720;
    const H = 560;

    const out = document.createElement("canvas");
    out.width = W * dpr;
    out.height = H * dpr;

    const ctx = out.getContext("2d");
    if (!ctx) return "";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // background
    ctx.fillStyle = "#ffeaf3";
    ctx.fillRect(0, 0, W, H);

    // card
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    roundRect(ctx, 38, 38, W - 76, H - 76, 26);
    ctx.fill();

    // border
    ctx.strokeStyle = "rgba(255, 79, 134, 0.40)";
    ctx.lineWidth = 6;
    roundRect(ctx, 38, 38, W - 76, H - 76, 26);
    ctx.stroke();

    // message
    ctx.fillStyle = "rgba(25, 25, 25, 0.92)";
    ctx.font = "700 26px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    wrapText(ctx, note || "Happy Valentine’s Day! 💖", W / 2, 105, W - 140, 30);

    // label
    if (label.trim()) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.font = "700 16px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillText(label.trim(), W / 2, 155);
    }

    // drawing frame
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 3;
    roundRect(ctx, 110, 180, W - 220, 260, 18);
    ctx.stroke();

    // drawing content (note: your canvas is already DPI scaled; drawing it into CSS pixels is okay here)
    if (drawCanvas) ctx.drawImage(drawCanvas, 110, 180, W - 220, 260);

    // to/from
    ctx.fillStyle = "#ff4f86";
    ctx.font = "800 32px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(toName ? `For ${toName}` : "For my Valentine", W / 2, 485);

    ctx.fillStyle = "rgba(30,30,30,0.62)";
    ctx.font = "700 22px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(fromName ? `From ${fromName}` : "From ________", W / 2, 522);

    return out.toDataURL("image/png", 0.92);
  }, [fromName, label, note, toName]);

  // ---------------------------
  // Actions
  // ---------------------------
  const clearCanvas = useCallback(() => {
    setStrokeCount(0);
    setActiveEmoji(null);

    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    setPreviewUrl("");
    setShowPreview(false);
    setShareUrl("");
  }, [getCtx]);

  const makePreview = useCallback(() => {
    const url = buildFinalCardDataUrl();
    setPreviewUrl(url);
    setShowPreview(true);
  }, [buildFinalCardDataUrl]);

  const download = useCallback(() => {
    const url = previewUrl || buildFinalCardDataUrl();
    if (!url) return;

    const a = document.createElement("a");
    a.href = url;
    a.download = toName
      ? `valentine-for-${slug(toName)}.png`
      : "valentine-card.png";
    a.click();
  }, [buildFinalCardDataUrl, previewUrl, toName]);

  const share = useCallback(async () => {
    if (!canShare) {
      alert("Please fill in both To and From 💌");
      return;
    }

    // avoid re-uploading if we already have a shareUrl
    if (shareUrl) {
      setShowPreview(true);
      return;
    }

    try {
      setIsSaving(true);

      const dataUrl = previewUrl || buildFinalCardDataUrl();
      setPreviewUrl(dataUrl);
      setShowPreview(true);

      const blob = await (await fetch(dataUrl)).blob();
      const imageUrl = await uploadCardImage(blob, "valentine.png");

      const cardId = await saveCard({
        toName: toName.trim(),
        fromName: fromName.trim(),
        label: label.trim(),
        note,
        imageUrl,
        createdAt: Date.now(),
      });

      const url = `${window.location.origin}/?card=${cardId}`;
      setShareUrl(url);
    } catch (err) {
      console.error(err);
      alert(`Share failed: ${err?.message || err}`);
    } finally {
      setIsSaving(false);
    }
  }, [
    buildFinalCardDataUrl,
    canShare,
    fromName,
    label,
    note,
    previewUrl,
    shareUrl,
    toName,
  ]);

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      alert("Couldn’t copy. Please select and copy manually.");
    }
  }, [shareUrl]);

  // ---------------------------
  // Effects
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
      className="dcOverlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target.classList.contains("dcOverlay")) onClose?.();
      }}
    >
      <div className="dcModal">
        <header className="dcTop">
          <div className="dcTitle">Draw your Valentine card ✍️</div>
          <button className="dcClose" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <main className="dcBody">
          <section className="dcGrid">
            <label className="dcField">
              To
              <input
                className="dcInput"
                value={toName}
                onChange={(e) => {
                  setToName(e.target.value);
                  setShareUrl("");
                }}
                placeholder="Someone special"
              />
            </label>

            <label className="dcField">
              From
              <input
                className="dcInput"
                value={fromName}
                onChange={(e) => {
                  setFromName(e.target.value);
                  setShareUrl("");
                }}
                placeholder="Your name"
              />
            </label>

            <label className="dcField dcFieldWide">
              Message
              <input
                className="dcInput"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setShareUrl("");
                }}
                placeholder="Write something cute…"
              />
            </label>

            <label className="dcField dcFieldWide">
              Label (optional)
              <input
                className="dcInput"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  setShareUrl("");
                }}
                placeholder="ex: For Mom / For Friend"
              />
            </label>

            <label className="dcField">
              Brush
              <input
                type="range"
                min="2"
                max="20"
                value={brush}
                onChange={(e) => setBrush(Number(e.target.value))}
              />
            </label>

            <label className="dcField">
              Color
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
          </section>

          <section className="dcTools">
            <div className="dcToolsRow">
              <div className="dcToolsTitle">Emojis</div>
              <div className="dcToolsHint">
                {activeEmoji ? (
                  <>
                    Tap canvas to place{" "}
                    <span className="dcBig">{activeEmoji}</span>
                  </>
                ) : (
                  <>
                    Strokes left: <b>{strokesLeft}</b>
                  </>
                )}
              </div>
            </div>

            <div className="dcEmojiRow">
              {EMOJIS.map((emo) => (
                <button
                  key={emo}
                  type="button"
                  className={`dcEmoji ${activeEmoji === emo ? "isActive" : ""}`}
                  onClick={() => setActiveEmoji(emo)}
                >
                  {emo}
                </button>
              ))}
            </div>
          </section>

          <section className="dcCanvasWrap">
            <canvas
              ref={canvasRef}
              className="dcCanvas"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={onPointerUp}
            />
          </section>
        </main>

        <footer className="dcFooter">
          <button className="dcBtn" type="button" onClick={makePreview}>
            Preview
          </button>
          <button className="dcBtn" type="button" onClick={clearCanvas}>
            Clear
          </button>
          <button className="dcBtn" type="button" onClick={download}>
            Download
          </button>
          <button
            className="dcBtn dcBtnPrimary"
            type="button"
            onClick={share}
            disabled={isSaving || !canShare}
            title={
              !canShare ? "Add To and From to generate a share link 💌" : ""
            }
          >
            {isSaving ? "Saving..." : "Share 💌"}
          </button>
        </footer>

        {shareUrl && (
          <div className="dcShareBar">
            <div className="dcShareTitle">Your surprise link is ready 💌</div>
            <input
              className="dcShareInput"
              value={shareUrl}
              readOnly
              onFocus={(e) => e.target.select()}
            />
            <button
              className="dcBtn dcBtnPrimary"
              type="button"
              onClick={copyLink}
            >
              {copied ? "Copied! 💘" : "Copy link"}
            </button>
          </div>
        )}
      </div>

      {showPreview && previewUrl && (
        <div className="dcPreviewOverlay" role="dialog" aria-modal="true">
          <div className="dcPreviewModal">
            <div className="dcPreviewTop">
              <div className="dcPreviewTitle">Card Preview</div>
              <button
                className="dcClose"
                type="button"
                onClick={() => setShowPreview(false)}
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>

            <img className="dcPreviewImg" src={previewUrl} alt="Card preview" />

            <div className="dcPreviewActions">
              <button className="dcBtn" type="button" onClick={download}>
                Download
              </button>
              {shareUrl && (
                <>
                  <button
                    className="dcBtn dcBtnPrimary"
                    type="button"
                    onClick={copyLink}
                  >
                    {copied ? "Copied! 💘" : "Copy link"}
                  </button>

                  <a
                    className="dcLink"
                    href={`https://wa.me/?text=${encodeURIComponent(`I need to ask you something… 💌 Promise you’ll go all the way to the end: ${shareUrl}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>

                  <a
                    className="dcLink"
                    href={`sms:?&body=${encodeURIComponent(`I need to ask you something… 💌 ${shareUrl}`)}`}
                  >
                    Text
                  </a>

                  <a
                    className="dcLink"
                    href={`mailto:?subject=${encodeURIComponent("Can I ask you something? 💌")}&body=${encodeURIComponent(`I need to ask you something… 💌 Promise you’ll go all the way to the end: ${shareUrl}`)}`}
                  >
                    Email
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}
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

  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + " ";
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, yy);
      line = words[i] + " ";
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, yy);
}

function slug(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
