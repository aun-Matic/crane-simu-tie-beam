import React, { useState, useEffect, useRef, useMemo } from "react";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const styles = {
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
    fontSize: "18px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "1px",
    flexShrink: 0,
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "280px 320px 1fr",
    gap: "12px",
    alignItems: "stretch",
    flex: 1,
    overflow: "hidden",
    minHeight: 0,
  },
  leftPanel: {
    backgroundColor: "white",
    padding: "14px",
    borderRadius: "14px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    overflowY: "auto",
    height: "100%",
    boxSizing: "border-box",
  },
  middlePanel: {
    backgroundColor: "white",
    padding: "14px",
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
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: {
    display: "flex",
    justifyContent: "space-between",
    fontWeight: "700",
    color: "#546e7a",
    fontSize: "13px",
  },
  slider: { width: "100%", accentColor: "#00838f", height: "6px", cursor: "pointer" },
  vizRow: { display: "grid", gridTemplateColumns: "auto auto 1fr", gap: "12px", alignItems: "stretch", flexShrink: 0 },
  card: {
    backgroundColor: "white",
    padding: "12px",
    borderRadius: "14px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  btnGroup: { display: "flex", gap: "8px", justifyContent: "center", marginTop: "8px", flexWrap: "wrap" },
  btn: {
    padding: "12px 18px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    transition: "all 0.1s",
    color: "white",
    boxShadow: "0 3px 0 rgba(0,0,0,0.1)",
    userSelect: "none",
    touchAction: "manipulation",
    flex: 1,
  },
  dirBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "2px solid #b0bec5",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    transition: "all 0.15s",
    userSelect: "none",
    flex: 1,
  },
  skewAlert: {
    backgroundColor: "#ffebee",
    color: "#c62828",
    padding: "8px 12px",
    borderRadius: "8px",
    textAlign: "center",
    fontWeight: "bold",
    border: "1px solid #ffcdd2",
    fontSize: "13px",
  },
  phaseBadge: {
    display: "inline-block",
    padding: "3px 12px",
    borderRadius: "20px",
    fontWeight: "bold",
    fontSize: "12px",
    marginBottom: "6px",
  },
  divider: {
    borderTop: "1px solid #eceff1",
    margin: "2px 0",
  },
};

// Beam section data (JIS G 3192)
// J  = St. Venant torsion constant (mm⁴) = Σ(b·t³)/3
// Cw = Warping constant (mm⁶) = I_yf · h_o² / 2  (h_o = depth − tf)
const BEAM_SECTIONS = {
  "H600×300": {
    label: "H600×300 (H588×300×12×20)",
    Iy_cm4: 9010, depth: 588, tf: 20, tw: 12, b: 300,
    J_mm4: 1915755,
    Cw_mm6: 7.259e12,
  },
  "H500×300": {
    label: "H500×300 (H488×300×11×18)",
    Iy_cm4: 8110, depth: 488, tf: 18, tw: 11, b: 300,
    J_mm4: 1366937,
    Cw_mm6: 4.473e12,
  },
};

// Weld allowable shear stress (AWS D1.1 / AISC)
const WELD_ALLOW = { E6013: 0.3 * 420, E7016: 0.3 * 480 }; // MPa

// ── Calculation detail panel ───────────────────────────────────────────────
const S = ({ title, color = "#546e7a" }) => (
  <div style={{ fontSize: 11, fontWeight: 800, color: "white", background: color, padding: "3px 10px", borderRadius: 5, margin: "10px 0 4px" }}>
    {title}
  </div>
);
// การ์ดแคบ: บรรทัดบน = ชื่อ + ผล · บรรทัดล่าง = สูตร (เต็มความกว้าง) → ไม่ล้นขอบ ไม่ตัดคำทีละตัว
const Row = ({ label, formula, result, unit }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", columnGap: 6, padding: "3px 2px", borderBottom: "1px solid #f0f0f0", alignItems: "baseline" }}>
    <span style={{ fontSize: 11, color: "#78909c" }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: "bold", color: "#37474f", textAlign: "right", whiteSpace: "nowrap" }}>
      {result}{unit ? <span style={{ fontSize: 10, color: "#90a4ae", fontWeight: "normal", marginLeft: 3 }}>{unit}</span> : null}
    </span>
    {formula ? <span style={{ gridColumn: "1 / -1", fontFamily: "monospace", fontSize: 10, color: "#90a4ae", overflowWrap: "anywhere" }}>{formula}</span> : null}
  </div>
);

function CalcDetailPanelLT({ section, d, mode }) {
  if (!d) return null;
  const n = (v, dec = 3) => (typeof v === "number" && isFinite(v) ? v.toFixed(dec) : "—");

  const borderColor = section === "thrust" ? "#ef9a9a" : section === "bending" ? "#90caf9" : "#ffcc80";
  const title = section === "thrust" ? "แรงข้าง (Side Thrust)" : section === "bending" ? "การโก่งข้าง (Lateral Bending)" : "การบิด (Torsion)";

  return (
    <div style={{ padding: "10px 12px", background: "#fafafa", borderRadius: 10, border: `2px solid ${borderColor}`, marginTop: 4 }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: "#37474f", marginBottom: 4 }}>📐 การคำนวณ — {title}</div>

      {section === "thrust" && (
        <>
          <S title="① ความเร็ว & ความเร่ง" color="#546e7a" />
          <Row label="ความเร็ว" formula={`Speed ${d.accelMode} = ${n(d.speedMpm, 0)} m/min ÷ 60`} result={n(d.speedMs, 4)} unit="m/s" />
          <Row label="Ramp time" formula={d.hasVFD ? `VFD ramp = ${n(d.ramp, 1)} s` : `มาตรฐาน = ${n(d.ramp, 1)} s`} result={n(d.ramp, 1)} unit="s" />
          <Row label="ความเร่ง  a = v/t" formula={`${n(d.speedMs, 4)} ÷ ${n(d.ramp, 1)}`} result={n(d.accelMs2, 5)} unit="m/s²" />
          <Row label="ความเร่ง (g)" formula={`${n(d.accelMs2, 5)} ÷ 9.81`} result={n(d.accelG, 5)} unit="g" />
          {mode === "long" && (
            <>
              <S title="② การกระจาย Mass (Long Travel)" color="#0277bd" />
              <Row label="total = load + trolley" formula={`${n(d.load, 1)} + ${n(d.trolleyMass, 1)}`} result={n(d.load + d.trolleyMass, 2)} unit="ton" />
              <Row label="m_L = crane/2 + total×(L−pos)/L" formula={`${n(d.craneMass/2, 1)} + ${n(d.load + d.trolleyMass, 2)}×(${n(d.span,1)}−${n(d.trolleyPos,1)})/${n(d.span,1)}`} result={n(d.massLeft, 3)} unit="ton" />
              <Row label="m_R = crane/2 + total×pos/L" formula={`${n(d.craneMass/2, 1)} + ${n(d.load + d.trolleyMass, 2)}×${n(d.trolleyPos,1)}/${n(d.span,1)}`} result={n(d.massRight, 3)} unit="ton" />
            </>
          )}
          <S title={`③ แรงที่เกิด (${mode === "long" ? "Long Travel" : "Cross Travel"})`} color="#c62828" />
          {mode === "long" ? (
            <>
              <Row label="F_inertia = |Δm| × a_g × 1.5" formula={`${n(d.inertiaDiff, 3)} × ${n(d.accelG, 5)} × 1.5`} result={n(d.thrustInertia, 4)} unit="ton" />
              <Row label="F_friction = max(m)/2 × 0.05" formula={`${n(Math.max(d.massLeft, d.massRight), 3)} / 2 × 0.05`} result={n(d.thrustFriction, 4)} unit="ton" />
              <Row label="F_skew = α × M_total" formula={`${n(d.skewFactor, 2)} × ${n(d.craneMass + d.load + d.trolleyMass, 1)}`} result={n(d.thrustSkew, 4)} unit="ton" />
              <Row label="F_total รวม" formula="inertia + friction + skew" result={n(d.sideThrust, 4)} unit="ton" />
            </>
          ) : (
            <>
              <Row label="m = load + trolley" formula={`${n(d.load, 1)} + ${n(d.trolleyMass, 1)}`} result={n(d.load + d.trolleyMass, 2)} unit="ton" />
              <Row label="สัดส่วนน้ำหนักล้อ L / R" formula={`${n(d.wheelL, 2)} / ${n(d.wheelR, 2)} ton`} result={`${n(d.shareL * 100, 0)} / ${n((1 - d.shareL) * 100, 0)}`} unit="%" />
              <Row label="F_L = m × a_g × สัดส่วน L" formula={`${n(d.load + d.trolleyMass, 2)} × ${n(d.accelG, 5)} × ${n(d.shareL, 3)}`} result={n(d.crossL, 4)} unit="ton" />
              <Row label="F_R = m × a_g × สัดส่วน R" formula={`${n(d.load + d.trolleyMass, 2)} × ${n(d.accelG, 5)} × ${n(1 - d.shareL, 3)}`} result={n(d.crossR, 4)} unit="ton" />
              <Row label="ใช้ตรวจ = ค่ามาก" formula={`max(${n(d.crossL, 4)}, ${n(d.crossR, 4)})`} result={n(d.sideThrust, 4)} unit="ton" />
              <Row label="เทียบ: มาตรฐาน 20% ÷ 2" formula="ASCE 7 / AISC DG7" result={n(d.crossStd, 3)} unit="ton" />
              <Row label="เทียบ: EN 1991-3 10% ÷ 2" formula="H_T,3" result={n(d.crossEN, 3)} unit="ton" />
            </>
          )}
          <Row label="= kN" formula={`${n(d.sideThrust, 4)} × 9.81`} result={n(d.sideThrust * 9.81, 3)} unit="kN" />
        </>
      )}

      {section === "bending" && (
        <>
          <S title="① ความแกร่งด้านข้าง (Lateral Stiffness)" color="#1565c0" />
          <Row label="I_y" formula={`${d.secLabel} → Iy = ${d.Iy_cm4.toLocaleString()} cm⁴`} result={n(d.Iy_cm4 * 1e4, 0)} unit="mm⁴" />
          <Row label="k_beam = 48EI_y/L³ ÷ 9810" formula={`48 × 200,000 × ${n(d.Iy_cm4 * 1e4, 0)} ÷ ${d.spanMM}³ ÷ 9810`} result={n(d.kBeamVal, 4)} unit="ton/mm" />
          {d.hasTieBack && <Row label="k_tieback" formula="24.2 ton/mm (stiff rod)" result={n(d.kTieBackVal, 1)} unit="ton/mm" />}
          <Row label="k_total = k_beam + k_tb" formula={d.hasTieBack ? `${n(d.kBeamVal, 4)} + ${n(d.kTieBackVal, 1)}` : "ไม่มี tie-back"} result={n(d.kStiffness, 4)} unit="ton/mm" />
          <S title="② การโก่งข้าง" color="#1565c0" />
          <Row label="δ = F / k_total" formula={`${n(d.sideThrust, 4)} ÷ ${n(d.kStiffness, 4)}`} result={n(d.beamDispMm, 3)} unit="mm" />
        </>
      )}

      {section === "torsion" && (
        <>
          <S title="① แขนโมเมนต์ (Moment Arm)" color="#e65100" />
          <Row label="e = depth − tf/2 + rail_h" formula={`${d.depth} − ${n(d.tf/2, 0)} + 60`} result={n(d.e_mm, 0)} unit="mm" />
          <Row label="T = F × 9810 × e" formula={`${n(d.sideThrust, 4)} × 9810 × ${n(d.e_mm, 0)}`} result={n(d.T_Nmm, 0)} unit="N·mm" />
          <S title="② ความแกร่งต่อการบิด (Torsional Stiffness)" color="#e65100" />
          <Row label="warpFactor = 4π² (fixed-fixed)" formula="ปลายทั้งสองยึดแน่น (welded base)" result={n(d.warpFactor, 0)} unit="" />
          <Row label="k_tors = GJ + w·π²·ECw/L²" formula={`80,000×${n(d.J_mm4,0)} + ${d.warpFactor}×π²×200,000×${n(d.Cw_mm6,3)}/${d.spanMM}²`} result={n(d.kTors, 0)} unit="N·mm/rad" />
          <Row label="k_eq = phiDenom × k_tors / L" formula={`${d.phiDenom} × ${n(d.kTors, 0)} ÷ ${d.spanMM}`} result={n(d.kEqBeam, 0)} unit="N·mm/rad" />
          {d.hasTieBack && (
            <>
              <Row label="h_tb = depth/2" formula={`${d.depth} ÷ 2`} result={n(d.depth/2, 0)} unit="mm" />
              <Row label="k_tors_tb = k_tb×9810×h²" formula={`${n(d.kTieBackVal,1)}×9810×${n(d.depth/2,0)}²`} result={n(d.kTorsTb, 0)} unit="N·mm/rad" />
            </>
          )}
          <S title="③ มุมบิดและการเคลื่อนที่" color="#e65100" />
          <Row label="φ = T / (k_eq + k_tors_tb)" formula={`${n(d.T_Nmm, 0)} ÷ (${n(d.kEqBeam,0)} + ${n(d.kTorsTb,0)})`} result={n(d.phi_rad, 6)} unit="rad" />
          <Row label="φ_deg = φ × 180/π" formula={`${n(d.phi_rad, 6)} × 57.296`} result={n(d.phi_deg, 4)} unit="°" />
          <Row label="disp = φ × e" formula={`${n(d.phi_rad, 6)} × ${n(d.e_mm, 0)}`} result={n(d.torsionDispMm, 3)} unit="mm" />
        </>
      )}
    </div>
  );
}

