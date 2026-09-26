import React, { useState, useMemo } from "react";

// ── Constants (same physical values as CraneLongTravelSim) ─────────────────
const RAIL_H        = 65;     // mm — SQB 65×65 (ตรงกับ CraneLongTravelSim)
const WELD_ALLOW    = { E6013: 126, E7016: 144 }; // MPa
const CRANE_MASS    = 20.8;   // ton
const TROLLEY_MASS  = 2.2;    // ton
const G_MS2         = 9.81;
const SQRT2         = Math.SQRT2;
// แสดงแรงทั้ง ton และ kN ให้สอดคล้องกับโปรแกรมแรก
const toKN = t => t * G_MS2;


// ── Physics helpers ────────────────────────────────────────────────────────
function calcAccelDetails(mode, level, hasVFD, vfdRamp) {
  if (level === 0) return { speed_mpm: 0, speed_ms: 0, ramp: 0, accelMs2: 0, accelG: 0, hasVFD, level };
  const speed_mpm = mode === "lt" ? (level === 1 ? 4 : 50) : (level === 1 ? 5 : 20);
  const speed_ms  = speed_mpm / 60;
  const tNoVFD    = mode === "lt" ? (level === 1 ? 1.5 : 1.0) : (level === 1 ? 1.0 : 0.8);
  const ramp      = hasVFD ? vfdRamp : tNoVFD;
  const accelMs2  = speed_ms / ramp;
  const accelG    = accelMs2 / G_MS2;
  return { speed_mpm, speed_ms, ramp, accelMs2, accelG, hasVFD, level };
}


function calcThrustDetails(mode, load, trolleyPos, accelG, syncDrive, isMoving = false, skewFactor = 0) {
  const span = 23.6;
  let massLeft, massRight;
  if (mode === "lt") {
    const total = load + TROLLEY_MASS;
    massLeft  = CRANE_MASS / 2 + total * (span - trolleyPos) / span;
    massRight = CRANE_MASS / 2 + total * trolleyPos / span;
  } else {
    const half = (load + TROLLEY_MASS) / 2;
    massLeft = massRight = half;
  }
  const inertiaDiff   = (mode === "lt" && !syncDrive) ? Math.abs(massLeft - massRight) * accelG : 0;
  const inertiaThrust = inertiaDiff * 1.5;
  const wheelFriction = (accelG > 0 && mode === "lt") ? Math.max(massLeft, massRight) / 2 * 0.05 : 0;
  // Cross Travel: แรงเฉื่อย trolley + ของยก (m × a) ผ่าน end truck ลงรางวิ่ง 2 ข้างทิศเดียวกัน
  // แบ่งตามสัดส่วนน้ำหนักล้อ end truck (ตรงกับ CraneLongTravelSim) — trolley กลางสะพาน = 50/50
  const total   = load + TROLLEY_MASS;
  const wheelL  = CRANE_MASS / 2 + total * (span - trolleyPos) / span;
  const wheelR  = CRANE_MASS / 2 + total * trolleyPos / span;
  const shareL  = wheelL / (wheelL + wheelR);
  const ctOn    = accelG > 0 && mode === "ct";
  const ctL     = ctOn ? total * accelG * shareL : 0;
  const ctR     = ctOn ? total * accelG * (1 - shareL) : 0;
  const ctExtra = Math.max(ctL, ctR);                                   // รางที่รับมากกว่า
  // Geometric skew — present whenever crane is moving, not only during acceleration
  const skewThrust    = (mode === "lt" && isMoving) ? skewFactor * (CRANE_MASS + load + TROLLEY_MASS) : 0;
  let thrust = inertiaThrust;
  if (accelG > 0) {
    thrust += wheelFriction;
    if (mode === "ct") thrust += ctExtra;
  }
  thrust += skewThrust;
  return { span, massLeft, massRight, inertiaDiff, inertiaThrust, wheelFriction, ctExtra, ctL, ctR, shareL, wheelL, wheelR, skewThrust, skewFactor, thrust, syncDrive, accelG, isMoving };
}


// ราง BITE — กฎเดียวกับ CraneLongTravelSim (กำลังเร่ง): skewSign = ทิศเดิน × (m_R ≥ m_L หรือ Sync ? +1 : −1)
// skewSign > 0 → ล้อหน้าราง L BITE
function isBiteL(trolleyPos, sync, ltDir) {
  const massAsym = (sync || trolleyPos >= 23.6 / 2) ? 1 : -1;
  return (ltDir === "fwd" ? 1 : -1) * massAsym > 0;
}

// แรงขวางรางสุทธิต่อราง (ton) · ทิศ + = ไปทางราง R
// F_LT ดันราง BITE เข้าใน · trolley เร่งไปราง X → แรงปฏิกิริยาดันรางทั้งสองไปทางตรงข้าม X
// ctL / ctR = F_CT ที่ราง L / R (แบ่งตามน้ำหนักล้อ)
function railForces(fLT, ctL, ctR, biteL, ctDir) {
  const biteSign = biteL ? 1 : -1;
  const ctSign   = ctDir === "toL" ? 1 : -1;
  const fctBite  = biteL ? ctL : ctR;
  const fctOther = biteL ? ctR : ctL;
  const biteNet  = biteSign * fLT + ctSign * fctBite;
  const otherNet = ctSign * fctOther;
  return { biteSign, ctSign, fctBite, fctOther, biteNet, otherNet, same: biteSign === ctSign,
           comb: Math.max(Math.abs(biteNet), Math.abs(otherNet)) };
}

function calcWeld(thrust, weldSize, electrode, pattern, weldOn, weldGap) {
  if (thrust <= 0) return { tau: 0, util: 0, fatUtil: 0, F_N: 0, F_res: 0, F_eff: 0, a: 0, ratio: 0, A: 0, tFat: 0, L_weld: 0, gapFactor: 1 };
  const F_N   = thrust * G_MS2 * 1000;
  const F_res = F_N * SQRT2;
  const a     = 0.707 * weldSize;
  const ratio = pattern === "continuous" ? 1.0 : weldOn / (weldOn + weldGap);
  const L_weld = pattern === "continuous" ? RAIL_H : weldOn;
  const A      = 2 * L_weld * a;
  // Gap prying: bar spans gap as fixed-end beam → moment at weld root → additional tension
  // F_prying = F × weldGap / (8 × RAIL_H)  →  F_eff = F_res × √(1 + (gap/8h)²)
  const gapFactor = pattern === "continuous" ? 1.0 : Math.sqrt(1 + Math.pow(weldGap / (8 * RAIL_H), 2));
  const F_eff  = F_res * gapFactor;
  const tau    = F_eff / A;
  const tFat   = pattern === "continuous" ? 55 : 18;
  return { tau, util: tau / WELD_ALLOW[electrode] * 100, fatUtil: tau / tFat * 100, F_N, F_res, F_eff, a, ratio, A, tFat, L_weld, gapFactor };
}

function calcLifeDetails(tau, pattern, cyclesPerYear) {
  if (tau <= 0) return { tFat: 0, C: 0, N_life: Infinity, years: Infinity };
  const tFat  = pattern === "continuous" ? 55 : 18;
  const C     = 2e6 * Math.pow(tFat, 3);
  const N_life = C / Math.pow(tau, 3);
  return { tFat, C, N_life, years: N_life / cyclesPerYear };
}

function calcLife(tau, pattern, cyclesPerYear) {
  return calcLifeDetails(tau, pattern, cyclesPerYear).years;
}

