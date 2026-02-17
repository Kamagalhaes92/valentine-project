import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const IconLink = ({ href, label, children }) => (
  <a
    className="socialLink"
    href={href}
    target="_blank"
    rel="noreferrer"
    aria-label={label}
    title={label}
  >
    {children}
  </a>
);

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" className="socialIcon" aria-hidden="true">
    <path
      fill="currentColor"
      d="M12 2a10 10 0 100 20 10 10 0 000-20Zm7.93 9h-3.18a15.7 15.7 0 00-1.22-5.02A8.02 8.02 0 0119.93 11ZM12 4c.9 0 2.24 1.9 3.02 7H8.98C9.76 5.9 11.1 4 12 4ZM4.07 13h3.18c.22 1.82.74 3.6 1.22 5.02A8.02 8.02 0 014.07 13Zm3.18-2H4.07a8.02 8.02 0 014.4-5.02A15.7 15.7 0 007.25 11ZM12 20c-.9 0-2.24-1.9-3.02-7h6.04C14.24 18.1 12.9 20 12 20Zm3.53-1.98c.48-1.42 1-3.2 1.22-5.02h3.18a8.02 8.02 0 01-4.4 5.02Z"
    />
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="socialIcon" aria-hidden="true">
    <path
      fill="currentColor"
      d="M12 .5a11.5 11.5 0 00-3.64 22.4c.58.1.79-.25.79-.56v-2.1c-3.22.7-3.9-1.38-3.9-1.38-.53-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.72-1.55-2.57-.3-5.28-1.29-5.28-5.74 0-1.27.46-2.31 1.2-3.12-.12-.3-.52-1.5.12-3.13 0 0 .98-.31 3.2 1.2a11.1 11.1 0 015.82 0c2.22-1.51 3.2-1.2 3.2-1.2.64 1.63.24 2.83.12 3.13.75.81 1.2 1.85 1.2 3.12 0 4.46-2.71 5.44-5.3 5.73.42.37.79 1.08.79 2.18v3.23c0 .31.2.67.8.56A11.5 11.5 0 0012 .5Z"
    />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="socialIcon" aria-hidden="true">
    <path
      fill="currentColor"
      d="M4.98 3.5A2.5 2.5 0 105 8.5a2.5 2.5 0 00-.02-5ZM3 21h4V9H3v12Zm7 0h4v-6.5c0-1.7.3-3.3 2.4-3.3 2.06 0 2.06 1.93 2.06 3.41V21h4v-7.2c0-3.54-.76-6.26-4.9-6.26-1.99 0-3.31 1.09-3.86 2.12h-.05V9h-3.65v12Z"
    />
  </svg>
);

export default function HamburgerMenu() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // TODO: replace these with YOUR real links
  const LINKS = {
    website: "https://karine-magalhaes.dev/",
    github: "https://github.com/",
    linkedin: "https://www.linkedin.com/",
  };

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
              <div className="menuHeader">
                <div className="menuTitle">Little Menu 💌</div>

                <div className="socialRow">
                  <IconLink href={LINKS.website} label="Website">
                    <GlobeIcon />
                  </IconLink>
                  <IconLink href={LINKS.linkedin} label="LinkedIn">
                    <LinkedInIcon />
                  </IconLink>
                  <IconLink href={LINKS.github} label="GitHub">
                    <GitHubIcon />
                  </IconLink>
                </div>
              </div>

              <button
                className="menuItem"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setAboutOpen(true);
                }}
              >
                <span className="menuEmoji" aria-hidden="true">
                  ✨
                </span>
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
                <span className="menuEmoji" aria-hidden="true">
                  🚪
                </span>
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
                <span className="menuEmoji" aria-hidden="true">
                  💘
                </span>
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
              <div className="aboutTitle">About 💌</div>
              <button
                className="aboutClose"
                onClick={() => setAboutOpen(false)}
              >
                ✕
              </button>
            </div>

            <p className="aboutText">
              A tiny interactive Valentine experience — built with React, cute
              animations, and a secret question 💗
            </p>

            <div className="aboutSocialRow">
              <IconLink href={LINKS.website} label="Website">
                <GlobeIcon />
              </IconLink>
              <IconLink href={LINKS.linkedin} label="LinkedIn">
                <LinkedInIcon />
              </IconLink>
              <IconLink href={LINKS.github} label="GitHub">
                <GitHubIcon />
              </IconLink>
            </div>
          </div>
        </>
      )}
    </>
  );
}