// Lateral stiffness: K = 48EI_y/L³
// K[N/mm] → K[ton/mm] ÷ 9810
// ระยะเสาหน้างาน: ส่วนใหญ่ 5 m แต่มีบางช่วง 10 m (ช่วงประตู/ทางเดิน)
const BEAM_SPAN_MM = 5000;
const COLUMN_SPACINGS = [5000, 10000];
const E_STEEL = 200000; // N/mm²
const G_STEEL = 80000;  // N/mm²
const K_TIEBACK_LONG  = 24.2; // ton/mm — stiff rod to building column (ใช้ทั้ง Long และ Cross Travel)
const RAIL_HEIGHT_MM  = 65;   // SQB 65×65 rail height on top of flange

function calcKbeam(Iy_cm4, spanMM = BEAM_SPAN_MM) {
  const Iy_mm4 = Iy_cm4 * 1e4;
  const K_N_mm = (48 * E_STEEL * Iy_mm4) / (spanMM ** 3);
  return K_N_mm / 9810; // ton/mm
}

// เปรียบเทียบผลของระยะเสา (Long Travel) — ใช้สมการชุดเดียวกับ useEffect หลัก
// คืนค่าการแอ่นข้าง + มุมบิด + หัวรางขยับ ที่ span ที่กำหนด (มี/ไม่มี tie back)
function spanCaseLong(spanMM, sec, sideThrustTon, withTieBack) {
  const F_N     = sideThrustTon * 9810;
  const Iy_mm4  = sec.Iy_cm4 * 1e4;
  const kBeam   = (48 * E_STEEL * Iy_mm4) / (spanMM ** 3) / 9810;          // ton/mm
  const kStiff  = withTieBack ? kBeam + K_TIEBACK_LONG : kBeam;
  const dispMm  = kStiff > 0 ? sideThrustTon / kStiff : 0;                 // mm
  const e_mm    = sec.depth - sec.tf / 2 + RAIL_HEIGHT_MM;
  const T_Nmm   = F_N * e_mm;
  const kTors   = G_STEEL * sec.J_mm4 + 4 * Math.PI ** 2 * E_STEEL * sec.Cw_mm6 / spanMM ** 2;
  const kEqBeam = 4 * kTors / spanMM;                                       // N·mm/rad
  const kTorsTb = withTieBack ? (K_TIEBACK_LONG * 9810) * (sec.depth / 2) ** 2 : 0;
  const phi_rad = T_Nmm / (kEqBeam + kTorsTb);
  return {
    kBeam, kStiff, dispMm,
    phi_deg:  phi_rad * 180 / Math.PI,
    railTopMm: phi_rad * e_mm,   // หัวรางขยับด้านข้าง (mm)
    kEqBeam, kTorsTb,
  };
}

// Tie back anchor designs — governing check is the chemical anchor under reversing tension
// Capacities = combined design tension of the anchor group (cracked concrete ~C25, catalog values)
// กำลังสมอ = ค่าแรงดึงแนะนำจาก catalog Welbond Plus (ค่าอนุรักษ์กว่า Hilti RE 500)
// ปรับตามความลึกฝังจริงแบบเชิงเส้น (bond ∝ hef): M12@110=21.7 kN, M16@125=29.5 kN
// แบบ B ใหม่: พุก M16 ยาว 165/190 มม. แต่ "ฝังลึก 125 มม." (ยืนยันแล้ว) · มี 4 ตัว แต่แรงเยื้องจากหัวราง
// ทำให้คู่บนรับแรงดึงทั้งหมด → 2 × 29.5 = 59 kN
const TIEBACK_ANCHOR_DESIGNS = [
  { name: "แบบ B เดิม",   spec: "L-65×65×6 + PL 6 + stiffener 15 + สมอ 2×M12×100",  cap_kN: 39 },
  { name: "แบบ ST",             spec: "PL 200×12 + stiffener 12 + สมอ 2×M16×125",          cap_kN: 59 },
  { name: "แบบ B ใหม่ ★", spec: "L-75×75×9 + PL 8 + stiffener 15 + สมอ 4×M16 ฝัง 125 (คู่บนรับดึง)", cap_kN: 59 },
];

// Speed-based acceleration (Speed 1=4 m/min, Speed 2=50 m/min) — real crane spec
const SPEED_1_MS = 4  / 60;   // 0.067 m/s
const SPEED_2_MS = 50 / 60;   // 0.833 m/s
const T_SOFT   = 5;            // ramp time soft start (s)
const T_HARD   = 3;            // ramp time hard start (s)
const T_BRAKE  = 2;            // braking time (s)
const G_MS2    = 9.81;

const ACCEL_SOFT  = SPEED_1_MS / T_SOFT  / G_MS2;  // ~0.0051g
const ACCEL_HARD  = SPEED_2_MS / T_HARD  / G_MS2;  // ~0.0170g
const ACCEL_BRAKE = SPEED_2_MS / T_BRAKE / G_MS2;  // ~0.0255g

// ── Cross Travel (trolley วิ่งบนสะพาน) ─────────────────────────────────────
// แรงเฉื่อยของ trolley + ของยก ไปตามแนวสะพาน → ผ่าน end truck ลงไปดัน "รางวิ่ง" ทั้ง 2 ข้างในแนวขวาง
// จึงคิดกับคานรางวิ่ง (BEAM_SECTIONS, ระยะเสา, tie back) ชุดเดียวกับ Long Travel — ไม่ใช่คานสะพาน
const SPEED_1_CROSS_MS   = 5  / 60;    // 5 m/min cross travel Speed 1
const SPEED_2_CROSS_MS   = 20 / 60;    // 20 m/min cross travel Speed 2
const ACCEL_SOFT_CROSS   = SPEED_1_CROSS_MS / T_SOFT  / G_MS2;
const ACCEL_HARD_CROSS   = SPEED_2_CROSS_MS / T_HARD  / G_MS2;
const ACCEL_BRAKE_CROSS  = SPEED_2_CROSS_MS / T_BRAKE / G_MS2;
// แรงขวางรางวิ่งจาก trolley ตามมาตรฐาน (ASCE 7 §4.9.4 / AISC DG7): 20% × (น้ำหนักยก + trolley)
// แบ่งลงรางวิ่ง 2 ข้างเท่ากัน — EN 1991-3 ใช้ 10% (อนุรักษ์น้อยกว่า)
const CROSS_LATERAL_STD = 0.20;
const CROSS_LATERAL_EN  = 0.10;