// ── Calculation detail panel ───────────────────────────────────────────────
function CalcDetailPanel({ scenario, steps, load, trolleyPos, weldSize, electrode, weldPattern, weldOn, weldGap, cyclesPerYear }) {
  if (!steps) return null;
  const n = (v, d = 3) => (typeof v === "number" && isFinite(v) ? v.toFixed(d) : "—");

  const Section = ({ title, color }) => (
    <div style={{ fontSize: 11, fontWeight: 800, color: "white", backgroundColor: color, padding: "3px 10px", borderRadius: 5, marginTop: 10, marginBottom: 4 }}>
      {title}
    </div>
  );

  const Row = ({ label, formula, result, unit }) => (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(80px, 1.1fr) minmax(0, 1.4fr) auto", gap: 6, padding: "3px 2px", borderBottom: "1px solid #f0f0f0", alignItems: "baseline" }}>
      <span style={{ fontSize: 11, color: "#78909c", overflowWrap: "anywhere" }}>{label}</span>
      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#546e7a", overflowWrap: "anywhere" }}>{formula}</span>
      <span style={{ fontSize: 12, fontWeight: "bold", color: "#37474f", textAlign: "right", whiteSpace: "nowrap" }}>
        {result}{unit ? <span style={{ fontSize: 10, color: "#90a4ae", fontWeight: "normal", marginLeft: 3 }}>{unit}</span> : null}
      </span>
    </div>
  );

  const AccelSection = ({ accel, stepNum }) => (
    <>
      <Section title={`${stepNum} ความเร็ว & ความเร่ง`} color="#546e7a" />
      <Row label="ความเร็ว (Speed)"
        formula={`Speed ${accel.level} = ${n(accel.speed_mpm, 0)} m/min ÷ 60`}
        result={n(accel.speed_ms, 4)} unit="m/s" />
      <Row label="Ramp time"
        formula={accel.hasVFD ? `VFD (ตั้งค่า)` : `มาตรฐาน (ไม่มี VFD)`}
        result={n(accel.ramp, 1)} unit="s" />
      <Row label="ความเร่ง  a = v / t"
        formula={`${n(accel.speed_ms, 4)} ÷ ${n(accel.ramp, 1)}`}
        result={n(accel.accelMs2, 4)} unit="m/s²" />
      <Row label="ความเร่ง (g-unit)"
        formula={`${n(accel.accelMs2, 4)} ÷ 9.81`}
        result={n(accel.accelG, 5)} unit="g" />
    </>
  );

  const WeldSection = ({ weld, stepNum }) => (
    <>
      <Section title={`${stepNum} ความเค้นแนวเชื่อม SQB BAR`} color="#e65100" />
      <Row label="แรงกด (F_N)"
        formula={`F_thrust (ton) × 9810`}
        result={n(weld.F_N, 0)} unit="N" />
      <Row label="แรงลัพธ์ (F_res = F_N×√2)"
        formula={`${n(weld.F_N, 0)} × 1.4142`}
        result={n(weld.F_res, 0)} unit="N" />
      <Row label="ขนาดคอเชื่อม  a = 0.707 × s"
        formula={`0.707 × ${weldSize} mm`}
        result={n(weld.a, 2)} unit="mm" />
      <Row label={weldPattern === "continuous" ? "สัดส่วน (ข้อมูล)" : "สัดส่วน  weld/(weld+gap)  (ข้อมูล)"}
        formula={weldPattern === "continuous" ? "Continuous → ratio = 1.0" : `${weldOn} / (${weldOn}+${weldGap})`}
        result={n(weld.ratio * 100, 1)} unit="%" />
      <Row label={weldPattern === "continuous" ? "L_eff = RAIL_H (กระจายตามความสูง)" : "L_eff = weld block (แรงกระจุก)"}
        formula={weldPattern === "continuous" ? `Continuous → L = ${RAIL_H} mm` : `Intermittent → L = weldOn = ${weld.L_weld} mm`}
        result={n(weld.L_weld, 0)} unit="mm" />
      <Row label="พื้นที่เชื่อม  A = 2 × L_eff × a"
        formula={`2 × ${n(weld.L_weld, 0)} × ${n(weld.a, 2)}`}
        result={n(weld.A, 2)} unit="mm²" />
      {weldPattern !== "continuous" && (
        <Row label="Gap prying factor  √(1+(gap/8h)²)"
          formula={`√(1 + (${weldGap}/(8×${RAIL_H}))²)`}
          result={n(weld.gapFactor, 3)} unit="" />
      )}
      <Row label={weldPattern === "continuous" ? "τ = F_res / A" : "τ = F_res × factor / A"}
        formula={weldPattern === "continuous"
          ? `${n(weld.F_res, 0)} ÷ ${n(weld.A, 2)}`
          : `${n(weld.F_res, 0)} × ${n(weld.gapFactor, 3)} ÷ ${n(weld.A, 2)}`}
        result={n(weld.tau, 2)} unit="MPa" />
      <Row label={`Static util  τ / τ_allow (${electrode})`}
        formula={`${n(weld.tau, 2)} ÷ ${WELD_ALLOW[electrode]} MPa`}
        result={n(weld.util, 1)} unit="%" />
      <Row label={`Fatigue util  τ / τ_fat (${weldPattern === "continuous" ? "Cat.D" : "Cat.E"})`}
        formula={`${n(weld.tau, 2)} ÷ ${weld.tFat} MPa`}
        result={n(weld.fatUtil, 1)} unit="%" />
    </>
  );

  const LifeSection = ({ life, tau, stepNum }) => (
    <>
      <Section title={`${stepNum} อายุความล้า — S-N (Paris Law)`} color="#388e3c" />
      <Row label={`τ_fat (${weldPattern === "continuous" ? "Cat.D" : "Cat.E"})`}
        formula={weldPattern === "continuous" ? "Continuous weld" : "Intermittent weld"}
        result={life.tFat.toFixed(0)} unit="MPa" />
      <Row label="C constant  = 2×10⁶ × τ_fat³"
        formula={`2×10⁶ × ${life.tFat}³`}
        result={life.C.toExponential(3)} unit="" />
      <Row label="จำนวนรอบ  N = C / τ³"
        formula={`${life.C.toExponential(3)} ÷ ${n(tau, 2)}³`}
        result={life.N_life >= 1e12 ? ">10¹²" : life.N_life.toExponential(3)} unit="cycles" />
      <Row label="อายุ = N ÷ cycles/year"
        formula={`÷ ${cyclesPerYear.toLocaleString()} cycles/yr`}
        result={life.years >= 999 ? ">999" : n(life.years, 1)} unit="ปี" />
    </>
  );

  const borderColor = scenario === "lt" ? "#90caf9" : scenario === "ct" ? "#ce93d8" : "#ffcc80";
  const titleColor  = scenario === "lt" ? "#0277bd" : scenario === "ct" ? "#6a1b9a" : "#e65100";
  const title       = scenario === "lt" ? "Long Travel (F_LT)" : scenario === "ct" ? "Cross Travel (F_CT)" : "Combined — Worst Case";

  return (
    <div style={{ padding: "12px 14px", backgroundColor: "#fafafa", borderRadius: 10, border: `2px solid ${borderColor}`, marginTop: 2, marginBottom: 4 }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: titleColor, marginBottom: 2 }}>📐 การคำนวณ — {title}</div>

      {scenario === "lt" && (() => {
        const { accel, thrust, weld, life } = steps;
        const totalMass = load + TROLLEY_MASS;
        return (
          <>
            <AccelSection accel={accel} stepNum="①" />
            <Section title="② การกระจายน้ำหนัก (Mass Distribution)" color="#0277bd" />
            <Row label="น้ำหนักรวม (total)"
              formula={`load + trolley = ${load} + ${TROLLEY_MASS}`}
              result={n(totalMass, 1)} unit="ton" />
            <Row label="Mass ล้อซ้าย (m_L)"
              formula={`CRANE/2 + total×(23.6−${n(trolleyPos,1)})/23.6`}
              result={n(thrust.massLeft, 3)} unit="ton" />
            <Row label="Mass ล้อขวา (m_R)"
              formula={`CRANE/2 + total×${n(trolleyPos,1)}/23.6`}
              result={n(thrust.massRight, 3)} unit="ton" />
            <Section title="③ แรงเฉื่อย & เสียดทาน (Lateral Thrust)" color="#0277bd" />
            {!thrust.syncDrive ? (
              <>
                <Row label="|Δm| = |m_L − m_R|"
                  formula={`|${n(thrust.massLeft,3)} − ${n(thrust.massRight,3)}|`}
                  result={n(Math.abs(thrust.massLeft - thrust.massRight), 3)} unit="ton" />
                <Row label="ΔF_inertia = |Δm| × a_g"
                  formula={`${n(Math.abs(thrust.massLeft - thrust.massRight), 3)} × ${n(accel.accelG, 5)}`}
                  result={n(thrust.inertiaDiff, 4)} unit="ton" />
                <Row label="F_inertia × 1.5 (safety)"
                  formula={`${n(thrust.inertiaDiff, 4)} × 1.5`}
                  result={n(thrust.inertiaThrust, 4)} unit="ton" />
              </>
            ) : (
              <Row label="Sync Drive" formula="มี Sync Drive → ΔF_inertia = 0" result="0.000" unit="ton" />
            )}
            <Row label="F_friction = max(m)/2 × 0.05"
              formula={`${n(Math.max(thrust.massLeft, thrust.massRight),3)} / 2 × 0.05`}
              result={n(thrust.wheelFriction, 4)} unit="ton" />
            <Row label="F_skew = α × (M_crane+load+trolley)"
              formula={thrust.isMoving
                ? `${n(thrust.skewFactor,2)} × (${CRANE_MASS}+${load}+${TROLLEY_MASS})`
                : "ไม่มีการเคลื่อนที่ → 0"}
              result={n(thrust.skewThrust, 4)} unit="ton" />
            <Row label="F_LT รวม"
              formula={`inertia + friction + skew`}
              result={n(thrust.thrust, 4)} unit="ton" />
            <Row label="= kN" formula={`${n(thrust.thrust, 4)} × 9.81`} result={n(toKN(thrust.thrust), 3)} unit="kN" />
            <WeldSection weld={weld} stepNum="④" />
            <LifeSection life={life} tau={weld.tau} stepNum="⑤" />
          </>
        );
      })()}

      {scenario === "ct" && (() => {
        const { accel, thrust, weld, life } = steps;
        return (
          <>
            <AccelSection accel={accel} stepNum="①" />
            <Section title="② การกระจายน้ำหนัก (Cross Travel)" color="#6a1b9a" />
            <Row label="Mass แต่ละด้าน (half)"
              formula={`(load + trolley) / 2 = (${load} + ${TROLLEY_MASS}) / 2`}
              result={n(thrust.massLeft, 3)} unit="ton" />
            <Section title="③ แรงกระทำต่อรางวิ่ง — Cross Travel" color="#6a1b9a" />
            <Row label="สัดส่วนน้ำหนักล้อ L / R"
              formula={`${n(thrust.wheelL, 2)} / ${n(thrust.wheelR, 2)} ton`}
              result={`${n(thrust.shareL * 100, 0)} / ${n((1 - thrust.shareL) * 100, 0)}`} unit="%" />
            <Row label="F_L = m × a_g × สัดส่วน L"
              formula={`${n(load + TROLLEY_MASS, 1)} × ${n(accel.accelG, 5)} × ${n(thrust.shareL, 3)}`}
              result={n(thrust.ctL, 4)} unit="ton" />
            <Row label="F_R = m × a_g × สัดส่วน R"
              formula={`${n(load + TROLLEY_MASS, 1)} × ${n(accel.accelG, 5)} × ${n(1 - thrust.shareL, 3)}`}
              result={n(thrust.ctR, 4)} unit="ton" />
            <Row label="F_CT = รางที่รับมาก"
              formula={`max(${n(thrust.ctL, 4)}, ${n(thrust.ctR, 4)})`}
              result={n(thrust.thrust, 4)} unit="ton" />
            <Row label="= kN" formula={`${n(thrust.thrust, 4)} × 9.81`} result={n(toKN(thrust.thrust), 3)} unit="kN" />
            <Row label="เทียบ: มาตรฐาน 20% ÷ 2" formula="ASCE 7 / AISC DG7" result={n(0.2 * (load + TROLLEY_MASS) / 2, 3)} unit="ton" />
            <WeldSection weld={weld} stepNum="④" />
            <LifeSection life={life} tau={weld.tau} stepNum="⑤" />
          </>
        );
      })()}

      {scenario === "comb" && (() => {
        const { thrustLT, thrustCT, thrustComb, rf, weld, life } = steps;
        return (
          <>
            <Section title={`① แรงรวม — ขวางรางแนวเดียวกัน (F_CT ${rf.same ? "ทิศเดียวกับ F_LT → บวก" : "สวนทาง F_LT → หักล้าง"})`} color="#e65100" />
            <Row label="F_LT (จาก Long Travel)" formula="(ดูแถว LT เดียว)" result={n(thrustLT, 4)} unit="ton" />
            <Row label="F_CT ที่ราง BITE" formula={`(รางที่รับมาก ${n(thrustCT, 4)})`} result={n(rf.fctBite, 4)} unit="ton" />
            <Row label={rf.same ? "ราง BITE = F_LT + F_CT" : "ราง BITE = |F_LT − F_CT|"}
              formula={rf.same ? `${n(thrustLT,4)} + ${n(rf.fctBite,4)}` : `|${n(thrustLT,4)} − ${n(rf.fctBite,4)}|`}
              result={n(Math.abs(rf.biteNet), 4)} unit="ton" />
            <Row label="อีกราง = F_CT ของรางนั้น" formula="" result={n(Math.abs(rf.otherNet), 4)} unit="ton" />
            <Row label="F_comb = ค่ามากของ 2 ราง"
              formula={`max(${n(Math.abs(rf.biteNet),4)}, ${n(Math.abs(rf.otherNet),4)})`}
              result={n(thrustComb, 4)} unit="ton" />
            <Row label="= kN" formula={`${n(thrustComb, 4)} × 9.81`} result={n(toKN(thrustComb), 3)} unit="kN" />
            <WeldSection weld={weld} stepNum="②" />
            <LifeSection life={life} tau={weld.tau} stepNum="③" />
          </>
        );
      })()}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const S = {
  container: {
    fontFamily: "'Sarabun', sans-serif",
    padding: "10px 16px",
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "#eceff1",
    height: "100vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    textAlign: "center",
    color: "#37474f",
    marginBottom: "8px",
    fontSize: "17px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "1px",
    flexShrink: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "270px 300px 1fr",
    gap: "10px",
    flex: 1,
    overflow: "hidden",
    minHeight: 0,
  },
  panel: {
    backgroundColor: "white",
    padding: "12px",
    borderRadius: "14px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    overflowY: "auto",
    height: "100%",
    boxSizing: "border-box",
  },
  rightPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    overflowY: "auto",
    height: "100%",
    boxSizing: "border-box",
  },
  card: {
    backgroundColor: "white",
    padding: "12px",
    borderRadius: "14px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
  },
  label: {
    display: "flex",
    justifyContent: "space-between",
    fontWeight: "700",
    color: "#546e7a",
    fontSize: "13px",
    marginBottom: "4px",
  },
  slider: { width: "100%", accentColor: "#00838f", height: "6px", cursor: "pointer" },
  sectionTitle: {
    fontWeight: "800",
    fontSize: "12px",
    color: "white",
    padding: "4px 10px",
    borderRadius: "6px",
    marginBottom: "6px",
    letterSpacing: "0.5px",
  },
};

