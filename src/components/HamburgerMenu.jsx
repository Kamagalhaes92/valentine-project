import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function HamburgerMenu() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setAboutOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="menu">
        <button
          className={`menuBtn ${menuOpen ? "isOpen" : ""}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        {menuOpen && (
          <>
            <button
              className="menuBackdrop"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />

            <div className="menuPanel" role="menu" aria-label="Site menu">
              <div className="menuTitle">Menu</div>

              <button
                className="menuItem"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setAboutOpen(true);
                }}
              >
                About
              </button>

              <button
                className="menuItem"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/");
                }}
              >
                Page 1 — Intro
              </button>

              <button
                className="menuItem"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/valentine");
                }}
              >
                Page 2 — Card
              </button>
            </div>
          </>
        )}
      </div>

      {aboutOpen && (
        <>
          <button
            className="menuBackdrop"
            aria-label="Close about"
            onClick={() => setAboutOpen(false)}
          />
          <div className="aboutModal" role="dialog" aria-modal="true">
            <div className="aboutHeader">
              <div className="aboutTitle">About</div>
              <button
                className="aboutClose"
                onClick={() => setAboutOpen(false)}
              >
                ✕
              </button>
            </div>

            <p className="aboutText">
              A tiny interactive Valentine experience — built with React, cute
              animations, and a secret question 💌
            </p>

            <div className="aboutActions">
              <button className="aboutBtn" onClick={() => setAboutOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
