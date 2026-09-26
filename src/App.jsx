import { useEffect, useState } from "react";
import CraneLongTravelSim from "./CraneLongTravelSim";
import CraneSimultaneousSim from "./CraneSimultaneousSim";
import HelpPage from "./HelpPage";

const styles = {
  shell: {
    minHeight: "100vh",
    padding: "24px",
    background: "linear-gradient(160deg, #e2e8f0 0%, #f8fafc 60%, #dbeafe 100%)",
    fontFamily: "'Sarabun', sans-serif",
  },
  container: {
    maxWidth: "980px",
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 16px 35px rgba(15, 23, 42, 0.12)",
  },
  title: { margin: 0, fontSize: "32px", color: "#0f172a" },
  subtitle: { color: "#475569", marginTop: "8px", marginBottom: "20px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  cardBtn: {
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    background: "#f8fafc",
    padding: "16px",
    textAlign: "left",
    cursor: "pointer",
  },
  cardTitle: { margin: "0 0 6px", color: "#0f172a", fontSize: "18px", fontWeight: 800 },
  cardDesc: { margin: 0, color: "#475569", fontSize: "14px" },
  topBar: { marginBottom: "12px" },
  backBtn: {
    border: "none",
    borderRadius: "10px",
    padding: "10px 14px",
    background: "#0f172a",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
};

const VIEWS = {
  home: "home",
  app1: "app1",
  app2: "app2",
  help: "help",
};

const PATHS = {
  [VIEWS.home]: "/",
  [VIEWS.app1]: "/app-1",
  [VIEWS.app2]: "/app-2",
  [VIEWS.help]: "/help",
};

const BASE_URL = import.meta.env.BASE_URL || "/";

function trimTrailingSlash(value) {
  if (value === "/") return "/";
  return value.replace(/\/+$/, "");
}

function buildUrl(path) {
  const base = trimTrailingSlash(BASE_URL);
  return base === "/" ? path : `${base}${path}`;
}

function normalizePath(pathname) {
  const base = trimTrailingSlash(BASE_URL);
  let path = pathname;

  if (base !== "/" && path.startsWith(base)) {
    const sliced = path.slice(base.length);
    path = sliced.startsWith("/") ? sliced : `/${sliced}`;
  }

  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/+$/, "");
  return path || "/";
}

function getViewFromPath(pathname) {
  const normalized = normalizePath(pathname);
  if (normalized === PATHS.app1) return VIEWS.app1;
  if (normalized === PATHS.app2) return VIEWS.app2;
  if (normalized === PATHS.help) return VIEWS.help;
  return VIEWS.home;
}

export default function App() {
  const [view, setView] = useState(() => getViewFromPath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => {
      setView(getViewFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigateTo = (nextView) => {
    const targetPath = PATHS[nextView] || PATHS.home;
    const nextUrl = buildUrl(targetPath);
    if (window.location.pathname !== nextUrl) {
      window.history.pushState({}, "", nextUrl);
    }
    setView(nextView);
  };

  if (view === VIEWS.app1) {
    return (
      <div style={styles.shell}>
        <div style={styles.topBar}>
          <button type="button" style={styles.backBtn} onClick={() => navigateTo(VIEWS.home)}>
            ← Home
          </button>
        </div>
        <CraneLongTravelSim />
      </div>
    );
  }

  if (view === VIEWS.app2) {
    return (
      <div style={styles.shell}>
        <div style={styles.topBar}>
          <button type="button" style={styles.backBtn} onClick={() => navigateTo(VIEWS.home)}>
            ← Home
          </button>
        </div>
        <CraneSimultaneousSim />
      </div>
    );
  }

  if (view === VIEWS.help) {
    return (
      <div style={styles.shell}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ ...styles.topBar, marginBottom: 16 }}>
            <button type="button" style={styles.backBtn} onClick={() => navigateTo(VIEWS.home)}>
              ← Home
            </button>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 16px 35px rgba(15,23,42,0.12)" }}>
            <h1 style={{ ...styles.title, fontSize: 24, marginBottom: 4 }}>คู่มือการใช้งาน</h1>
            <p style={{ color: "#475569", fontSize: 14, marginBottom: 20 }}>Crane SQB BAR Weld Fatigue Simulation</p>
            <HelpPage />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      <div style={styles.container}>
        <h1 style={styles.title}>Crane Skew Simulation</h1>
        <p style={styles.subtitle}>25 Ton Overhead Crane — Weld Fatigue Analysis</p>

        <div style={styles.grid}>
          <button type="button" style={{ ...styles.cardBtn, gridColumn: "1 / -1" }} onClick={() => navigateTo(VIEWS.app1)}>
            <p style={styles.cardTitle}>▶▶ Long Travel &amp; ↔ Cross Travel Skew</p>
            <p style={styles.cardDesc}>
              Single-axis analysis — Switch between Long Travel (crane on runway) and Cross Travel (trolley inertia pushing both runway rails).
              Side thrust, torsion, lateral deflection, SQB BAR weld stress + fatigue life.
            </p>
          </button>

          <button type="button" style={{ ...styles.cardBtn, gridColumn: "1 / -1", borderColor: "#fdba74", background: "#fff7ed" }} onClick={() => navigateTo(VIEWS.app2)}>
            <p style={{ ...styles.cardTitle, color: "#c2410c" }}>⚡ Simultaneous Motion — LT × CT Combined Force</p>
            <p style={styles.cardDesc}>
              Both axes active at the same time — F_LT and F_CT act across the rail on the same line, so they add or cancel by direction (not a vector sum).
              Compares weld fatigue life: single-axis vs simultaneous operation. Shows the additional weld penalty (%).
            </p>
          </button>

          <button type="button" style={{ ...styles.cardBtn, gridColumn: "1 / -1", borderColor: "#bfdbfe", background: "#eff6ff" }} onClick={() => navigateTo(VIEWS.help)}>
            <p style={{ ...styles.cardTitle, color: "#1d4ed8", fontSize: 16 }}>? คู่มือการใช้งาน &amp; การคำนวณ</p>
            <p style={styles.cardDesc}>
              อธิบายวิธีใช้โปรแกรม · สูตรการคำนวณทุกขั้นตอน · ตัวแปร Input · ข้อจำกัด · คำศัพท์
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