// ── Result row helper ──────────────────────────────────────────────────────
function ResultRow({ label, thrust, tau, util, fatUtil, life, color, onClick, isOpen }) {
  const lifeStr = life >= 999 ? ">999" : life < 0.1 ? "<0.1" : life.toFixed(1);
  const bg = fatUtil > 100
    ? (life < 5 ? "#ffebee" : life < 20 ? "#fff3e0" : "#fff8e1")
    : "#e8f5e9";
  const textCol = fatUtil > 100
    ? (life < 5 ? "#c62828" : life < 20 ? "#e65100" : "#f57f17")
    : "#2e7d32";
  return (
    <div onClick={onClick} style={{
      display: "grid", gridTemplateColumns: "110px 70px 70px 70px 80px 1fr auto",
      gap: 6, alignItems: "center", padding: "6px 8px", borderRadius: 8,
      backgroundColor: bg, marginBottom: 2,
      cursor: "pointer", border: isOpen ? "1.5px solid #90a4ae" : "1.5px solid transparent",
    }}>
      <span style={{ fontSize: 12, fontWeight: "bold", color }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: "900", color: "#c62828", lineHeight: 1.2 }}>
        {thrust.toFixed(2)}<span style={{ fontSize: 10, color: "#90a4ae" }}> T</span>
        <div style={{ fontSize: 10, fontWeight: "bold", color: "#e53935" }}>{toKN(thrust).toFixed(2)} kN</div>
      </span>
      <span style={{ fontSize: 13, fontWeight: "800", color: "#37474f" }}>{tau.toFixed(1)}<span style={{ fontSize: 10, color: "#90a4ae" }}> MPa</span></span>
      <span style={{ fontSize: 13, fontWeight: "800", color: util > 100 ? "#c62828" : util > 80 ? "#fb8c00" : "#43a047" }}>{util.toFixed(0)}%</span>
      <span style={{ fontSize: 13, fontWeight: "800", color: textCol }}>{fatUtil.toFixed(0)}%</span>
      <span style={{ fontSize: 15, fontWeight: "900", color: textCol }}>{lifeStr}<span style={{ fontSize: 10, fontWeight: "normal", marginLeft: 3 }}>ปี</span></span>
      <span style={{ fontSize: 11, color: "#90a4ae" }}>{isOpen ? "▲" : "▼"}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function CraneSimultaneousSim() {
  // Shared inputs
  // ค่าเริ่มต้นตรงกับ CraneLongTravelSim (ข้อมูลหน้างาน) เพื่อเทียบผลกันได้ทันที
  const [load,         setLoad]         = useState(16);
  const [trolleyPos,   setTrolleyPos]   = useState(11.8);
  const [hasTieBack,   setHasTieBack]   = useState(false);
  const [electrode,    setElectrode]    = useState("E7016");
  const [weldSize,     setWeldSize]     = useState(6);
  const [weldPattern,  setWeldPattern]  = useState("continuous");
  const [weldOn,       setWeldOn]       = useState(50);
  const [weldGap,      setWeldGap]      = useState(500);
  const [cyclesPerYear, setCyclesPerYear] = useState(21000);

  // Long Travel inputs
  const [ltVFD,       setLtVFD]       = useState(true);
  const [ltRamp,      setLtRamp]      = useState(3);
  const [ltSync,      setLtSync]      = useState(false);
  const [ltLevel,     setLtLevel]     = useState(2); // 0=idle, 1=spd1, 2=spd2
  const [ltDir,       setLtDir]       = useState("fwd"); // "fwd" | "bwd"
  const [skewFactor,  setSkewFactor]  = useState(0.01); // geometric skew α

  // Cross Travel inputs
  const [ctVFD,     setCtVFD]     = useState(true);
  const [ctRamp,    setCtRamp]    = useState(3);
  const [ctLevel,   setCtLevel]   = useState(1);
  const [ctDir,     setCtDir]     = useState("toL");   // trolley เร่งไปทาง "toL" | "toR"

  // Results

  // Detail steps for expandable calc panels
  const [openDetail, setOpenDetail] = useState(null); // "lt" | "ct" | "comb" | null

  // Toggle helpers — click to activate, click same level again to stop
  const toggleLT = (lvl) => setLtLevel(v => v === lvl ? 0 : lvl);
  const toggleCT = (lvl) => setCtLevel(v => v === lvl ? 0 : lvl);

  // Physics — derive ตรงจาก input (useMemo) ไม่ต้องเก็บเป็น state
  const { fLT, fCT, fComb, wLT, wCT, wComb, stepsLT, stepsCT, stepsComb } = useMemo(() => {
    const ltAccelD   = calcAccelDetails("lt", Math.min(ltLevel, 2), ltVFD, ltRamp);
    const ctAccelD   = calcAccelDetails("ct", Math.min(ctLevel, 2), ctVFD, ctRamp);
    // Sync ใช้ได้เฉพาะมี VFD (ปุ่มซ่อนเมื่อปิด VFD) — ตรงกับ CraneLongTravelSim
    const ltThrustD  = calcThrustDetails("lt", load, trolleyPos, ltAccelD.accelG, ltSync && ltVFD, ltLevel > 0, skewFactor);
    const ctThrustD  = calcThrustDetails("ct", load, trolleyPos, ctAccelD.accelG, false, ctLevel > 0, 0);
    // F_LT (เบียดราง) และ F_CT (แรงเฉื่อย trolley) ขวางรางแนวเดียวกัน → รวมแบบมีทิศ (ไม่ใช่ผลรวมเวกเตอร์)
    // ทิศเดียวกัน = บวก · สวนทาง = หักล้าง · ใช้รางที่แรงสุทธิมากกว่า
    const rf         = railForces(ltThrustD.thrust, ctThrustD.ctL, ctThrustD.ctR, isBiteL(trolleyPos, ltSync && ltVFD, ltDir), ctDir);
    const thrust_cb  = rf.comb;
    const wLT_d      = calcWeld(ltThrustD.thrust, weldSize, electrode, weldPattern, weldOn, weldGap);
    const wCT_d      = calcWeld(ctThrustD.thrust, weldSize, electrode, weldPattern, weldOn, weldGap);
    const wComb_d    = calcWeld(thrust_cb,         weldSize, electrode, weldPattern, weldOn, weldGap);
    const ltLifeD    = calcLifeDetails(wLT_d.tau,   weldPattern, cyclesPerYear);
    const ctLifeD    = calcLifeDetails(wCT_d.tau,   weldPattern, cyclesPerYear);
    const combLifeD  = calcLifeDetails(wComb_d.tau, weldPattern, cyclesPerYear);

    return {
      fLT: ltThrustD.thrust, fCT: ctThrustD.thrust, fComb: thrust_cb,
      wLT: wLT_d, wCT: wCT_d, wComb: wComb_d,
      stepsLT:   { accel: ltAccelD, thrust: ltThrustD, weld: wLT_d,  life: ltLifeD },
      stepsCT:   { accel: ctAccelD, thrust: ctThrustD, weld: wCT_d,  life: ctLifeD },
      stepsComb: { thrustLT: ltThrustD.thrust, thrustCT: ctThrustD.thrust, thrustComb: thrust_cb, rf, weld: wComb_d, life: combLifeD },
    };
  }, [load, trolleyPos, electrode, weldSize, weldPattern, weldOn, weldGap,
      ltVFD, ltRamp, ltSync, ltLevel, ltDir, skewFactor,
      ctVFD, ctRamp, ctLevel, ctDir, cyclesPerYear]);

  const lifeLT   = calcLife(wLT.tau,   weldPattern, cyclesPerYear);
  const lifeCT   = calcLife(wCT.tau,   weldPattern, cyclesPerYear);
  const lifeComb = calcLife(wComb.tau, weldPattern, cyclesPerYear);

  const ltActive = ltLevel > 0;
  const ctActive = ctLevel > 0;
  const bothActive = ltActive && ctActive;
  const biteL = isBiteL(trolleyPos, ltSync && ltVFD, ltDir);
  const rfNow = stepsComb.rf;

  const btnBase = { padding: "10px 6px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: "bold", color: "white", flex: 1, userSelect: "none", touchAction: "manipulation" };

  return (
    <div style={S.container}>
      <h2 style={S.header}>
        Simultaneous Motion — Long Travel × Cross Travel · Combined Force on SQB BAR Weld
      </h2>

      <div style={S.grid}>

        {/* ═══ COL 1 — Shared inputs ═══ */}
        <div style={S.panel}>

          {/* Load */}
          <div>
            <div style={S.label}><span>Load</span><span>{load} Ton</span></div>
            <input type="range" min="0" max="30" value={load}
              onChange={e => setLoad(Number(e.target.value))} style={S.slider} />
          </div>

          {/* Trolley Position */}
          <div>
            <div style={S.label}><span>Trolley Position</span><span>{trolleyPos.toFixed(1)} m</span></div>
            <input type="range" min="1" max="22.6" step="0.5" value={trolleyPos}
              onChange={e => setTrolleyPos(Number(e.target.value))} style={S.slider} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#b0bec5" }}>
              <span>Left heavier</span><span>Right heavier</span>
            </div>
          </div>

          {/* Tie Back */}
          <div>
            <div style={S.label}><span>Tie Back</span><span>{hasTieBack ? "Locked" : "Unlocked"}</span></div>
            <button type="button" onClick={() => setHasTieBack(v => !v)} style={{
              width: "100%", padding: 10, borderRadius: 6, border: "none", cursor: "pointer",
              backgroundColor: hasTieBack ? "#66bb6a" : "#ef5350",
              color: "white", fontWeight: "bold",
            }}>
              {hasTieBack ? "Installed (Safer)" : "Not Installed (Risky)"}
            </button>
            <div style={{ fontSize: 10, color: "#90a4ae", marginTop: 3 }}>
              ไม่เปลี่ยนแรงที่แนวเชื่อม SQB — แรงผ่านรอยเชื่อมรางก่อนถึง tie back (เหมือนโปรแกรมแรก)
            </div>
          </div>

          <div style={{ borderTop: "1px solid #eceff1", paddingTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: "bold", color: "#546e7a", marginBottom: 6 }}>SQB BAR Weld — 65×65 Rail → Top Flange</div>

            {/* Weld size + electrode */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#78909c", marginBottom: 3 }}>Weld Size</div>
                <select value={weldSize} onChange={e => setWeldSize(Number(e.target.value))}
                  style={{ width: "100%", padding: "6px", borderRadius: 6, border: "1px solid #b0bec5", fontSize: 13 }}>
                  {[4, 5, 6, 8].map(s => <option key={s} value={s}>{s} mm</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#78909c", marginBottom: 3 }}>Electrode</div>
                <select value={electrode} onChange={e => setElectrode(e.target.value)}
                  style={{ width: "100%", padding: "6px", borderRadius: 6, border: "1px solid #b0bec5", fontSize: 13 }}>
                  <option value="E6013">E6013 (126 MPa)</option>
                  <option value="E7016">E7016 (144 MPa)</option>
                </select>
              </div>
            </div>

            {/* Pattern */}
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              {["continuous", "intermittent"].map(p => (
                <button key={p} onClick={() => setWeldPattern(p)} style={{
                  flex: 1, padding: "6px 4px", borderRadius: 6, border: "1px solid #b0bec5", cursor: "pointer", fontSize: 11, fontWeight: "bold",
                  backgroundColor: weldPattern === p ? "#e65100" : "#f5f5f5",
                  color: weldPattern === p ? "white" : "#546e7a",
                }}>{p === "continuous" ? "Continuous" : "Intermittent"}</button>
              ))}
            </div>
            {weldPattern === "intermittent" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#78909c", marginBottom: 2 }}>ระยะเชื่อม (mm)</div>
                  <select value={weldOn} onChange={e => setWeldOn(Number(e.target.value))}
                    style={{ width: "100%", padding: "5px", borderRadius: 6, border: "1px solid #b0bec5", fontSize: 12 }}>
                    {[25, 40, 50, 75, 100].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#78909c", marginBottom: 2 }}>ระยะเว้น (mm)</div>
                  <select value={weldGap} onChange={e => setWeldGap(Number(e.target.value))}
                    style={{ width: "100%", padding: "5px", borderRadius: 6, border: "1px solid #b0bec5", fontSize: 12 }}>
                    {[100, 150, 200, 250, 300, 400, 500].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            )}
            {weldPattern === "intermittent" && (
              <div style={{ fontSize: 10, color: "#e65100" }}>
                เชื่อม {weldOn} เว้น {weldGap} mm · pitch {weldOn + weldGap} mm · Cat.E · τ_fat = 18 MPa
              </div>
            )}

            {/* Cycles/year */}
            <div style={{ marginTop: 10 }}>
              <div style={S.label}>
                <span style={{ fontSize: 11 }}>Cycles/year</span>
                <span style={{ fontSize: 11, fontWeight: "bold", color: "#37474f" }}>{cyclesPerYear.toLocaleString()}</span>
              </div>
              <input type="range" min="1000" max="100000" step="1000" value={cyclesPerYear}
                onChange={e => setCyclesPerYear(Number(e.target.value))} style={S.slider} />
            </div>
          </div>
        </div>

        {/* ═══ COL 2 — LT + CT settings ═══ */}
        <div style={S.panel}>

          {/* LONG TRAVEL */}
          <div>
            <div style={{ ...S.sectionTitle, backgroundColor: "#0277bd" }}>▶▶ LONG TRAVEL — Crane on Runway</div>

            <div style={{ fontSize: 11, color: "#78909c", marginBottom: 6 }}>
              โปรแกรมนี้ตรวจเฉพาะแนวเชื่อม SQB — หน้าตัดคานไม่มีผลต่อแรงที่แนวเชื่อม (การแอ่น/บิดของคาน ดูในโปรแกรมแรก)
            </div>

            {/* ทิศเดินเครน — เหมือนปุ่ม Forward / Backward ในโปรแกรมแรก */}
            <div style={{ fontSize: 10, color: "#90a4ae", marginBottom: 3 }}>ทิศเดินเครน</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              {[["fwd", "▶ Forward"], ["bwd", "◀ Backward"]].map(([d, lbl]) => (
                <button key={d} onClick={() => setLtDir(d)} style={{
                  flex: 1, padding: "5px 4px", borderRadius: 6, border: "2px solid", cursor: "pointer", fontSize: 11, fontWeight: "bold",
                  borderColor: ltDir === d ? "#0277bd" : "#b0bec5",
                  backgroundColor: ltDir === d ? "#0277bd" : "#f5f5f5",
                  color: ltDir === d ? "white" : "#546e7a",
                }}>{lbl}</button>
              ))}
            </div>

            {/* LT VFD */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: "bold", color: "#37474f" }}>VFD</span>
              <button onClick={() => setLtVFD(v => !v)} style={{
                padding: "3px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                fontWeight: "bold", fontSize: 11,
                backgroundColor: ltVFD ? "#00838f" : "#b0bec5", color: "white",
              }}>{ltVFD ? "ON" : "OFF"}</button>
            </div>
            {ltVFD && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#546e7a", marginBottom: 2 }}>
                  <span>Ramp</span><span style={{ fontWeight: "bold", color: "#00838f" }}>{ltRamp} s</span>
                </div>
                <input type="range" min="2" max="20" step="1" value={ltRamp}
                  onChange={e => setLtRamp(Number(e.target.value))} style={{ ...S.slider, marginBottom: 4 }} />
                <button onClick={() => setLtSync(v => !v)} style={{
                  width: "100%", padding: "4px", borderRadius: 6, border: `2px solid ${ltSync ? "#43a047" : "#b0bec5"}`,
                  cursor: "pointer", fontWeight: "bold", fontSize: 10,
                  backgroundColor: ltSync ? "#e8f5e9" : "#f5f5f5",
                  color: ltSync ? "#2e7d32" : "#546e7a", marginBottom: 4,
                }}>{ltSync ? "✓ Sync Dual Drive" : "Single Drive"}</button>
              </>
            )}

            {/* Geometric Skew Factor */}
            <div style={{ marginBottom: 8, padding: "8px 10px", borderRadius: 8, backgroundColor: "#fff3e0", border: "1px solid #ffe0b2" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: "bold", color: "#e65100", marginBottom: 3 }}>
                <span>Geometric Skew α <span style={{ fontWeight: "normal", color: "#78909c" }}>(ความเบี้ยวราง)</span></span>
                <span>{(skewFactor * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min="0" max="0.15" step="0.01" value={skewFactor}
                onChange={e => setSkewFactor(Number(e.target.value))} style={{ ...S.slider, accentColor: "#e65100" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#b0bec5", marginTop: 2 }}>
                <span>0% ราบเรียบ</span><span>15% เบี้ยวมาก</span>
              </div>
              {ltLevel > 0 && (
                <div style={{ marginTop: 4, fontSize: 11, color: "#c62828", fontWeight: "bold" }}>
                  F_skew = {skewFactor} × {(CRANE_MASS + load + TROLLEY_MASS).toFixed(1)} = {(skewFactor * (CRANE_MASS + load + TROLLEY_MASS)).toFixed(3)} ton (ทุก cycle)
                </div>
              )}
            </div>

            {/* LT Speed buttons — toggle on/off */}
            <div style={{ fontSize: 10, color: "#90a4ae", marginBottom: 3 }}>กดเปิด/ปิด (toggle)</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              <button onClick={() => toggleLT(1)}
                style={{ ...btnBase, backgroundColor: ltLevel === 1 ? "#0277bd" : "#90caf9", boxShadow: ltLevel === 1 ? "0 0 0 3px #81d4fa" : "none" }}>
                Speed 1<br/><span style={{ fontSize: 10, fontWeight: "normal" }}>4 m/min</span>
              </button>
              <button onClick={() => toggleLT(2)}
                style={{ ...btnBase, backgroundColor: ltLevel === 2 ? "#b71c1c" : "#ef9a9a", boxShadow: ltLevel === 2 ? "0 0 0 3px #ffcdd2" : "none" }}>
                Speed 2<br/><span style={{ fontSize: 10, fontWeight: "normal" }}>50 m/min</span>
              </button>
            </div>
            <div style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: "bold",
              backgroundColor: ltActive ? "#fff3e0" : "#eceff1",
              color: ltActive ? "#e65100" : "#90a4ae", textAlign: "center",
            }}>
              F_LT = {fLT.toFixed(3)} ton · {toKN(fLT).toFixed(2)} kN {ltActive ? "▶" : "(idle)"}
            </div>
          </div>

          <div style={{ borderTop: "1px solid #eceff1" }} />

          {/* CROSS TRAVEL */}
          <div>
            <div style={{ ...S.sectionTitle, backgroundColor: "#6a1b9a" }}>↔ CROSS TRAVEL — Trolley on Bridge</div>

            <div style={{ fontSize: 11, color: "#78909c", marginBottom: 8 }}>
              แรงเฉื่อย trolley + ของยก ผ่าน end truck ลงรางวิ่ง 2 ข้าง · F = m × a / 2 ต่อราง
            </div>

            {/* CT VFD */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: "bold", color: "#37474f" }}>VFD</span>
              <button onClick={() => setCtVFD(v => !v)} style={{
                padding: "3px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                fontWeight: "bold", fontSize: 11,
                backgroundColor: ctVFD ? "#00838f" : "#b0bec5", color: "white",
              }}>{ctVFD ? "ON" : "OFF"}</button>
            </div>
            {ctVFD && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#546e7a", marginBottom: 2 }}>
                  <span>Ramp</span><span style={{ fontWeight: "bold", color: "#00838f" }}>{ctRamp} s</span>
                </div>
                <input type="range" min="2" max="20" step="1" value={ctRamp}
                  onChange={e => setCtRamp(Number(e.target.value))} style={{ ...S.slider, marginBottom: 4 }} />
              </>
            )}

            {/* ทิศ trolley — เหมือนปุ่ม ◀ Left / Right ▶ ของโหมด Cross ในโปรแกรมแรก */}
            <div style={{ fontSize: 10, color: "#90a4ae", marginBottom: 3 }}>ทิศที่ trolley เร่งไป</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              {[["toL", "◀ ไปราง L"], ["toR", "ไปราง R ▶"]].map(([d, lbl]) => (
                <button key={d} onClick={() => setCtDir(d)} style={{
                  flex: 1, padding: "5px 4px", borderRadius: 6, border: "2px solid", cursor: "pointer", fontSize: 11, fontWeight: "bold",
                  borderColor: ctDir === d ? "#6a1b9a" : "#b0bec5",
                  backgroundColor: ctDir === d ? "#6a1b9a" : "#f5f5f5",
                  color: ctDir === d ? "white" : "#546e7a",
                }}>{lbl}</button>
              ))}
            </div>

            {/* CT Speed buttons — toggle on/off */}
            <div style={{ fontSize: 10, color: "#90a4ae", marginBottom: 3 }}>กดเปิด/ปิด (toggle)</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              <button onClick={() => toggleCT(1)}
                style={{ ...btnBase, backgroundColor: ctLevel === 1 ? "#6a1b9a" : "#ce93d8", boxShadow: ctLevel === 1 ? "0 0 0 3px #e1bee7" : "none" }}>
                Speed 1<br/><span style={{ fontSize: 10, fontWeight: "normal" }}>5 m/min</span>
              </button>
              <button onClick={() => toggleCT(2)}
                style={{ ...btnBase, backgroundColor: ctLevel === 2 ? "#4a148c" : "#9c27b0", boxShadow: ctLevel === 2 ? "0 0 0 3px #d1c4e9" : "none" }}>
                Speed 2<br/><span style={{ fontSize: 10, fontWeight: "normal" }}>20 m/min</span>
              </button>
            </div>
            <div style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: "bold",
              backgroundColor: ctActive ? "#f3e5f5" : "#eceff1",
              color: ctActive ? "#6a1b9a" : "#90a4ae", textAlign: "center",
            }}>
              F_CT = {fCT.toFixed(3)} ton · {toKN(fCT).toFixed(2)} kN {ctActive ? (ctDir === "toL" ? "◀ ไปราง L" : "ไปราง R ▶") : "(idle)"}
            </div>
          </div>
        </div>

        {/* ═══ COL 3 — Visualization + Results ═══ */}
        <div style={S.rightPanel}>

          {/* Status bar */}
          <div style={{
            padding: "6px 14px", borderRadius: 10, fontWeight: "bold", fontSize: 13,
            backgroundColor: bothActive ? "#fff3e0" : ltActive || ctActive ? "#e3f2fd" : "#e8f5e9",
            color: bothActive ? "#e65100" : ltActive || ctActive ? "#0277bd" : "#388e3c",
            border: `1px solid ${bothActive ? "#ffcc80" : ltActive || ctActive ? "#90caf9" : "#c8e6c9"}`,
            flexShrink: 0,
          }}>
            {bothActive
              ? `⚠ Both axes active — ราง BITE = ${rfNow.same ? `${fLT.toFixed(2)} + ${rfNow.fctBite.toFixed(2)}` : `|${fLT.toFixed(2)} − ${rfNow.fctBite.toFixed(2)}|`} → F_combined = ${fComb.toFixed(2)} ton (${toKN(fComb).toFixed(2)} kN)`
              : ltActive ? `▶▶ Long Travel active — F_LT = ${fLT.toFixed(3)} ton (${toKN(fLT).toFixed(2)} kN)`
              : ctActive ? `↔ Cross Travel active — F_CT = ${fCT.toFixed(3)} ton (${toKN(fCT).toFixed(2)} kN)`
              : "✓ Idle — กดปุ่ม Speed 1 / Speed 2 เพื่อเริ่ม simulation"}
          </div>

          {/* Force vector diagram + Comparison */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, flexShrink: 0 }}>

            {/* SVG Force diagram */}
            <div style={S.card}>
              <div style={{ fontWeight: "bold", color: "#37474f", fontSize: 12, marginBottom: 6 }}>
                Force Vector — Top View (Runway Rail)
              </div>
              <svg width="300" height="250" viewBox="0 0 300 250" style={{ display: "block" }}>
                <defs>
                  <marker id="arr-lt" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto"><polygon points="0 0,10 4,0 8" fill="#0277bd"/></marker>
                  <marker id="arr-ct" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto"><polygon points="0 0,10 4,0 8" fill="#6a1b9a"/></marker>
                  <marker id="arr-cb" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto"><polygon points="0 0,10 4,0 8" fill="#e65100"/></marker>
                </defs>

                {/* Background */}
                <rect width="300" height="250" fill="#f8f9fa" rx="8"/>

                <g transform="translate(0, 14)">
                {/* Long Travel direction label */}
                <text x="88" y="2" textAnchor="middle" fill="#0277bd" fontSize="9" fontWeight="bold">{ltDir === "fwd" ? "Long Travel (Forward) →" : "← Long Travel (Backward)"}</text>

                {/* ── L rail (top, horizontal) ── */}
                <rect x="5"  y="20" width="172" height="5"  fill="#455a64" rx="1"/>
                <rect x="5"  y="25" width="172" height="13" fill="#607d8b" rx="1"/>
                <rect x="5"  y="29" width="172" height="5"  fill="#ff8f00" rx="1"/>  {/* SQB BAR — กลาง WF */}
                <rect x="5"  y="38" width="172" height="5"  fill="#455a64" rx="1"/>
                <text x="178" y="33" fill="#546e7a" fontSize="9" fontWeight="bold">L</text>

                {/* ── R rail (bottom, horizontal) ── */}
                <rect x="5"  y="174" width="172" height="5"  fill="#455a64" rx="1"/>  {/* top flange */}
                <rect x="5"  y="179" width="172" height="15" fill="#607d8b" rx="1"/>  {/* web */}
                <rect x="5"  y="183" width="172" height="5"  fill="#ff8f00" rx="1"/>  {/* SQB BAR — กลาง WF */}
                <rect x="5"  y="194" width="172" height="5"  fill="#455a64" rx="1"/>  {/* bot flange */}
                <text x="178" y="188" fill="#546e7a" fontSize="9" fontWeight="bold">R</text>
                <text x="7" y="13" fill="#ff8f00" fontSize="7">── SQB BAR weld (กลาง WF)</text>

                {/* ── End trucks (horizontal, connecting to rails) ── */}
                {/* Top ET on L rail */}
                <rect x="55" y="21" width="76" height="22" fill="#37474f" rx="3"/>
                <text x="93" y="35" textAnchor="middle" fill="#90a4ae" fontSize="7" fontWeight="bold">END TRUCK</text>
                {/* Bottom ET on R rail */}
                <rect x="55" y="177" width="76" height="22" fill="#37474f" rx="3"/>
                <text x="93" y="191" textAnchor="middle" fill="#90a4ae" fontSize="7" fontWeight="bold">END TRUCK</text>

                {/* Wheels on rails */}
                <circle cx="65"  cy="30"  r="7" fill="#1a237e" stroke="#c5cae9" strokeWidth="1.5"/>
                <circle cx="121" cy="30"  r="7" fill="#1a237e" stroke="#c5cae9" strokeWidth="1.5"/>
                <circle cx="65"  cy="188" r="7" fill="#1a237e" stroke="#c5cae9" strokeWidth="1.5"/>
                <circle cx="121" cy="188" r="7" fill="#1a237e" stroke="#c5cae9" strokeWidth="1.5"/>

                {/* ── Bridge Girder (VERTICAL — ตั้งฉากกับราง) ── */}
                <rect x="83" y="43" width="20" height="134" fill="#fbc02d" stroke="#f57f17" strokeWidth="1.5" rx="2"/>
                {/* stiffener lines */}
                <line x1="83" y1="88"  x2="103" y2="88"  stroke="#f9a825" strokeWidth="0.8"/>
                <line x1="83" y1="110" x2="103" y2="110" stroke="#f9a825" strokeWidth="0.8"/>
                <line x1="83" y1="132" x2="103" y2="132" stroke="#f9a825" strokeWidth="0.8"/>
                {/* Bridge label rotated */}
                <text x="93" y="88" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#7b5800"
                  transform="rotate(-90 93 110)">BRIDGE 23.6m</text>


                {/* ── HOIST / Trolley (moves vertically along bridge) ── */}
                {(() => {
                  const cy = 44 + (trolleyPos / 22.6) * 133;
                  return (
                    <g>
                      <rect x="72" y={cy - 11} width="42" height="22" fill="#d32f2f" stroke="#b71c1c" strokeWidth="1.5" rx="3"/>
                      <text x="93" y={cy + 5} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">HOIST</text>
                    </g>
                  );
                })()}

                {/* ── แรงบนรางจริง — ภาพนี้แนวตั้ง = ตั้งฉากกับราง · ทิศ + = ลง (ไปทางราง R) ─────────
                    · ราง BITE ตามตำแหน่ง HOIST (กฎเดียวกับโปรแกรมแรก, เดินหน้า·เร่ง) · F_LT ดันราง BITE เข้าใน
                    · trolley เร่งไปราง X → รางทั้งสองถูกดันไปทางตรงข้าม X (F_CT)
                    · ทิศเดียวกัน → ต่อหัวต่อหาง · สวนทาง → วาดแยก */}
                {(() => {
                  const k     = 80 / Math.max(fLT + fCT, 0.1);           // px ต่อ ton
                  const hL    = fLT > 0.01 ? Math.max(fLT * k, 10) : 0;
                  const hCb   = rfNow.fctBite  > 0.005 ? Math.max(rfNow.fctBite  * k, 8) : 0;   // F_CT ราง BITE
                  const hCo   = rfNow.fctOther > 0.005 ? Math.max(rfNow.fctOther * k, 8) : 0;   // F_CT อีกราง
                  const wx    = ltDir === "fwd" ? 121 : 65;                                      // ล้อหน้า
                  const { biteSign, ctSign, same } = rfNow;
                  const edge  = (isL, dir) => isL ? (dir > 0 ? 43 : 20) : (dir > 0 ? 199 : 174);
                  const outw  = (isL, dir) => isL ? dir < 0 : dir > 0;         // ชี้ออกนอก → ที่จำกัด
                  const len   = (isL, dir, h) => outw(isL, dir) ? Math.min(h, 20) : h;
                  const arrow = (x, y1, dir, h, color, id) => h > 0 &&
                    <line x1={x} y1={y1} x2={x} y2={y1 + dir * h} stroke={color} strokeWidth="3" markerEnd={`url(#${id})`}/>;
                  const yB    = edge(biteL, biteSign);
                  const cyH   = 44 + (trolleyPos / 22.6) * 133;
                  const accS  = ctDir === "toL" ? -1 : 1;                      // ทิศความเร่ง trolley ในภาพ
                  // ความยาวตามความเร่งจริง (m/s²): Speed 1 VFD ≈ 0.03 → ~14 px · Speed 2 ไม่มี VFD ≈ 0.42 → 50 px
                  const aCT   = stepsCT?.accel.accelMs2 ?? 0;
                  const hA    = Math.min(10 + aCT * 120, 50);
                  return (
                    <g>
                      {ltActive && <>
                        <circle cx={wx} cy={biteL ? 30 : 188} r="10" fill="none" stroke="#c62828" strokeWidth="2.5"/>
                        <text x={wx + 13} y={biteL ? 16 : 212} fill="#c62828" fontSize="8" fontWeight="bold">BITE</text>
                      </>}
                      {ctActive && <>
                        <line x1="120" y1={cyH} x2="120" y2={cyH + accS * hA} stroke="#6a1b9a" strokeWidth="2" markerEnd="url(#arr-ct)"/>
                        <text x="60" y={cyH + accS * hA / 2 + 3} textAnchor="end" fill="#6a1b9a" fontSize="7" fontWeight="bold">a = {aCT.toFixed(3)} m/s²</text>
                      </>}
                      {/* ราง BITE */}
                      {arrow(152, yB, biteSign, hL, "#0277bd", "arr-lt")}
                      {same
                        ? arrow(152, yB + biteSign * hL, ctSign, hCb, "#6a1b9a", "arr-ct")
                        : arrow(164, edge(biteL, ctSign), ctSign, len(biteL, ctSign, hCb), "#6a1b9a", "arr-ct")}
                      {/* อีกราง */}
                      {arrow(152, edge(!biteL, ctSign), ctSign, len(!biteL, ctSign, hCo), "#6a1b9a", "arr-ct")}
                    </g>
                  );
                })()}
                </g>

                {/* ── สรุปแรงต่อราง (ขวา) ── */}
                <text x="244" y="14" textAnchor="middle" fill="#546e7a" fontSize="9" fontWeight="bold">แรงขวางราง</text>
                <text x="244" y="24" textAnchor="middle" fill="#90a4ae" fontSize="7">ลูกศรยาวตามสัดส่วนแรง</text>

                <g transform={`translate(0, ${biteL ? 0 : 148})`}>
                  <text x="196" y="52" fill="#37474f" fontSize="8" fontWeight="bold">ราง {biteL ? "L" : "R"} (ล้อ BITE)</text>
                  <text x="196" y="63" fill="#0277bd" fontSize="8">F_LT {fLT.toFixed(2)}T · {toKN(fLT).toFixed(1)}kN</text>
                  <text x="196" y="74" fill="#6a1b9a" fontSize="8">{rfNow.same ? "+" : "−"} F_CT {rfNow.fctBite.toFixed(2)}T · {toKN(rfNow.fctBite).toFixed(1)}kN</text>
                  <text x="196" y="86" fill="#e65100" fontSize="9" fontWeight="bold">สุทธิ {Math.abs(rfNow.biteNet).toFixed(2)}T · {toKN(Math.abs(rfNow.biteNet)).toFixed(1)}kN</text>
                </g>

                <text x="196" y="108" fill="#90a4ae" fontSize="7">LT: {ltDir === "fwd" ? "เดินหน้า" : "ถอยหลัง"} · กำลังเร่ง</text>
                <text x="196" y="118" fill="#90a4ae" fontSize="7">· HOIST {biteL ? "ขวา" : "ซ้าย"} → BITE {biteL ? "L" : "R"}</text>
                <text x="196" y="128" fill="#90a4ae" fontSize="7">· trolley เร่งไปราง {ctDir === "toL" ? "L" : "R"}</text>
                <text x="196" y="138" fill={rfNow.same ? "#c62828" : "#2e7d32"} fontSize="7" fontWeight="bold">
                  → F_CT {rfNow.same ? "ทิศเดียวกัน (บวก)" : "สวนทาง (หักล้าง)"}
                </text>

                <g transform={`translate(0, ${biteL ? 0 : -148})`}>
                  <text x="196" y="200" fill="#37474f" fontSize="8" fontWeight="bold">ราง {biteL ? "R" : "L"}</text>
                  <text x="196" y="211" fill="#6a1b9a" fontSize="8">F_CT {rfNow.fctOther.toFixed(2)}T · {toKN(rfNow.fctOther).toFixed(1)}kN</text>
                </g>

                {/* ── Legend ── */}
                <g transform="translate(5, 238)">
                  <rect width="7" height="7" fill="#0277bd" rx="1"/><text x="10" y="7" fill="#546e7a" fontSize="8">Long Travel</text>
                  <rect x="73" width="7" height="7" fill="#6a1b9a" rx="1"/><text x="83" y="7" fill="#546e7a" fontSize="8">Cross Travel</text>
                  <rect x="151" width="7" height="7" fill="#e65100" rx="1"/><text x="161" y="7" fill="#546e7a" fontSize="8">Combined</text>
                  <rect x="219" width="7" height="7" fill="#ff8f00" rx="1"/><text x="229" y="7" fill="#546e7a" fontSize="8">SQB BAR</text>
                </g>
              </svg>
            </div>

            {/* Comparison table */}
            <div style={S.card}>
              <div style={{ fontWeight: "bold", color: "#37474f", fontSize: 12, marginBottom: 8 }}>
                SQB BAR Weld — ผลกระทบต่อรางกันหลุด (Runway Rail)
              </div>
              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "110px 70px 70px 70px 80px 1fr auto", gap: 6, marginBottom: 4 }}>
                {["Scenario", "F (T / kN)", "τ (MPa)", "Static", "Fatigue", "อายุ", ""].map(h => (
                  <span key={h} style={{ fontSize: 10, color: "#90a4ae", fontWeight: "bold" }}>{h}</span>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "#b0bec5", marginBottom: 4 }}>คลิกแถวเพื่อดูการคำนวณ</div>

              <ResultRow
                label="LT เดียว"
                thrust={fLT} tau={wLT.tau} util={wLT.util} fatUtil={wLT.fatUtil}
                life={lifeLT} color="#0277bd"
                onClick={() => setOpenDetail(v => v === "lt" ? null : "lt")}
                isOpen={openDetail === "lt"} />
              {openDetail === "lt" && (
                <CalcDetailPanel scenario="lt" steps={stepsLT}
                  load={load} trolleyPos={trolleyPos}
                  weldSize={weldSize} electrode={electrode}
                  weldPattern={weldPattern} weldOn={weldOn} weldGap={weldGap}
                  cyclesPerYear={cyclesPerYear} />
              )}

              <ResultRow
                label="CT เดียว"
                thrust={fCT} tau={wCT.tau} util={wCT.util} fatUtil={wCT.fatUtil}
                life={lifeCT} color="#6a1b9a"
                onClick={() => setOpenDetail(v => v === "ct" ? null : "ct")}
                isOpen={openDetail === "ct"} />
              {openDetail === "ct" && (
                <CalcDetailPanel scenario="ct" steps={stepsCT}
                  load={load} trolleyPos={trolleyPos}
                  weldSize={weldSize} electrode={electrode}
                  weldPattern={weldPattern} weldOn={weldOn} weldGap={weldGap}
                  cyclesPerYear={cyclesPerYear} />
              )}

              <ResultRow
                label="พร้อมกัน ⚡"
                thrust={fComb} tau={wComb.tau} util={wComb.util} fatUtil={wComb.fatUtil}
                life={lifeComb} color="#e65100"
                onClick={() => setOpenDetail(v => v === "comb" ? null : "comb")}
                isOpen={openDetail === "comb"} />
              {openDetail === "comb" && (
                <CalcDetailPanel scenario="comb" steps={stepsComb}
                  load={load} trolleyPos={trolleyPos}
                  weldSize={weldSize} electrode={electrode}
                  weldPattern={weldPattern} weldOn={weldOn} weldGap={weldGap}
                  cyclesPerYear={cyclesPerYear} />
              )}

              {/* Increase badge */}
              {fLT > 0.01 && fCT > 0.01 && (
                <div style={{
                  marginTop: 8, padding: "8px 12px", borderRadius: 8,
                  backgroundColor: "#fff3e0", border: "1px solid #ffcc80",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 12, color: "#e65100", fontWeight: "bold" }}>
                    เชื่อมพร้อมกัน vs LT เดียว
                  </span>
                  <span style={{ fontSize: 18, fontWeight: "900", color: "#c62828" }}>
                    {fComb >= fLT ? "+" : "−"}{Math.abs((fComb / fLT - 1) * 100).toFixed(0)}%
                    <span style={{ fontSize: 11, fontWeight: "normal", color: "#78909c", marginLeft: 4 }}>แรงที่แนวเชื่อม</span>
                  </span>
                </div>
              )}

              {/* Life comparison */}
              {fLT > 0.01 && fCT > 0.01 && lifeLT < 9999 && lifeComb < 9999 && (
                <div style={{
                  marginTop: 4, padding: "8px 12px", borderRadius: 8,
                  backgroundColor: "#ffebee", border: "1px solid #ffcdd2",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 12, color: "#c62828", fontWeight: "bold" }}>
                    อายุเชื่อมลดลง
                  </span>
                  <span style={{ fontSize: 14, fontWeight: "900", color: "#c62828" }}>
                    {lifeLT >= 999 ? ">999" : lifeLT.toFixed(1)} ปี → {lifeComb >= 999 ? ">999" : lifeComb.toFixed(1)} ปี
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Formula explanation */}
          <div style={{ ...S.card, backgroundColor: "#fafafa", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: "bold", color: "#546e7a", marginBottom: 4 }}>แรงรวม (+ ทิศเดียวกัน · − สวนทาง · ใช้รางที่มากกว่า)</div>
                <div style={{ fontFamily: "monospace", fontSize: 13, color: "#37474f", backgroundColor: "#eceff1", padding: "4px 10px", borderRadius: 6 }}>
                  F_comb = max(|F_LT ± F_CT|, F_CT)
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: "bold", color: "#546e7a", marginBottom: 4 }}>แรงที่แนวเชื่อม SQB BAR</div>
                <div style={{ fontFamily: "monospace", fontSize: 13, color: "#37474f", backgroundColor: "#eceff1", padding: "4px 10px", borderRadius: 6 }}>
                  F_res = F × √2 · A = 2×L×a · τ = F_res/A
                </div>
                <div style={{ fontSize: 10, color: "#90a4ae", marginTop: 2 }}>
                  L = RAIL_H (continuous) · L = weldOn (intermittent)
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: "bold", color: "#546e7a", marginBottom: 4 }}>S-N Fatigue Life</div>
                <div style={{ fontFamily: "monospace", fontSize: 13, color: "#37474f", backgroundColor: "#eceff1", padding: "4px 10px", borderRadius: 6 }}>
                  N = C/τ³ &nbsp;·&nbsp; ปี = N / cycles_per_year
                </div>
              </div>
            </div>
          </div>

        {/* Zone Recommendation */}
        {wComb.tau > 0 && (() => {
          // Use F_res directly — consistent with corrected calcWeld
          const F_res_N = Math.max(wComb.F_res, wLT.F_res);
          const refTau  = Math.max(wComb.tau,   wLT.tau);
          const tauCont = F_res_N / (2 * RAIL_H * 0.707 * weldSize);
          const C_D = 2e6 * 55 ** 3;
          const C_E = 2e6 * 18 ** 3;
          const yrCur  = (weldPattern === "continuous" ? C_D : C_E) / refTau ** 3 / cyclesPerYear;
          const yrCrit = C_D / tauCont ** 3 / cyclesPerYear;
          const tau25  = (C_D / (25 * cyclesPerYear)) ** (1 / 3);
          const reqSize = Math.ceil(F_res_N / (2 * RAIL_H * 0.707 * tau25));
          const A_req  = 2 * RAIL_H * 0.707 * reqSize;
          const tauReq = F_res_N / A_req;
          const yrReq  = C_D / tauReq ** 3 / cyclesPerYear;
          const fmt = y => y >= 999 ? ">999" : y.toFixed(1);
          const yCol = y => y >= 25 ? "#2e7d32" : y >= 10 ? "#e65100" : "#c62828";
          const yBg  = y => y >= 25 ? "#e8f5e9" : y >= 10 ? "#fff3e0" : "#ffebee";
          const th = { padding: "5px 8px", textAlign: "center", color: "#546e7a", fontWeight: "700", fontSize: 11, borderBottom: "2px solid #eceff1" };
          const td = { padding: "6px 8px", textAlign: "center", fontSize: 12, borderBottom: "1px solid #f5f5f5" };
          const rows = [
            { label: "⚪ ปัจจุบัน",    desc: weldPattern === "continuous" ? "Continuous ทั้งเส้น" : `เชื่อม ${weldOn} เว้น ${weldGap} mm`, tau: refTau,  cat: weldPattern === "continuous" ? "D·55" : "E·18", years: yrCur  },
            { label: "🟡 Critical Zone", desc: `Continuous ${weldSize}mm (±3m จากจุดจอด)`,                                                     tau: tauCont, cat: "D·55",                                    years: yrCrit },
            { label: "🟢 Recommended",  desc: `Continuous ${reqSize}mm · E7016`,                                                                tau: tauReq,  cat: "D·55",                                    years: yrReq  },
          ];
          return (
            <div style={{ ...S.card, flexShrink: 0 }}>
              <div style={{ fontWeight: "bold", color: "#37474f", fontSize: 13, marginBottom: 8 }}>
                🗺 Weld Zone Recommendation — ใช้แรง Combined (worst case) · {cyclesPerYear.toLocaleString()} cycles/yr
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    {["Zone", "Pattern", "Cat.", "τ (MPa)", "Fatigue%", "อายุ (ปี)"].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const lim  = r.cat.includes("55") ? 55 : 18;
                    const util = (r.tau / lim * 100).toFixed(0);
                    return (
                      <tr key={i} style={{ backgroundColor: yBg(r.years) }}>
                        <td style={{ ...td, textAlign: "left" }}>
                          <strong>{r.label}</strong>
                          <div style={{ fontSize: 10, color: "#78909c" }}>{r.desc}</div>
                        </td>
                        <td style={td}>{r.desc.split("(")[0].trim()}</td>
                        <td style={td}>{r.cat} MPa</td>
                        <td style={{ ...td, fontWeight: "bold" }}>{r.tau.toFixed(1)}</td>
                        <td style={{ ...td, fontWeight: "bold", color: yCol(r.years) }}>{util}%</td>
                        <td style={{ ...td, fontSize: 18, fontWeight: "900", color: yCol(r.years) }}>{fmt(r.years)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {yrCrit < 25 && (
                <div style={{ marginTop: 8, padding: "6px 12px", backgroundColor: "#fff8e1", borderRadius: 8, fontSize: 12, color: "#f57f17" }}>
                  💡 ต้องใช้ <strong>Continuous {reqSize}mm E7016</strong> ที่ Critical Zone ถึงจะได้อายุ ≥ 25 ปี
                </div>
              )}
            </div>
          );
        })()}

        </div>
      </div>
    </div>
  );
}
