import { Routes, Route } from "react-router-dom";
import { useEffect, useRef, createContext } from "react";
import Intro from "./pages/Intro.jsx";
import Valentine from "./pages/Valentine";

// Create context so pages can control music
export const MusicContext = createContext();

export default function App() {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio("/music.mp3");
    audio.loop = true;
    audio.volume = 0.35;

    audioRef.current = audio;

    // Start music on first interaction (browser rule)
    const startMusic = () => {
      audio.play().catch(() => {});
      window.removeEventListener("click", startMusic);
      window.removeEventListener("keydown", startMusic);
    };

    window.addEventListener("click", startMusic);
    window.addEventListener("keydown", startMusic);

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  return (
    <MusicContext.Provider value={audioRef}>
      <Routes>
        <Route path="/" element={<Intro />} />
        <Route path="/valentine" element={<Valentine />} />
      </Routes>
    </MusicContext.Provider>
  );
}
