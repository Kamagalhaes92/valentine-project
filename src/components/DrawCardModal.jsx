import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/drawCard.css";
import { saveCard, uploadCardImage } from "../firebase";

const EMOJIS = ["💖", "😘", "🌹", "🦆", "✨"];
const MAX_STROKES = 5;

export default function DrawCardModal({ onClose }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  const [toName, setToName] = useState("");
  const [fromName, setFromName] = useState("");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState(
    "You are my heart, my life, my one and only thought. 💖",
  );

  const [activeEmoji, setActiveEmoji] = useState(null);
  const [strokeCount, setStrokeCount] = useState(0);
  const [brush, setBrush] = useState(10);
  const [color, setColor] = useState("#ff4f86");

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

    const snap = document.createElement("canvas");
    snap.width = canvas.width;
    snap.height = canvas.height;
    snap.getContext("2d")?.drawImage(canvas, 0, 0);

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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

      if (activeEmoji) {
        stampEmojiAt(activeEmoji, x, y);
        setActiveEmoji(null);
        return;
      }

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

  // ✅ NEW LOOK: modern “polaroid” card, no duplicated text inside the PNG
  const buildFinalCardDataUrl = useCallback(() => {
    const drawCanvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;

    const W = 900;
    const H = 1200;

    const out = document.createElement("canvas");
    out.width = W * dpr;
    out.height = H * dpr;

    const ctx = out.getContext("2d");
    if (!ctx) return "";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Soft gradient background
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#ffe8f2");
    g.addColorStop(1, "#e8f6ff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Card shell
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    roundRect(ctx, 70, 90, W - 140, H - 180, 44);
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = "rgba(255, 79, 134, 0.22)";
    ctx.lineWidth = 6;
    roundRect(ctx, 70, 90, W - 140, H - 180, 44);
    ctx.stroke();

    // Optional label as small pill (NOT required)
    const pill = label?.trim();
    if (pill) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 79, 134, 0.10)";
      roundRect(ctx, 240, 125, 420, 54, 999);
      ctx.fill();

      ctx.fillStyle = "rgba(25,25,25,0.78)";
      ctx.font = "800 24px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pill, W / 2, 162);
      ctx.restore();
    }

    // ✅ TO line
    ctx.fillStyle = "rgba(255, 79, 134, 0.95)";
    ctx.font = "900 44px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`To: ${toName.trim() || "________"}`, W / 2, 230);

    // Drawing “polaroid frame”
    const frameX = 140;
    const frameY = 290;
    const frameW = W - 280;
    const frameH = 690;

    ctx.fillStyle = "rgba(255,255,255,0.96)";
    roundRect(ctx, frameX, frameY, frameW, frameH, 36);
    ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 4;
    roundRect(ctx, frameX, frameY, frameW, frameH, 36);
    ctx.stroke();

    // subtle lines texture
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    for (let y = frameY + 36; y < frameY + frameH; y += 46) {
      ctx.beginPath();
      ctx.moveTo(frameX + 28, y);
      ctx.lineTo(frameX + frameW - 28, y);
      ctx.stroke();
    }
    ctx.restore();

    // user drawing inside frame
    if (drawCanvas) {
      ctx.drawImage(
        drawCanvas,
        frameX + 18,
        frameY + 18,
        frameW - 36,
        frameH - 36,
      );
    }

    // ✅ FROM line
    ctx.fillStyle = "rgba(20,20,20,0.70)";
    ctx.font = "900 38px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(`From: ${fromName.trim() || "________"}`, W / 2, 1045);

    // ✅ cute footer message (not the big note)
    ctx.fillStyle = "rgba(255, 79, 134, 0.85)";
    ctx.font = "800 28px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText("Happy Valentine’s Day 💗", W / 2, 1105);

    return out.toDataURL("image/png", 0.92);
  }, [toName, fromName, label]);

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

    // if already generated, just reopen preview
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

      // ✅ note is stored in Firestore (so it shows on Valentine page once),
      // but NOT drawn into the PNG anymore (no duplication)
      const cardId = await saveCard({
        toName: toName.trim(),
        fromName: fromName.trim(),
        label: label.trim(),
        note: note.trim(),
        imageUrl,
        createdAt: Date.now(),
      });

      // ✅ match your routing: /valentine?card=ID
      const url = `${window.location.origin}/valentine?card=${cardId}`;
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
          <div className="dcTitle">Create a card ✍️</div>
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
              Message (shows once on the final page)
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
              Title / Label (optional)
              <input
                className="dcInput"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  setShareUrl("");
                }}
                placeholder="ex: For my Valentine / For Mom"
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
              <div className="dcPreviewTitle">Preview</div>
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
              {!shareUrl ? (
                <button
                  className="dcBtn dcBtnPrimary"
                  type="button"
                  onClick={share}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Generate link 💌"}
                </button>
              ) : (
                <button
                  className="dcBtn dcBtnPrimary"
                  type="button"
                  onClick={copyLink}
                >
                  {copied ? "Copied! 💘" : "Copy link"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

function slug(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