const CraneLongTravelSim = () => {
  const span = 23.6;
  const craneMass = 20.8;
  const trolleyMass = 2.2;

  const [load, setLoad] = useState(16); // ค่าเริ่มต้น 16 ตัน (พิกัด 25 ตัน)
  const [trolleyPos, setTrolleyPos] = useState(11.8);
  const [hasTieBack, setHasTieBack] = useState(false);
  const [beamKey, setBeamKey] = useState("H500×300");
  const [electrode, setElectrode] = useState("E7016");
  const [dir, setDir] = useState("forward");
  const [accelMode, setAccelMode] = useState(0); // 0=idle, 1=soft, 2=hard, 3=brake
  const [mode, setMode] = useState("long");       // "long" | "cross"
  const [columnSpan, setColumnSpan] = useState(BEAM_SPAN_MM); // ระยะเสา runway (Long Travel)
  const [hasVFD, setHasVFD] = useState(true);    // ค่าเริ่มต้น: มี VFD
  const [brakeHard, setBrakeHard] = useState(false); // E-stop: เบรกกลไก — VFD ช่วยไม่ได้
  const [vfdRamp, setVfdRamp] = useState(3);      // VFD ramp time (s) — ค่าที่ตั้งใช้งานจริง
  const [syncDrive, setSyncDrive] = useState(false); // Synchronized dual-drive

  const [skewFactor,    setSkewFactor]    = useState(0.01);
  const [brakeFromMode, setBrakeFromMode] = useState(2);
  const [openCalcPanel, setOpenCalcPanel] = useState(null); // "thrust"|"bending"|"torsion"|null
  // SQB BAR weld (rail 65×65 → WF top flange)
  const [sqtWeldSize, setSqtWeldSize] = useState(6);
  const [sqtPattern, setSqtPattern] = useState("continuous");
  const [sqtOn, setSqtOn] = useState(50);
  const [sqtGap, setSqtGap] = useState(500);
  const [cyclesPerYear, setCyclesPerYear] = useState(21000);

  // ค่าที่คำนวณได้ทั้งหมด — derive ตรงจาก input (useMemo) ไม่ต้องเก็บเป็น state
  const {
    calcDetails, skewAngle, lateralForce, beamTwist, torsionDisp, twistAngleDeg,
    sqtStress, sqtUtil, sqtFatigueUtil, affectedRail,
  } = useMemo(() => {
    const out = {};
    // ── Mode-dependent parameters ──────────────────────────────────────────
    // ทั้งสองโหมดคิดกับคานรางวิ่งตัวเดียวกัน
    const sections  = BEAM_SECTIONS;
    const bKey      = beamKey;
    const spanMM    = columnSpan;
    // VFD overrides ramp time — both speeds use the same user-set ramp
    // No VFD: star-delta typical T~1.5s (Speed1) and ~1s (Speed2) — aggressive
    const tS1 = hasVFD ? vfdRamp       : (mode === "long" ? T_SOFT  : T_SOFT);
    const tS2 = hasVFD ? vfdRamp       : (mode === "long" ? T_HARD  : T_HARD);
    const tBr = hasVFD ? vfdRamp * 0.8 : T_BRAKE; // VFD braking also softer
    const spd1 = mode === "long" ? SPEED_1_MS       : SPEED_1_CROSS_MS;
    const spd2 = mode === "long" ? SPEED_2_MS       : SPEED_2_CROSS_MS;
    const noVfdT1 = mode === "long" ? 1.5 : 1.0;   // no-VFD reference ramp times
    const noVfdT2 = mode === "long" ? 1.0 : 0.8;
    const aSoft  = hasVFD ? spd1 / tS1 / G_MS2 : (mode === "long" ? spd1/noVfdT1/G_MS2 : spd1/noVfdT1/G_MS2);
    const aHard  = hasVFD ? spd2 / tS2 / G_MS2 : (mode === "long" ? spd2/noVfdT2/G_MS2 : spd2/noVfdT2/G_MS2);
    // Brake deceleration based on which speed was active — not always spd2
    const brakeSpd = brakeFromMode === 1 ? spd1 : spd2;
    // E-stop / ไฟดับ → เบรกกลไก T_BRAKE เสมอ ไม่ว่ามี VFD หรือไม่
    const aBrake = (hasVFD && !brakeHard) ? brakeSpd / tBr / G_MS2 : brakeSpd / T_BRAKE / G_MS2;

    const accel = accelMode === 1 ? aSoft : accelMode === 2 ? aHard : accelMode === 3 ? aBrake : 0;

    // ── Mass distribution ──────────────────────────────────────────────────
    // Long Travel: crane body + trolley + load, asymmetric by trolley position
    // Cross Travel: trolley + load only, symmetric (skew is purely inertia-driven)
    let massLeft, massRight;
    if (mode === "long") {
      const totalLoad = load + trolleyMass;
      massLeft  = craneMass / 2 + (totalLoad * (span - trolleyPos)) / span;
      massRight = craneMass / 2 + (totalLoad * trolleyPos) / span;
    } else {
      const half = (load + trolleyMass) / 2;
      massLeft  = half;
      massRight = half;
    }

    const forceReqL  = massLeft  * accel;
    const forceReqR  = massRight * accel;
    // Synchronized dual-drive (VFD): both ends accelerate together → no inertia difference
    // (same model as CraneSimultaneousSim; gated by hasVFD because the toggle is hidden without VFD)
    const inertiaDiff = (syncDrive && hasVFD) ? 0 : Math.abs(forceReqL - forceReqR);

    const thrustInertia  = inertiaDiff * 1.5;
    const thrustFriction = (accelMode > 0 && mode === "long") ? Math.max(massLeft, massRight) / 2 * 0.05 : 0;
    // Cross Travel: แรงเฉื่อย trolley + ของยก (m × a) ส่งลงรางวิ่ง 2 ข้างทิศเดียวกัน
    // แบ่งตามสัดส่วนน้ำหนักล้อ end truck (แรงส่งผ่านแรงเสียดทาน/บังใบล้อ ∝ น้ำหนักกด) — trolley กลางสะพาน = 50/50
    const wheelL  = craneMass / 2 + (load + trolleyMass) * (span - trolleyPos) / span;
    const wheelR  = craneMass / 2 + (load + trolleyMass) * trolleyPos / span;
    const shareL  = wheelL / (wheelL + wheelR);
    const crossOn = accelMode > 0 && mode === "cross";
    const crossL  = crossOn ? (load + trolleyMass) * accel * shareL : 0;
    const crossR  = crossOn ? (load + trolleyMass) * accel * (1 - shareL) : 0;
    const thrustCrossExtra = Math.max(crossL, crossR);                 // รางที่รับมากกว่า = ใช้ตรวจ
    const thrustSkew     = (accelMode > 0 && mode === "long") ? skewFactor * (craneMass + load + trolleyMass) : 0;
    const sideThrust     = thrustInertia + thrustFriction + thrustCrossExtra + thrustSkew;

    // ── Lateral stiffness + beam displacement (actual, mm) ────────────────
    const sec      = sections[bKey];
    const kBeamFn  = (Iy) => {
      const Iy_mm4   = Iy * 1e4;
      return (48 * E_STEEL * Iy_mm4) / (spanMM ** 3) / 9810;
    };
    const kBeamActual  = kBeamFn(sec.Iy_cm4);
    const kTieBack     = K_TIEBACK_LONG;
    const kStiffness   = hasTieBack ? kBeamActual + kTieBack : kBeamActual;
    const beamDispMm   = sideThrust / kStiffness;  // actual lateral deflection (mm)

    // ── Torsional calculation ──────────────────────────────────────────────
    // Tie-back at top flange adds torsional spring: k_tors_tb = k_tb[N/mm] × h²[mm²]
    // where h = depth/2 (distance from shear center to top flange for doubly-sym I-beam)
    // phi_rad = T / (k_eq_beam + k_tors_tb)
    // k_eq_beam = phiDenom × kTors / spanMM  [N·mm/rad]
    const e_mm  = sec.depth - sec.tf / 2 + RAIL_HEIGHT_MM;
    const T_Nmm = sideThrust * 9810 * e_mm;
    // Long Travel: bottom flange WELDED to column plate → warping restrained both ends
    //   kTors = GJ + 4π²ECw/L²  (fixed-fixed warping)
    // Cross Travel ใช้คานรางวิ่งตัวเดียวกัน → เงื่อนไขปลายเหมือนกัน
    const warpFactor = 4;
    const phiDenom   = 4;
    const kTors      = G_STEEL * sec.J_mm4 + warpFactor * Math.PI ** 2 * E_STEEL * sec.Cw_mm6 / spanMM ** 2;
    const kEqBeam    = phiDenom * kTors / spanMM;                                  // N·mm/rad
    const h_tb       = sec.depth / 2;                                              // mm
    const kTorsTb    = hasTieBack ? (kTieBack * 9810) * h_tb ** 2 : 0;            // N·mm/rad
    const phi_rad    = T_Nmm / (kEqBeam + kTorsTb);
    const phi_deg = phi_rad * (180 / Math.PI);
    const torsionDispMm  = phi_rad * e_mm;
    out.torsionDisp = (torsionDispMm);
    out.twistAngleDeg = (phi_deg);

    // ── SQB BAR weld (65×65 rail → WF top flange) ─────────────────────────
    // Force acts at rail top → moment arm e = RAIL_HEIGHT_MM, bar width b = RAIL_HEIGHT_MM
    // F_M = F × e / b = F × 60/60 = F  →  F_res = F × √2
    const F_sqt_N    = sideThrust * 9810;                   // full side thrust, no tie-back deduction
    const F_M_sqt_N  = F_sqt_N;                             // e = b = 60mm → ratio = 1
    const F_res_sqt  = Math.sqrt(F_sqt_N ** 2 + F_M_sqt_N ** 2);
    const a_sqt      = 0.707 * sqtWeldSize;
    const L_weld_sqt = sqtPattern === "continuous" ? RAIL_HEIGHT_MM : sqtOn;
    const A_sqt      = 2 * L_weld_sqt * a_sqt;
    // Gap prying: bar spans gap as fixed-end beam → moment at weld root
    const gapFactor  = sqtPattern === "continuous" ? 1.0 : Math.sqrt(1 + Math.pow(sqtGap / (8 * RAIL_HEIGHT_MM), 2));
    const tau_sqt    = F_res_sqt * gapFactor / A_sqt;
    const tauFat_sqt = sqtPattern === "continuous" ? 55 : 18;
    out.sqtStress = (tau_sqt);
    out.sqtUtil = (tau_sqt / WELD_ALLOW[electrode] * 100);
    out.sqtFatigueUtil = (tau_sqt / tauFat_sqt * 100);

    // ── Skew sign ──────────────────────────────────────────────────────────
    const dirSign      = dir === "forward" ? 1 : -1;
    const phaseSign    = accelMode === 3 ? -1 : 1;
    // Synchronized dual-drive VFD: both ends run at same speed → no positional asymmetry
    // Trolley อยู่กลางพอดี (massRight = massLeft) → Math.sign = 0 จะทำให้แรงหายทั้งที่ยังมี skew/friction → ใช้ +1
    const massAsymSign = (syncDrive || massRight >= massLeft) ? 1 : -1;
    // Cross Travel: trolley เร่งไปทางขวา → แรงปฏิกิริยาดันสะพานไปทางซ้าย → รางทั้งสองข้างถูกดันไปทางซ้าย (−)
    const skewSign     = mode === "cross" ? -dirSign * phaseSign : dirSign * phaseSign * massAsymSign;

    const signedThrust = skewSign * sideThrust;
    const rawAngle     = mode === "cross" ? 0 : skewSign * sideThrust * 2;   // สะพานไม่หมุนจากการวิ่ง trolley

    out.lateralForce = (signedThrust);
    out.beamTwist = (beamDispMm);
    out.skewAngle = (clamp(rawAngle, -12, 12));

    if (sideThrust < 0.01) {
      out.affectedRail = ("none");
    } else if (mode === "cross") {
      out.affectedRail = ("both");
    } else if (signedThrust > 0) {
      out.affectedRail = ("left");
    } else {
      out.affectedRail = ("right");
    }

    // Store intermediate values for CalcDetailPanelLT
    out.calcDetails = ({
      // acceleration
      // ค่าที่แสดงต้องตรงกับที่ใช้คำนวณ a จริง (ไม่มี VFD ใช้ noVfdT, เบรกใช้ความเร็วก่อนเบรก + tBr/T_BRAKE)
      accelMode, speedMpm: (accelMode === 3 ? brakeSpd : accelMode === 1 ? spd1 : spd2) * 60,
      speedMs: accelMode === 3 ? brakeSpd : accelMode === 1 ? spd1 : spd2,
      ramp: accelMode === 3 ? ((hasVFD && !brakeHard) ? tBr : T_BRAKE)
          : accelMode === 1 ? (hasVFD ? tS1 : noVfdT1)
          : (hasVFD ? tS2 : noVfdT2),
      accelMs2: accel * 9.81, accelG: accel, hasVFD,
      // mass
      load, trolleyMass, craneMass, span, trolleyPos, massLeft, massRight, inertiaDiff,
      // thrust
      thrustInertia, thrustFriction, thrustSkew, thrustCrossExtra, sideThrust, skewFactor,
      crossStd: CROSS_LATERAL_STD * (load + trolleyMass) / 2, crossEN: CROSS_LATERAL_EN * (load + trolleyMass) / 2,
      wheelL, wheelR, shareL, crossL, crossR,
      // lateral bending
      secLabel: bKey, Iy_cm4: sec.Iy_cm4, spanMM, kBeamVal: kBeamActual, kTieBackVal: kTieBack,
      kStiffness, hasTieBack, beamDispMm,
      // torsion
      depth: sec.depth, tf: sec.tf, J_mm4: sec.J_mm4, Cw_mm6: sec.Cw_mm6,
      e_mm, T_Nmm, warpFactor, phiDenom, kTors, kEqBeam, kTorsTb, phi_rad, phi_deg, torsionDispMm,
    });
    return out;
  }, [load, trolleyPos, accelMode, hasTieBack, beamKey, columnSpan, dir, electrode, mode, hasVFD, vfdRamp, syncDrive, sqtWeldSize, sqtPattern, sqtOn, sqtGap, skewFactor, brakeFromMode, brakeHard]);

  const brakeTimer = useRef(null);

  const stopMove = (hard = false) => {
    setBrakeHard(hard);
    setBrakeFromMode(accelMode); // จำว่า brake จาก speed ไหน
    setAccelMode(3);
    if (brakeTimer.current) clearTimeout(brakeTimer.current);
    brakeTimer.current = setTimeout(() => setAccelMode(0), 800);
  };

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(brakeTimer.current), []);

  // Thresholds use actual physical values (beamDispMm no longer 10× exaggerated)
  // Long Travel runway beam: ~L/500 = 5000/500 = 10mm is concern, use 3mm as warning
  // Cross Travel bridge girder: 23600/500 = 47mm, use 25mm as warning
  const isActive = accelMode > 0;

  const phaseLabel =
    accelMode === 0 ? "Idle" :
    accelMode === 3 ? "Braking" : "Accelerating";

  const phaseBadgeColor =
    accelMode === 0 ? { bg: "#eceff1", color: "#78909c" } :
    accelMode === 3 ? { bg: "#fff3e0", color: "#e65100" } :
    { bg: "#e3f2fd", color: "#0277bd" };

  // BITE/DRAG corner positions in SVG based on skew direction and travel direction
  // forward = top of SVG (y≈10), backward = bottom of SVG (y≈140)
  const fwdY = dir === "forward" ? 40 : 115;
  const rearY = dir === "forward" ? 115 : 40;
  const biteLeft = skewAngle > 0; // CW → left-forward bites
  // y ของล้อหน้าที่ BITE หลังหมุนรอบ (200, 80) — ใช้วางลูกศรแรงให้ตรงล้อ
  const biteWheelY = (() => {
    const wx = biteLeft ? 18 : 382, wy = fwdY < 60 ? 64 : 96, t = skewAngle * Math.PI / 180;
    return 80 + (wx - 200) * Math.sin(t) + (wy - 80) * Math.cos(t);
  })();
  const biteX = biteLeft ? 30 : 345;
  const dragX = biteLeft ? 345 : 30;

  const currentSections = BEAM_SECTIONS;
  const currentBKey     = beamKey;
  const sec             = currentSections[currentBKey];
  const e_display       = Math.round(sec.depth - sec.tf / 2 + RAIL_HEIGHT_MM);
  const sqtColor        = sqtUtil < 50 ? "#43a047" : sqtUtil < 80 ? "#fb8c00" : "#e53935";
  // Visual rotation: ขยายมุมบิดจริงด้วยตัวคูณคงที่ (แสดงบนภาพ) ให้ภาพเทียบกันได้ตรงสัดส่วน
  // phi ~0.1° (5 ม.) ถึง ~2.5° (10 ม. ไม่มี tie back) → ×10 · Cross Travel แรงเล็กกว่ามาก ใช้ ×10 เท่ากันเพื่อเทียบกันได้
  // เพดาน 12° กันภาพล้นกรอบ
  const rotScale = 10;
  const ROT_MAX  = 12;
  const dispSign = lateralForce > 0 ? 1 : lateralForce < 0 ? -1 : 0;
  const rotClamped = twistAngleDeg * rotScale > ROT_MAX;
  const rotAngle = dispSign * Math.min(twistAngleDeg * rotScale, ROT_MAX);
  // Cross Travel: รางทั้งสองข้างถูกดันไปทิศเดียวกัน ("both")
  const leftHit        = affectedRail === "left"  || affectedRail === "both";
  const rightHit       = affectedRail === "right" || affectedRail === "both";
  // Cross Travel: รางที่รับแรงน้อยกว่าเอียงน้อยกว่าตามสัดส่วน
  const crossMax       = Math.max(calcDetails.crossL, calcDetails.crossR, 1e-9);
  const leftTilt       = leftHit  ? rotAngle * (affectedRail === "both" ? calcDetails.crossL / crossMax : 1) : 0;
  const rightTilt      = rightHit ? rotAngle * (affectedRail === "both" ? calcDetails.crossR / crossMax : 1) : 0;
  const leftWeldColor  = leftHit  ? sqtColor : "#43a047";
  const rightWeldColor = rightHit ? sqtColor : "#43a047";

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>
        {mode === "long" ? "Long Travel Skew" : "Cross Travel Skew"} — 25 Ton Overhead Crane
      </h2>

      <div style={styles.mainGrid}>
      {/* ═══ LEFT PANEL — Controls ═══ */}
      <div style={styles.leftPanel}>

        {/* Mode Toggle */}
        <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "2px solid #b0bec5", flexShrink: 0 }}>
          {[["long", "▶▶ Long Travel", "Crane along runway"], ["cross", "↔ Cross Travel", "Trolley along bridge"]].map(([m, label, sub]) => (
            <button key={m} type="button" onClick={() => setMode(m)} style={{
              flex: 1, padding: "8px 4px", border: "none", cursor: "pointer",
              fontWeight: "bold", fontSize: 12,
              backgroundColor: mode === m ? "#0277bd" : "#eceff1",
              color: mode === m ? "white" : "#546e7a",
              lineHeight: 1.3,
            }}>
              {label}<br/><span style={{ fontSize: 10, fontWeight: "normal" }}>{sub}</span>
            </button>
          ))}
        </div>

        {/* Load */}
        <div style={styles.inputGroup}>
          <div style={styles.label}>
            <span>Load</span>
            <span>{load} Ton</span>
          </div>
          <input
            aria-label="Load"
            type="range" min="0" max="30" value={load}
            onChange={(e) => setLoad(Number(e.target.value))}
            style={styles.slider}
          />
        </div>

        {/* Trolley Position — Long: กระจาย mass ซ้าย/ขวา · Cross: แบ่งแรง trolley ลง 2 ราง */}
        {(
          <div style={styles.inputGroup}>
            <div style={styles.label}>
              <span>Trolley Position</span>
              <span>{trolleyPos.toFixed(1)} m (from left)</span>
            </div>
            <input
              aria-label="Trolley position"
              type="range" min="1" max={span - 1} step="0.5" value={trolleyPos}
              onChange={(e) => setTrolleyPos(Number(e.target.value))}
              style={styles.slider}
            />
            <div style={{ fontSize: 12, color: "#78909c", display: "flex", justifyContent: "space-between" }}>
              <span>Left Rail: Heavier</span>
              <span>Right Rail: Heavier</span>
            </div>
          </div>
        )}

        {/* Beam Section Selector */}
        <div style={styles.inputGroup}>
          <div style={styles.label}>
            <span>Runway Beam</span>
            <span style={{ color: "#00838f" }}>
              K = {calcKbeam(sec.Iy_cm4, columnSpan).toFixed(4)} ton/mm
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {Object.keys(currentSections).map((key) => {
              const active = currentBKey === key;
              return (
                <button key={key} type="button"
                  onClick={() => setBeamKey(key)}
                  style={{
                    flex: 1, padding: "8px 6px", borderRadius: 8, border: "2px solid",
                    cursor: "pointer", fontWeight: "bold", fontSize: 12,
                    borderColor: active ? "#00838f" : "#b0bec5",
                    backgroundColor: active ? "#e0f2f1" : "#f5f5f5",
                    color: active ? "#00695c" : "#546e7a",
                  }}
                >
                  {key}
                  <div style={{ fontSize: 10, fontWeight: "normal", marginTop: 2 }}>
                    I_y = {currentSections[key].Iy_cm4.toLocaleString()} cm⁴
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: "#78909c", marginTop: 2 }}>
            {`Span ${columnSpan/1000}m runway`}
          </div>
        </div>

        {/* Column spacing — Long Travel only */}
        {mode === "long" && (
          <div style={styles.inputGroup}>
            <div style={styles.label}>
              <span>ระยะเสา (Column Spacing)</span>
              <span>{columnSpan/1000} m</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {COLUMN_SPACINGS.map(sp => (
                <button key={sp} onClick={() => setColumnSpan(sp)}
                  style={{ flex: 1, padding: "8px 4px", borderRadius: 6, border: "1px solid #b0bec5", cursor: "pointer",
                    fontSize: 13, fontWeight: "bold",
                    backgroundColor: columnSpan === sp ? "#00838f" : "#f5f5f5",
                    color: columnSpan === sp ? "white" : "#546e7a" }}>
                  {sp/1000} m
                  <div style={{ fontSize: 10, fontWeight: "normal", marginTop: 2 }}>
                    {sp === 5000 ? "ช่วงปกติ" : "ช่วงประตู/ทางเดิน"}
                  </div>
                </button>
              ))}
            </div>
            {columnSpan === 10000 && (
              <div style={{ fontSize: 11, color: "#e65100", marginTop: 4 }}>
                ⚠ ช่วงยาว 2 เท่า → แอ่นข้างมากขึ้น 8 เท่า (L³) · บิดมากขึ้น ~6.6 เท่า ถ้าไม่มี tie back
              </div>
            )}

            {/* แผงเทียบระยะเสา 5 vs 10 ม. — การบิด/แอ่น (ใช้ side thrust ปัจจุบัน) */}
            {(() => {
              const st = calcDetails?.sideThrust ?? 0;   // ton
              const running = st > 0.01;
              const c5  = spanCaseLong(5000,  sec, st, false);
              const c10 = spanCaseLong(10000, sec, st, false);
              const t5  = spanCaseLong(5000,  sec, st, true);
              const t10 = spanCaseLong(10000, sec, st, true);
              const lim5 = 5000 / 400, lim10 = 10000 / 400;   // เกณฑ์ L/400 (mm)
              const cell = { padding: "4px 6px", textAlign: "right", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" };
              const head = { padding: "4px 6px", textAlign: "right", fontSize: 10, color: "#90a4ae", fontWeight: 700 };
              const lab  = { padding: "4px 6px", textAlign: "left", fontSize: 11, color: "#546e7a" };
              const dispCol = (v, lim) => v > lim ? "#c62828" : "#37474f";
              return (
                <div style={{ marginTop: 10, padding: "8px 10px", backgroundColor: "#f5f5f5", borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: "bold", color: "#546e7a", marginBottom: 2 }}>
                    📊 เปรียบเทียบระยะเสา — การบิด/แอ่นของคาน
                  </div>
                  <div style={{ fontSize: 10, color: "#90a4ae", marginBottom: 6 }}>
                    {running
                      ? `ที่ side thrust ${st.toFixed(2)} ตัน · คาน ${currentBKey}`
                      : "กดเดินเครนเพื่อดูค่าการบิด/แอ่น (ค่าความแข็งด้านล่างไม่ขึ้นกับแรง)"}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr>
                        <th style={{ ...head, textAlign: "left" }}></th>
                        <th style={head}>5 ม.</th>
                        <th style={head}>10 ม.</th>
                        <th style={head}>ต่าง</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={lab}>k ด้านข้าง (ตัน/มม.)</td>
                        <td style={cell}>{c5.kBeam.toFixed(3)}</td>
                        <td style={cell}>{c10.kBeam.toFixed(3)}</td>
                        <td style={{ ...cell, color: "#c62828", fontWeight: 700 }}>÷{(c5.kBeam / c10.kBeam).toFixed(1)}</td>
                      </tr>
                      {running && <>
                        <tr style={{ borderTop: "1px solid #e0e0e0" }}>
                          <td style={{ ...lab, fontWeight: 700, color: "#c62828" }} colSpan={4}>ไม่มี TIE BACK</td>
                        </tr>
                        <tr>
                          <td style={lab}>แอ่นข้าง (มม.)</td>
                          <td style={{ ...cell, color: dispCol(c5.dispMm, lim5) }}>{c5.dispMm.toFixed(1)}</td>
                          <td style={{ ...cell, color: dispCol(c10.dispMm, lim10), fontWeight: 700 }}>{c10.dispMm.toFixed(1)}</td>
                          <td style={cell}>×{(c10.dispMm / c5.dispMm).toFixed(1)}</td>
                        </tr>
                        <tr>
                          <td style={lab}>มุมบิด (°)</td>
                          <td style={cell}>{c5.phi_deg.toFixed(2)}</td>
                          <td style={{ ...cell, fontWeight: 700 }}>{c10.phi_deg.toFixed(2)}</td>
                          <td style={cell}>×{(c10.phi_deg / c5.phi_deg).toFixed(1)}</td>
                        </tr>
                        <tr>
                          <td style={lab}>หัวรางขยับ (มม.)</td>
                          <td style={cell}>{c5.railTopMm.toFixed(1)}</td>
                          <td style={{ ...cell, fontWeight: 700 }}>{c10.railTopMm.toFixed(1)}</td>
                          <td style={cell}>×{(c10.railTopMm / c5.railTopMm).toFixed(1)}</td>
                        </tr>
                        <tr style={{ borderTop: "1px solid #e0e0e0" }}>
                          <td style={{ ...lab, fontWeight: 700, color: "#2e7d32" }} colSpan={4}>มี TIE BACK</td>
                        </tr>
                        <tr>
                          <td style={lab}>แอ่นข้าง (มม.)</td>
                          <td style={{ ...cell, color: "#2e7d32" }}>{t5.dispMm.toFixed(2)}</td>
                          <td style={{ ...cell, color: "#2e7d32" }}>{t10.dispMm.toFixed(2)}</td>
                          <td style={cell}>≈เท่ากัน</td>
                        </tr>
                        <tr>
                          <td style={lab}>มุมบิด (°)</td>
                          <td style={{ ...cell, color: "#2e7d32" }}>{t5.phi_deg.toFixed(3)}</td>
                          <td style={{ ...cell, color: "#2e7d32" }}>{t10.phi_deg.toFixed(3)}</td>
                          <td style={cell}>≈เท่ากัน</td>
                        </tr>
                      </>}
                    </tbody>
                  </table>
                  {running && (
                    <div style={{ fontSize: 10, color: "#90a4ae", marginTop: 6, lineHeight: 1.5 }}>
                      เกณฑ์แอ่นข้าง L/400: 5 ม.=12.5 · 10 ม.=25 มม.
                      {c10.dispMm > lim10 && <span style={{ color: "#c62828", fontWeight: 700 }}> · ช่วง 10 ม. เกินเกณฑ์ (แดง)</span>}
                      <br/>TIE BACK ลดการบิดที่ 10 ม. ได้ ×{(c10.phi_deg / t10.phi_deg).toFixed(0)} (ที่ 5 ม. ได้ ×{(c5.phi_deg / t5.phi_deg).toFixed(0)}) — ยิ่งช่วงยาวยิ่งได้ผล
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Tie Back */}
        <div style={styles.inputGroup}>
          <div style={styles.label}>
            <span>Tie Back Status</span>
            <span>{hasTieBack ? "Locked" : "Unlocked"}</span>
          </div>
          <button
            type="button"
            onClick={() => setHasTieBack((v) => !v)}
            style={{
              padding: 10, borderRadius: 5, border: "none", cursor: "pointer",
              backgroundColor: hasTieBack ? "#66bb6a" : "#ef5350",
              color: "white", fontWeight: "bold", userSelect: "none",
            }}
          >
            {hasTieBack ? "Installed (Safer)" : "Not Installed (Risky)"}
          </button>
          {hasTieBack && (() => {
            const cur_kN  = Math.abs(lateralForce) * 9.81;          // แรงดึงในแขน tie = side thrust ตอนนี้
            const long_kN = mode === "long" ? cur_kN : 0;           // โหมด Cross ไม่มีแรง long travel
            // Cross Travel: trolley เร่ง/เบรก → แรงเฉื่อยขวางรางวิ่ง แบ่ง 2 ข้าง (กรณีเร็วสุด ไม่ขึ้นกับปุ่ม)
            // มี VFD: เบรก VFD (ramp×0.8) หรือ E-stop เบรกกลไก T_BRAKE — เอาค่ามาก · ไม่มี VFD: ramp 0.8 วิ
            const aCross = hasVFD
              ? Math.max(SPEED_2_CROSS_MS / (vfdRamp * 0.8), SPEED_2_CROSS_MS / T_BRAKE)
              : SPEED_2_CROSS_MS / 0.8;                                            // m/s²
            const crossMass  = load + trolleyMass;                                 // ton
            const crossReal_kN = crossMass * aCross * Math.max(calcDetails.shareL, 1 - calcDetails.shareL); // ton·m/s² = kN · รางที่รับมาก
            const crossStd_kN  = CROSS_LATERAL_STD * crossMass * G_MS2 / 2;
            // เดินเครน + วิ่ง trolley พร้อมกัน (ใช้งานจริง) เทียบกับค่ามาตรฐาน cross travel — เอาค่ามาก
            const combo_kN  = long_kN + crossReal_kN;
            const demand_kN = Math.max(combo_kN, crossStd_kN);
            const govStd    = crossStd_kN >= combo_kN;
            return (
              <div style={{ marginTop: 8, padding: "8px 10px", backgroundColor: "#f5f5f5", borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: "bold", color: "#546e7a", marginBottom: 4 }}>
                  การยึด TIE BACK — จุดชี้ขาดคือสมอเคมีรับแรงดึงสลับทิศ
                </div>
                <div style={{ fontSize: 11, color: "#78909c", marginBottom: 4 }}>
                  {mode === "long" ? "แรงดึงในแขนจาก Long Travel" : "แรงจาก Trolley (Cross Travel) ตอนนี้"}:{" "}
                  <strong style={{ color: "#37474f" }}>{cur_kN.toFixed(1)} kN</strong>
                  {cur_kN < 0.5 && (mode === "long" ? " — กดปุ่มเดินเครนเพื่อดูแรง" : " — กดปุ่มวิ่ง trolley เพื่อดูแรง")}
                </div>
                <div style={{ fontSize: 11, color: "#78909c", marginBottom: 4, lineHeight: 1.5 }}>
                  + Trolley วิ่งขวาง (Cross Travel) ต่อรางหนึ่งข้าง:
                  ใช้งานจริง <strong style={{ color: "#37474f" }}>{crossReal_kN.toFixed(1)} kN</strong>
                  {" · "}มาตรฐาน 20% <strong style={{ color: "#37474f" }}>{crossStd_kN.toFixed(1)} kN</strong>
                  <br/>แรงที่ใช้ตรวจ = max(เดินเครน+trolley พร้อมกัน {combo_kN.toFixed(1)}, มาตรฐาน {crossStd_kN.toFixed(1)}) ={" "}
                  <strong style={{ color: "#37474f" }}>{demand_kN.toFixed(1)} kN</strong>
                  {govStd ? " (ค่ามาตรฐาน cross travel คุม)" : " (ใช้งานจริงคุม)"}
                </div>
                {TIEBACK_ANCHOR_DESIGNS.map(d => {
                  const sf = demand_kN > 0.5 ? d.cap_kN / demand_kN : null;
                  const col = sf === null ? "#90a4ae" : sf >= 2 ? "#2e7d32" : sf >= 1.5 ? "#e65100" : "#c62828";
                  const status = sf === null ? "—" : `SF ${sf.toFixed(1)}${sf >= 2 ? " ✓" : sf >= 1.5 ? " △ คับ" : " ✗ ไม่พอ"}`;
                  return (
                    <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "4px 0", borderTop: "1px solid #eceff1" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: "bold", color: "#37474f" }}>{d.name}</div>
                        <div style={{ fontSize: 10, color: "#90a4ae" }}>{d.spec} · รับได้ ~{d.cap_kN} kN</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: "900", color: col, whiteSpace: "nowrap" }}>{status}</div>
                    </div>
                  );
                })}
                <div style={{ fontSize: 10, color: "#90a4ae", marginTop: 4 }}>
                  เกณฑ์แนะนำ SF ≥ 2 สำหรับแรงล้าสลับทิศ · กำลังสมออ้าง catalog Welbond Plus ปรับตามความลึกฝังจริง
                  (Hilti RE 500 สูงกว่า ~11%) · ลอง Speed 2 + E-STOP + ยกหนัก เพื่อดูกรณีร้ายสุด
                </div>
              </div>
            );
          })()}
        </div>
      </div>{/* end leftPanel */}

      {/* ═══ MIDDLE PANEL — Weld & Drive Settings ═══ */}
      <div style={styles.middlePanel}>

        {/* SQB BAR Weld Settings */}
        <div style={styles.inputGroup}>
          <div style={styles.label}><span>SQB BAR Weld (65×65 Rail → Top Flange)</span></div>
          <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#78909c", marginBottom: 4 }}>Weld Size</div>
              <select value={sqtWeldSize} onChange={e => setSqtWeldSize(Number(e.target.value))}
                style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #b0bec5", fontSize: 14 }}>
                {[4, 5, 6, 8].map(s => <option key={s} value={s}>{s} mm</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#78909c", marginBottom: 4 }}>Electrode</div>
              <select
                value={electrode}
                onChange={(e) => setElectrode(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #b0bec5", fontSize: 14 }}
              >
                <option value="E6013">E6013 (τ=126 MPa)</option>
                <option value="E7016">E7016 (τ=144 MPa)</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["continuous", "intermittent"].map(p => (
              <button key={p} onClick={() => setSqtPattern(p)}
                style={{ flex: 1, padding: "7px 4px", borderRadius: 6, border: "1px solid #b0bec5", cursor: "pointer", fontSize: 12, fontWeight: "bold",
                  backgroundColor: sqtPattern === p ? "#e65100" : "#f5f5f5",
                  color: sqtPattern === p ? "white" : "#546e7a" }}>
                {p === "continuous" ? "Continuous" : "Intermittent"}
              </button>
            ))}
          </div>
          {sqtPattern === "intermittent" && (
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#78909c", marginBottom: 2 }}>ระยะเชื่อม (mm)</div>
                <select value={sqtOn} onChange={e => setSqtOn(Number(e.target.value))}
                  style={{ width: "100%", padding: "6px", borderRadius: 6, border: "1px solid #b0bec5", fontSize: 13 }}>
                  {[25, 40, 50, 75, 100].map(v => <option key={v} value={v}>{v} mm</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#78909c", marginBottom: 2 }}>ระยะเว้น (mm)</div>
                <select value={sqtGap} onChange={e => setSqtGap(Number(e.target.value))}
                  style={{ width: "100%", padding: "6px", borderRadius: 6, border: "1px solid #b0bec5", fontSize: 13 }}>
                  {[100, 150, 200, 250, 300, 400, 500].map(v => <option key={v} value={v}>{v} mm</option>)}
                </select>
              </div>
            </div>
          )}
          {sqtPattern === "intermittent" && (
            <div style={{ fontSize: 11, color: "#e65100", marginTop: 4 }}>
              เชื่อม {sqtOn} เว้น {sqtGap} mm · pitch {sqtOn + sqtGap} mm · Cat.E · τ_fat = 18 MPa
            </div>
          )}
          {/* Cycles per year */}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#78909c", marginBottom: 4 }}>
              <span>Crane starts/year (cycles)</span>
              <span style={{ fontWeight: "bold", color: "#37474f" }}>{cyclesPerYear.toLocaleString()}</span>
            </div>
            <input type="range" min="1000" max="100000" step="1000"
              value={cyclesPerYear} onChange={e => setCyclesPerYear(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#37474f" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#b0bec5" }}>
              <span>1,000 (เบา)</span><span>15,000 (ปกติ)</span><span>100,000 (หนัก)</span>
            </div>
          </div>
        </div>

        {/* Direction + Action buttons */}
        <div style={{ textAlign: "center" }}>
          {/* Direction selector */}
          <div style={{ fontWeight: "bold", color: "#546e7a", fontSize: 13, marginBottom: 8 }}>
            Direction of Travel
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 16 }}>
            <button type="button" onClick={() => setDir("forward")} style={{
              ...styles.dirBtn,
              backgroundColor: dir === "forward" ? "#0288d1" : "#eceff1",
              color: dir === "forward" ? "white" : "#546e7a",
              borderColor: dir === "forward" ? "#0288d1" : "#b0bec5",
            }}>
              {mode === "long" ? "▶ Forward" : "▶ Right"}
            </button>
            <button type="button" onClick={() => setDir("backward")} style={{
              ...styles.dirBtn,
              backgroundColor: dir === "backward" ? "#0288d1" : "#eceff1",
              color: dir === "backward" ? "white" : "#546e7a",
              borderColor: dir === "backward" ? "#0288d1" : "#b0bec5",
            }}>
              {mode === "long" ? "◀ Backward" : "◀ Left"}
            </button>
          </div>

          {/* VFD / Inverter Control */}
          <div style={{ borderTop: "1px solid #eceff1", paddingTop: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: "bold", fontSize: 13, color: "#37474f" }}>Inverter (VFD)</span>
              <button type="button" onClick={() => setHasVFD(v => !v)} style={{
                padding: "4px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                fontWeight: "bold", fontSize: 12,
                backgroundColor: hasVFD ? "#00838f" : "#b0bec5",
                color: "white",
              }}>
                {hasVFD ? "ON" : "OFF"}
              </button>
            </div>
            {hasVFD && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#546e7a" }}>
                  <span>Ramp Time</span>
                  <span style={{ fontWeight: "bold", color: "#00838f" }}>{vfdRamp} s</span>
                </div>
                <input type="range" min="2" max="20" step="1" value={vfdRamp}
                  onChange={e => setVfdRamp(Number(e.target.value))}
                  style={styles.slider}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#90a4ae" }}>
                  <span>2s (aggressive)</span><span>10s</span><span>20s (gentle)</span>
                </div>
                {/* Sync drive only applies to Long Travel (2 end-truck motors) */}
                {mode === "long" && (
                  <button type="button" onClick={() => setSyncDrive(v => !v)} style={{
                    padding: "5px 10px", borderRadius: 6, border: `2px solid ${syncDrive ? "#43a047" : "#b0bec5"}`,
                    cursor: "pointer", fontWeight: "bold", fontSize: 11,
                    backgroundColor: syncDrive ? "#e8f5e9" : "#f5f5f5",
                    color: syncDrive ? "#2e7d32" : "#546e7a",
                  }}>
                    {syncDrive ? "✓ Synchronized Dual Drive" : "Single Drive (no sync)"}
                  </button>
                )}
                {mode === "cross" && (
                  <div style={{ fontSize: 11, color: "#78909c", fontStyle: "italic" }}>
                    Single motor (trolley) — ramp time controls accel only
                  </div>
                )}
              </div>
            )}
            {!hasVFD && (
              <div style={{ fontSize: 11, color: "#ef5350", backgroundColor: "#fff3e0", padding: "4px 8px", borderRadius: 6 }}>
                No VFD — Star-Delta start: T ≈ 1–1.5s (high accel)
              </div>
            )}
          </div>

          {/* Geometric Skew — Long Travel only */}
          {mode === "long" && (
            <div style={{ padding: "8px 10px", borderRadius: 8, backgroundColor: "#fff3e0", border: "1px solid #ffe0b2", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: "bold", color: "#e65100", marginBottom: 3 }}>
                <span>Geometric Skew α <span style={{ fontWeight: "normal", color: "#78909c" }}>(ความเบี้ยวราง)</span></span>
                <span>{(skewFactor * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min="0" max="0.15" step="0.01" value={skewFactor}
                onChange={e => setSkewFactor(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#e65100", height: "6px", cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#b0bec5", marginTop: 2 }}>
                <span>0% ราบเรียบ</span><span>15% เบี้ยวมาก</span>
              </div>
            </div>
          )}

          <div style={{ fontWeight: "bold", color: "#37474f", marginBottom: 10 }}>
            กดเพื่อเลือกความเร็ว · กด STOP เพื่อหยุด
          </div>
          <div style={styles.btnGroup}>
            <button
              type="button"
              onClick={() => setAccelMode(v => v === 1 ? 0 : 1)}
              style={{ ...styles.btn, backgroundColor: accelMode === 1 ? "#0277bd" : "#29b6f6",
                boxShadow: accelMode === 1 ? "0 0 0 3px #81d4fa" : "0 3px 0 rgba(0,0,0,0.1)" }}
            >
              {mode === "long" ? "Speed 1\n4 m/min" : "Speed 1\n5 m/min"}
            </button>
            <button
              type="button"
              onClick={() => setAccelMode(v => v === 2 ? 0 : 2)}
              style={{ ...styles.btn, backgroundColor: accelMode === 2 ? "#b71c1c" : "#ef5350",
                boxShadow: accelMode === 2 ? "0 0 0 3px #ffcdd2" : "0 3px 0 rgba(0,0,0,0.1)" }}
            >
              {mode === "long" ? "Speed 2\n50 m/min" : "Speed 2\n20 m/min"}
            </button>
          </div>
          {accelMode > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => stopMove(false)}
                style={{ ...styles.btn, backgroundColor: accelMode === 3 ? "#37474f" : "#c62828",
                  flex: 1, fontSize: 15, letterSpacing: 1 }}
              >
                {accelMode === 3 ? "⬛ Braking..." : "⏹ STOP"}
              </button>
              {accelMode !== 3 && (
                <button
                  type="button"
                  onClick={() => stopMove(true)}
                  title="เบรกกลไก 2 วิ — จำลอง E-stop/ไฟดับ ที่ VFD ช่วยไม่ได้"
                  style={{ ...styles.btn, backgroundColor: "#7f0000",
                    flex: 1, fontSize: 15, letterSpacing: 1 }}
                >
                  🚨 E-STOP
                </button>
              )}
            </div>
          )}
        </div>
      </div>{/* end middlePanel */}

      {/* ═══ RIGHT PANEL — Visualizations ═══ */}
      <div style={styles.rightPanel}>

      {/* Alerts — always rendered to prevent layout jump */}
      {(mode === "long" && isActive && Math.abs(trolleyPos - span / 2) > 5) ? (
        <div style={styles.skewAlert}>⚠ Warning: Unbalanced load — skew and flange grinding likely.</div>
      ) : (
        <div style={{ ...styles.skewAlert, backgroundColor: "#e8f5e9", color: "#388e3c", border: "1px solid #c8e6c9" }}>
          ✓ {mode === "long" ? "OK — Load balanced" : "Cross Travel — แรง trolley ดันรางวิ่งทั้งสองข้างไปทิศเดียวกัน"}
        </div>
      )}

        {/* 3-card row: End Truck | Welded Base | Data Panel */}
        <div style={styles.vizRow}>

        {/* Combined Left + Right Support View */}
        <div style={styles.card}>
          <div style={{ fontWeight: "bold", color: "#37474f", marginBottom: 6, fontSize: 13, width: "100%", display: "flex", justifyContent: "space-between" }}>
            <span>Welded Base — Left & Right Runway</span>
            <span style={{ fontSize: 11, color: "#78909c" }}>{currentBKey} · e={e_display}mm</span>
          </div>
          <svg width="420" height="280" viewBox="0 0 420 280" style={{display:"block", flexShrink:0}}>
            <defs>
              <marker id="arr-thrust" markerWidth="7" markerHeight="5" refX="0" refY="2.5" orient="auto">
                <polygon points="0 0,7 2.5,0 5" fill="#c62828"/>
              </marker>
            </defs>

            {/* ── Reusable support template via <g transform="translate(cx,0)"> ── */}
            {/* LEFT SUPPORT — cx=90 */}
            {(() => {
              const cx = 90; const tilt = leftTilt; const wc = leftWeldColor;
              const ry = 205; // y of bottom of bottom flange (pivot)
              return (
                <g transform={`translate(${cx},0)`}>
                  {/* Column */}
                  <rect x="-32" y="218" width="64" height="58" fill="#90a4ae" rx="3"/>
                  <text x="0" y="253" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">L-COL</text>
                  {/* Bearing plate */}
                  <rect x="-50" y="205" width="100" height="13" fill="#546e7a" rx="2"/>
                  {/* Fillet welds at base — neutral grey (base weld not being checked) */}
                  <polygon points={`-50,205 -32,205 -50,191`} fill="#546e7a" opacity="0.95"/>
                  <polygon points={`50,205 32,205 50,191`}     fill="#546e7a" opacity="0.95"/>
                  {/* STATIC: Bottom flange */}
                  <rect x="-52" y="191" width="104" height="14" fill="#37474f" rx="2"/>
                  <text x="0" y="201" textAnchor="middle" fill="#cfd8dc" fontSize="6">WELDED</text>
                  {/* ตำแหน่งเดิมก่อนบิด — เส้นประอ้างอิง */}
                  {tilt !== 0 && <line x1="0" y1="12" x2="0" y2="191" stroke="#90a4ae" strokeWidth="1" strokeDasharray="4,3"/>}
                  {/* DYNAMIC: rotate about (0, ry) */}
                  <g transform={`rotate(${tilt}, 0, ${ry})`} style={{ transition: "transform 0.3s ease-out" }}>
                    <rect x="-8" y="70" width="16" height="121" fill="#546e7a"/>
                    <rect x="-52" y="57" width="104" height="13" fill="#37474f" rx="2"/>
                    {/* SQB BAR weld — colored by utilization (จุดที่ตรวจสอบจริง) */}
                    <rect x="-52" y="54" width="104" height="5" fill={wc} rx="1"/>
                    {leftHit && sqtUtil > 0 && (
                      <text x="0" y="52" textAnchor="middle" fill={wc} fontSize="7" fontWeight="bold">{sqtUtil.toFixed(0)}%</text>
                    )}
                    <rect x="-18" y="33" width="36" height="24" fill="#e65100" rx="2"/>
                    <text x="0" y="48" textAnchor="middle" fill="white" fontSize="7">RAIL</text>
                    <ellipse cx="0" cy="20" rx="22" ry="9" fill="#b0bec5" stroke="#78909c" strokeWidth="2"/>
                    {hasTieBack && <line x1="-100" y1="63" x2="-52" y2="63" stroke="#43a047" strokeWidth="4"/>}
                  </g>
                  {/* Side thrust arrow (when left rail affected) */}
                  {isActive && leftHit && (
                    <line x1={dispSign > 0 ? -75 : 75} y1="26" x2={dispSign > 0 ? -52 : 52} y2="26" stroke="#c62828" strokeWidth="2.5" markerEnd="url(#arr-thrust)"/>
                  )}
                  {/* Displacement label */}
                  {isActive && leftHit && torsionDisp > 0.05 && (
                    <text x={tilt > 0 ? 30 : -30} y="15" fill="#e91e63" fontSize="9" fontWeight="bold">{torsionDisp.toFixed(2)}mm</text>
                  )}
                </g>
              );
            })()}

            {/* SPAN LINE */}
            <line x1="142" y1="26" x2="278" y2="26" stroke="#b0bec5" strokeWidth="1.5" strokeDasharray="6,3"/>
            <text x="210" y="22" textAnchor="middle" fill="#90a4ae" fontSize="9">
              {`SPAN ${columnSpan/1000}m runway`}
            </text>

            {/* RIGHT SUPPORT — cx=330 */}
            {(() => {
              const cx = 330; const tilt = rightTilt; const wc = rightWeldColor;
              const ry = 205;
              return (
                <g transform={`translate(${cx},0)`}>
                  <rect x="-32" y="218" width="64" height="58" fill="#90a4ae" rx="3"/>
                  <text x="0" y="253" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">R-COL</text>
                  <rect x="-50" y="205" width="100" height="13" fill="#546e7a" rx="2"/>
                  <polygon points={`-50,205 -32,205 -50,191`} fill="#546e7a" opacity="0.95"/>
                  <polygon points={`50,205 32,205 50,191`}     fill="#546e7a" opacity="0.95"/>
                  <rect x="-52" y="191" width="104" height="14" fill="#37474f" rx="2"/>
                  <text x="0" y="201" textAnchor="middle" fill="#cfd8dc" fontSize="6">WELDED</text>
                  {tilt !== 0 && <line x1="0" y1="12" x2="0" y2="191" stroke="#90a4ae" strokeWidth="1" strokeDasharray="4,3"/>}
                  <g transform={`rotate(${tilt}, 0, ${ry})`} style={{ transition: "transform 0.3s ease-out" }}>
                    <rect x="-8" y="70" width="16" height="121" fill="#546e7a"/>
                    <rect x="-52" y="57" width="104" height="13" fill="#37474f" rx="2"/>
                    {/* SQB BAR weld — colored by utilization */}
                    <rect x="-52" y="54" width="104" height="5" fill={wc} rx="1"/>
                    {rightHit && sqtUtil > 0 && (
                      <text x="0" y="52" textAnchor="middle" fill={wc} fontSize="7" fontWeight="bold">{sqtUtil.toFixed(0)}%</text>
                    )}
                    <rect x="-18" y="33" width="36" height="24" fill="#e65100" rx="2"/>
                    <text x="0" y="48" textAnchor="middle" fill="white" fontSize="7">RAIL</text>
                    <ellipse cx="0" cy="20" rx="22" ry="9" fill="#b0bec5" stroke="#78909c" strokeWidth="2"/>
                    {hasTieBack && <line x1="52" y1="63" x2="100" y2="63" stroke="#43a047" strokeWidth="4"/>}
                  </g>
                  {isActive && rightHit && (
                    <line x1={dispSign > 0 ? -75 : 75} y1="26" x2={dispSign > 0 ? -52 : 52} y2="26" stroke="#c62828" strokeWidth="2.5" markerEnd="url(#arr-thrust)"/>
                  )}
                  {isActive && rightHit && torsionDisp > 0.05 && (
                    <text x={tilt > 0 ? 30 : -30} y="15" fill="#e91e63" fontSize="9" fontWeight="bold">{torsionDisp.toFixed(2)}mm</text>
                  )}
                </g>
              );
            })()}

            {/* Ground line */}
            <line x1="30" y1="276" x2="390" y2="276" stroke="#90a4ae" strokeWidth="2"/>
          </svg>
          <div style={{ fontSize: 11, color: "#78909c" }}>
            {mode === "long"
              ? "Affected runway rail tilts inward · Weld % = utilization"
              : "Both runway rails pushed the same way · Weld % = utilization"}
            {isActive && (
              <div style={{ fontWeight: "bold", color: "#e65100" }}>
                ภาพขยายมุมบิด ×{rotScale}{rotClamped ? ` (ชนเพดาน ${ROT_MAX}°)` : ""} · φ จริง = {twistAngleDeg.toFixed(3)}°
              </div>
            )}
          </div>
        </div>

        {/* Data Panel */}
        <div style={styles.card}>
          {/* Side Thrust */}
          <div style={{ width: "100%", marginBottom: 4, cursor: "pointer" }}
            onClick={() => setOpenCalcPanel(v => v === "thrust" ? null : "thrust")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "#78909c" }}>Side Thrust</div>
              <span style={{ fontSize: 11, color: "#90a4ae" }}>{openCalcPanel === "thrust" ? "▲" : "▼"} คำนวณ</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: "900", color: "#c62828" }}>
              {Math.abs(lateralForce).toFixed(2)}
              <span style={{ fontSize: 15 }}> ton</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: "700", color: "#e53935" }}>
              = {(Math.abs(lateralForce) * 9.81).toFixed(2)}
              <span style={{ fontSize: 12, fontWeight: "normal", color: "#90a4ae" }}> kN</span>
              <span style={{ fontSize: 11, color: "#b0bec5", marginLeft: 8 }}>
                ({(Math.abs(lateralForce) * 9810).toFixed(0)} N)
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#90a4ae" }}>
              {affectedRail === "left" ? "← Left rail (bites inward)" : affectedRail === "right" ? "→ Right rail (bites inward)"
                : affectedRail === "both" ? `ต่อราง · ทั้ง 2 รางถูกดันไปทาง${lateralForce < 0 ? "ซ้าย ←" : "ขวา →"}` : "—"}
            </div>
            {/* VFD badge */}
            <div style={{ marginTop: 4, fontSize: 11, fontWeight: "bold",
              color: hasVFD ? "#00838f" : "#ef5350",
              backgroundColor: hasVFD ? "#e0f2f1" : "#fff3e0",
              padding: "2px 8px", borderRadius: 4, display: "inline-block" }}>
              {hasVFD
                ? `VFD ON · Ramp ${vfdRamp}s${syncDrive ? " · Sync" : ""}`
                : "No VFD · Star-Delta T≈1–1.5s"}
            </div>
          </div>
          {openCalcPanel === "thrust" && <CalcDetailPanelLT section="thrust" d={calcDetails} mode={mode} />}

          {/* Lateral Bending */}
          <div style={{ width: "100%", marginBottom: 4, padding: "8px 10px", backgroundColor: "#f5f5f5", borderRadius: 8, cursor: "pointer" }}
            onClick={() => setOpenCalcPanel(v => v === "bending" ? null : "bending")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, color: "#78909c" }}>Lateral Bending (Beam)</div>
              <span style={{ fontSize: 11, color: "#90a4ae" }}>{openCalcPanel === "bending" ? "▲" : "▼"} คำนวณ</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: "800", color: "#1565c0" }}>
              {beamTwist.toFixed(2)}
              <span style={{ fontSize: 13 }}> mm</span>
            </div>
          </div>
          {openCalcPanel === "bending" && <CalcDetailPanelLT section="bending" d={calcDetails} mode={mode} />}

          {/* Torsion */}
          <div style={{ width: "100%", marginBottom: 4, padding: "8px 10px", backgroundColor: "#fff3e0", borderRadius: 8, cursor: "pointer" }}
            onClick={() => setOpenCalcPanel(v => v === "torsion" ? null : "torsion")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, color: "#78909c" }}>
                Torsion at Rail Top — Welded Base (4π²)
                <span style={{ marginLeft: 6, color: "#e65100" }}>e = {e_display} mm</span>
              </div>
              <span style={{ fontSize: 11, color: "#90a4ae" }}>{openCalcPanel === "torsion" ? "▲" : "▼"} คำนวณ</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: "800", color: "#e65100" }}>
              {torsionDisp.toFixed(2)}
              <span style={{ fontSize: 13 }}> mm</span>
              <span style={{ fontSize: 13, color: "#90a4ae", marginLeft: 8 }}>
                φ = {twistAngleDeg.toFixed(3)}°
              </span>
            </div>
          </div>
          {openCalcPanel === "torsion" && <CalcDetailPanelLT section="torsion" d={calcDetails} mode={mode} />}

          {!hasTieBack && (
            <div style={{ fontSize: 11, color: "#d32f2f", marginTop: 4 }}>
              No tie-back: Side thrust twists the structure.
            </div>
          )}
        </div>

        {/* SQB BAR weld check — 3rd column of vizRow */}
        <div style={styles.card}>
          <div style={{ fontWeight: "bold", color: "#e65100", marginBottom: 6, fontSize: 13, width: "100%" }}>
            SQB BAR Weld — 65×65 Rail → WF Top Flange
            <span style={{ fontSize: 11, fontWeight: "normal", color: "#78909c", marginLeft: 8 }}>
              {sqtWeldSize}mm · {electrode} · τ_allow = {WELD_ALLOW[electrode]} MPa · F_res = F×√2 (e=b=65mm)
              {sqtPattern === "intermittent" && <span style={{ color: "#e65100" }}> · {sqtOn}↔{sqtGap}mm · {(sqtOn/(sqtOn+sqtGap)*100).toFixed(0)}%</span>}
            </span>
          </div>
          {(() => {
            const pct = Math.min(sqtUtil, 150);
            const barColor = sqtUtil < 50 ? "#43a047" : sqtUtil < 80 ? "#fb8c00" : "#e53935";
            return (
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: "bold", color: barColor }}>τ = {sqtStress.toFixed(1)} MPa</span>
                  <span style={{ fontSize: 13, fontWeight: "bold", color: barColor }}>{sqtUtil.toFixed(0)}% Static</span>
                </div>
                <div style={{ width: "100%", height: 14, backgroundColor: "#eceff1", borderRadius: 7, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 7, backgroundColor: barColor, transition: "width 0.3s" }} />
                </div>
                <div style={{ minHeight: 24, marginBottom: 6 }}>
                  {sqtUtil > 100
                    ? <span style={{ padding: "3px 10px", borderRadius: 6, backgroundColor: "#ffebee", color: "#c62828", fontSize: 12, fontWeight: "bold" }}>OVERSTRESSED — rail weld will fail</span>
                    : sqtFatigueUtil > 100
                    ? <span style={{ padding: "3px 10px", borderRadius: 6, backgroundColor: "#fff3e0", color: "#e65100", fontSize: 12, fontWeight: "bold" }}>FATIGUE FAIL — {sqtPattern === "intermittent" ? "Cat.E" : "Cat.D"} {sqtFatigueUtil.toFixed(0)}% → crack</span>
                    : <span style={{ padding: "3px 10px", borderRadius: 6, backgroundColor: "#e8f5e9", color: "#388e3c", fontSize: 12, fontWeight: "bold" }}>PASS — fatigue {sqtFatigueUtil.toFixed(0)}% ({sqtPattern === "intermittent" ? "Cat.E 18MPa" : "Cat.D 55MPa"})</span>
                  }
                </div>
                {/* Fatigue Life Estimate */}
                {sqtStress > 0 && (() => {
                  const tauFat = sqtPattern === "continuous" ? 55 : 18;
                  const C = 2e6 * Math.pow(tauFat, 3);
                  const nFail = C / Math.pow(sqtStress, 3);
                  const years = nFail / cyclesPerYear;
                  const isPass = sqtFatigueUtil <= 100;
                  const bg = isPass ? "#e8f5e9" : years < 5 ? "#ffebee" : years < 20 ? "#fff3e0" : "#fff8e1";
                  const col = isPass ? "#2e7d32" : years < 5 ? "#c62828" : years < 20 ? "#e65100" : "#f57f17";
                  return (
                    <div style={{ padding: "8px 12px", borderRadius: 8, backgroundColor: bg, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: col, fontWeight: "bold" }}>
                        ⏱ Estimated fatigue life
                      </span>
                      <span style={{ fontSize: 20, fontWeight: "900", color: col }}>
                        {years >= 999 ? ">999" : years.toFixed(1)}
                        <span style={{ fontSize: 12, fontWeight: "normal", marginLeft: 4 }}>ปี</span>
                      </span>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>
        </div>{/* end vizRow */}

        {/* Top View — bottom of right panel */}
        <div style={{ ...styles.card, backgroundColor: "#f5f5f5" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, width: "100%" }}>
            <span style={{ fontWeight: "bold", color: "#546e7a" }}>Top View — Skew (ภาพแสดงทิศ มุมขยาย ไม่ใช่มุมจริง)</span>
            <span style={{ ...styles.phaseBadge, backgroundColor: phaseBadgeColor.bg, color: phaseBadgeColor.color }}>
              {dir === "forward" ? "▶" : "◀"} {mode === "cross" ? (dir === "forward" ? "Right" : "Left") : dir.charAt(0).toUpperCase() + dir.slice(1)} · {phaseLabel}
            </span>
          </div>
          <svg width="100%" height="155" viewBox="-18 0 440 165" style={{display:"block"}}>
            <defs>
              <marker id="arrow-dir" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto">
                <polygon points="0 0,8 3,0 6" fill="#0288d1"/>
              </marker>
              <marker id="arrow-red" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto">
                <polygon points="0 0,8 3,0 6" fill="#c62828"/>
              </marker>
            </defs>

            {/* Background */}
            <rect x="-18" y="0" width="440" height="165" fill="#eceff1" rx="6"/>

            {/* ── L rail (vertical, left side) ── */}
            <rect x="3"  y="0" width="24" height="165" fill="#607d8b"/>
            <rect x="3"  y="0" width="6"  height="165" fill="#455a64"/>
            <rect x="21" y="0" width="6"  height="165" fill="#455a64"/>
            <rect x="10" y="0" width="9"  height="165" fill="#ff8f00"/>
            <text x="15" y="11" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">L</text>

            {/* ── R rail (vertical, right side) ── */}
            <rect x="373" y="0" width="24" height="165" fill="#607d8b"/>
            <rect x="373" y="0" width="6"  height="165" fill="#455a64"/>
            <rect x="391" y="0" width="6"  height="165" fill="#455a64"/>
            <rect x="381" y="0" width="9"  height="165" fill="#ff8f00"/>
            <text x="385" y="11" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">R</text>

            {/* SQB BAR label */}
            <rect x="-16" y="76" width="6" height="12" fill="#ff8f00" rx="1"/>
            <text x="-8" y="85" fill="#ff8f00" fontSize="7" fontWeight="bold">SQB BAR</text>

            {/* Travel direction arrow (fixed) — Cross Travel แสดงทิศ trolley ตามแนวสะพาน */}
            {mode === "cross"
              ? <><line x1={dir === "forward" ? 170 : 230} y1="150" x2={dir === "forward" ? 222 : 178} y2="150" stroke="#0288d1" strokeWidth="2" markerEnd="url(#arrow-dir)"/>
                  <text x="200" y="163" textAnchor="middle" fill="#0288d1" fontSize="9" fontWeight="bold">TROLLEY {dir === "forward" ? "→" : "←"}</text></>
              : dir === "forward"
              ? <><line x1="200" y1="158" x2="200" y2="130" stroke="#0288d1" strokeWidth="2" markerEnd="url(#arrow-dir)"/>
                  <text x="207" y="155" fill="#0288d1" fontSize="9" fontWeight="bold">FWD</text></>
              : <><line x1="200" y1="7"   x2="200" y2="35"  stroke="#0288d1" strokeWidth="2" markerEnd="url(#arrow-dir)"/>
                  <text x="207" y="22"  fill="#0288d1" fontSize="9" fontWeight="bold">REV</text></>
            }

            {/* ── Rotating group ── */}
            <g transform={`rotate(${skewAngle}, 200, 80)`} style={{ transition: "transform 0.3s ease-out" }}>

              {/* Left End Truck */}
              <rect x="26" y="53" width="30" height="54" fill="#37474f" rx="2"/>
              <text x="41" y="83" textAnchor="middle" fill="#90a4ae" fontSize="7" fontWeight="bold">ET</text>

              {/* Right End Truck */}
              <rect x="344" y="53" width="30" height="54" fill="#37474f" rx="2"/>
              <text x="359" y="83" textAnchor="middle" fill="#90a4ae" fontSize="7" fontWeight="bold">ET</text>

              {/* Wheels (4 corners) */}
              <circle cx="18" cy="64"  r="7" fill="#1a237e" stroke="#c5cae9" strokeWidth="1.5"/>
              <circle cx="18" cy="96"  r="7" fill="#1a237e" stroke="#c5cae9" strokeWidth="1.5"/>
              <circle cx="382" cy="64" r="7" fill="#1a237e" stroke="#c5cae9" strokeWidth="1.5"/>
              <circle cx="382" cy="96" r="7" fill="#1a237e" stroke="#c5cae9" strokeWidth="1.5"/>

              {/* Bridge girder */}
              <rect x="56" y="64" width="288" height="32" fill="#fbc02d" stroke="#f57f17" strokeWidth="1.5" rx="2"/>
              <line x1="128" y1="64" x2="128" y2="96" stroke="#f9a825" strokeWidth="0.8"/>
              <line x1="200" y1="64" x2="200" y2="96" stroke="#f9a825" strokeWidth="0.8"/>
              <line x1="272" y1="64" x2="272" y2="96" stroke="#f9a825" strokeWidth="0.8"/>
              <text x="200" y="84" textAnchor="middle" fill="#37474f" fontSize="10" fontWeight="bold">CRANE BRIDGE</text>

              {/* Hoist / Trolley */}
              {(() => {
                const tx = 56 + (trolleyPos / span) * 288;
                return (
                  <g>
                    <rect x={tx - 20} y="69" width="40" height="22" fill="#d32f2f" stroke="#b71c1c" strokeWidth="1.5" rx="3"/>
                    <text x={tx} y="84" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">HOIST</text>
                  </g>
                );
              })()}

              {/* BITE / DRAG */}
              {isActive && Math.abs(skewAngle) > 0.1 && (
                <>
                  <circle cx={biteLeft ? 18 : 382} cy={fwdY < 60 ? 64 : 96} r="9"
                    fill="transparent" stroke="#c62828" strokeWidth="3"/>
                  <text x={biteX} y={fwdY} fill="#c62828" fontSize="10" fontWeight="bold">BITE</text>
                  <text x={dragX} y={rearY} fill="#78909c" fontSize="10" fontWeight="bold">DRAG</text>
                </>
              )}
            </g>

            {/* Force arrows */}
            {/* ทิศเดียวกับภาพหน้าตัด: + = ราง L ถูกดันเข้าใน (→), − = ราง R ถูกดันเข้าใน (←) */}
            {isActive && mode === "long" && lateralForce > 0 && (
              <>
                <line x1="-17" y1={biteWheelY} x2="-14" y2={biteWheelY} stroke="#c62828" strokeWidth="3" markerEnd="url(#arrow-red)"/>
                <text x="32" y="156" fill="#c62828" fontSize="10" fontWeight="bold">L→{Math.abs(lateralForce).toFixed(2)}T</text>
              </>
            )}
            {isActive && mode === "long" && lateralForce < 0 && (
              <>
                <line x1="417" y1={biteWheelY} x2="414" y2={biteWheelY} stroke="#c62828" strokeWidth="3" markerEnd="url(#arrow-red)"/>
                <text x="368" y="156" fill="#c62828" fontSize="10" fontWeight="bold" textAnchor="end">{Math.abs(lateralForce).toFixed(2)}T←R</text>
              </>
            )}
            {/* Cross Travel: รางทั้งสองถูกดันไปทิศเดียวกัน */}
            {isActive && mode === "cross" && lateralForce !== 0 && (
              <>
                {[15, 385].map(x => (
                  <line key={x} x1={lateralForce > 0 ? x - 16 : x + 16} y1="120" x2={lateralForce > 0 ? x - 13 : x + 13} y2="120"
                    stroke="#c62828" strokeWidth="3" markerEnd="url(#arrow-red)"/>
                ))}
                <text x="200" y="128" textAnchor="middle" fill="#c62828" fontSize="10" fontWeight="bold">
                  {lateralForce > 0 ? "→" : "←"} {Math.abs(lateralForce).toFixed(2)}T ต่อราง
                </text>
              </>
            )}
          </svg>
          {isActive && affectedRail !== "none" && (
            <div style={{ fontSize: 12, color: "#c62828", marginTop: 4, fontWeight: "bold" }}>
              {affectedRail === "both"
                ? `Trolley thrust pushes BOTH runway rails ${lateralForce < 0 ? "← left" : "right →"}`
                : `Side thrust pressing on ${affectedRail.toUpperCase()} rail flange`}
            </div>
          )}
        </div>

        {/* Zone Recommendation */}
        {sqtStress > 0 && (() => {
          const a_throat   = 0.707 * sqtWeldSize;
          const L_cur      = sqtPattern === "continuous" ? RAIL_HEIGHT_MM : sqtOn;
          const gapFac     = sqtPattern === "continuous" ? 1.0 : Math.sqrt(1 + Math.pow(sqtGap / (8 * RAIL_HEIGHT_MM), 2));
          const F_res_N    = sqtStress * (2 * L_cur * a_throat) / gapFac;
          const A_cont     = 2 * RAIL_HEIGHT_MM * a_throat;
          const tauCont    = F_res_N / A_cont;
          const C_D = 2e6 * Math.pow(55, 3);
          const C_E = 2e6 * Math.pow(18, 3);
          const yearsCurrent = (sqtPattern === "continuous" ? C_D : C_E) / Math.pow(sqtStress, 3) / cyclesPerYear;
          const yearsCritUpgrade = C_D / Math.pow(tauCont, 3) / cyclesPerYear;
          const tau25 = Math.pow(C_D / (25 * cyclesPerYear), 1/3);
          const reqSize = Math.ceil(F_res_N / (2 * RAIL_HEIGHT_MM * 0.707 * tau25));
          const A_req = 2 * RAIL_HEIGHT_MM * 0.707 * reqSize;
          const tauReq = F_res_N / A_req;
          const yearsReq = C_D / Math.pow(tauReq, 3) / cyclesPerYear;
          const fmt = y => y >= 999 ? ">999" : y.toFixed(1);
          const yCol = y => y >= 25 ? "#2e7d32" : y >= 10 ? "#e65100" : "#c62828";
          const yBg  = y => y >= 25 ? "#e8f5e9" : y >= 10 ? "#fff3e0" : "#ffebee";
          const th = { padding: "5px 8px", textAlign: "center", color: "#546e7a", fontWeight: "700", fontSize: 11, borderBottom: "2px solid #eceff1" };
          const td = { padding: "6px 8px", textAlign: "center", fontSize: 12, borderBottom: "1px solid #f5f5f5" };
          const scenarios = [
            { label: "⚪ ปัจจุบัน", desc: sqtPattern === "continuous" ? "Continuous ทั้งเส้น" : `Intermittent ${sqtOn}↔${sqtGap}mm`,
              tau: sqtStress, cat: sqtPattern === "continuous" ? "D · 55" : "E · 18", years: yearsCurrent },
            { label: "🟡 Critical Zone", desc: `Continuous ${sqtWeldSize}mm (±3m จากจุดจอด)`,
              tau: tauCont, cat: "D · 55", years: yearsCritUpgrade },
            { label: "🟢 Recommended", desc: `Continuous ${reqSize}mm · E7016`,
              tau: tauReq, cat: "D · 55", years: yearsReq },
          ];
          return (
            <div style={{ backgroundColor: "white", borderRadius: 14, padding: "12px 16px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", flexShrink: 0 }}>
              <div style={{ fontWeight: "bold", color: "#37474f", fontSize: 13, marginBottom: 8 }}>
                🗺 Weld Zone Recommendation — ตามแนวราง · {cyclesPerYear.toLocaleString()} cycles/yr
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    {["Zone", "Pattern", "Cat. (MPa)", "τ (MPa)", "Fatigue util", "อายุ (ปี)"].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s, i) => {
                    const fatLim = s.cat.includes("55") ? 55 : 18;
                    const util = (s.tau / fatLim * 100).toFixed(0);
                    return (
                      <tr key={i} style={{ backgroundColor: yBg(s.years) }}>
                        <td style={{ ...td, textAlign: "left" }}>
                          <strong>{s.label}</strong>
                          <div style={{ fontSize: 10, color: "#78909c" }}>{s.desc}</div>
                        </td>
                        <td style={td}>{s.desc.split("·")[0].trim()}</td>
                        <td style={td}>{s.cat} MPa</td>
                        <td style={{ ...td, fontWeight: "bold" }}>{s.tau.toFixed(1)}</td>
                        <td style={{ ...td, fontWeight: "bold", color: yCol(s.years) }}>{util}%</td>
                        <td style={{ ...td, fontSize: 18, fontWeight: "900", color: yCol(s.years) }}>{fmt(s.years)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {yearsCritUpgrade < 25 && (
                <div style={{ marginTop: 8, padding: "6px 12px", backgroundColor: "#fff8e1", borderRadius: 8, fontSize: 12, color: "#f57f17" }}>
                  💡 ต้องใช้ <strong>Continuous {reqSize}mm E7016</strong> ที่ Critical Zone ถึงจะได้อายุ ≥ 25 ปี
                </div>
              )}
            </div>
          );
        })()}


      </div>{/* end rightPanel */}
      </div>{/* end mainGrid */}
    </div>
  );
};

export default CraneLongTravelSim;
