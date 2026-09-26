const s = {
    page:    { fontFamily: "'Sarabun', sans-serif", maxWidth: 860, margin: "0 auto", padding: "0 0 40px" },
    h2:      { fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "28px 0 10px", borderBottom: "2px solid #e2e8f0", paddingBottom: 6 },
    h3:      { fontSize: 15, fontWeight: 800, color: "#1e40af", margin: "18px 0 8px" },
    p:       { color: "#334155", fontSize: 14, lineHeight: 1.7, margin: "0 0 8px" },
    code:    { fontFamily: "monospace", background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontSize: 13, color: "#0f172a" },
    box:     { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", margin: "8px 0 14px" },
    warn:    { background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 10, padding: "10px 14px", margin: "8px 0 14px", color: "#9a3412", fontSize: 13 },
    good:    { background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 14px", margin: "8px 0 14px", color: "#166534", fontSize: 13 },
    table:   { width: "100%", borderCollapse: "collapse", fontSize: 13, margin: "8px 0 14px" },
    th:      { background: "#f1f5f9", padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#475569", borderBottom: "2px solid #e2e8f0" },
    td:      { padding: "7px 10px", borderBottom: "1px solid #f1f5f9", color: "#334155", verticalAlign: "top" },
    badge:   (c) => ({ display: "inline-block", padding: "1px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: c === "green" ? "#dcfce7" : c === "yellow" ? "#fef9c3" : "#fee2e2", color: c === "green" ? "#166534" : c === "yellow" ? "#854d0e" : "#991b1b" }),
    formula: { fontFamily: "monospace", fontSize: 13, background: "#1e293b", color: "#e2e8f0", padding: "10px 14px", borderRadius: 8, margin: "6px 0 10px", lineHeight: 1.8, whiteSpace: "pre-wrap" },
    step:    { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 },
    num:     { minWidth: 24, height: 24, borderRadius: "50%", background: "#1e40af", color: "white", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
};

const Row = ({ label, val, unit, desc }) => (
  <tr>
    <td style={{ ...s.td, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>{label}</td>
    <td style={{ ...s.td, fontFamily: "monospace", color: "#1e40af" }}>{val}{unit ? ` ${unit}` : ""}</td>
    <td style={s.td}>{desc}</td>
  </tr>
);

const Steps = ({ items }) => items.map(([n, t]) => (
  <div key={n} style={s.step}>
    <div style={s.num}>{n}</div>
    <p style={{ ...s.p, margin: 0 }}>{t}</p>
  </div>
));

export default function HelpPage() {
  return (
    <div style={s.page}>

      {/* ── ภาพรวม ── */}
      <h2 style={s.h2}>ภาพรวมโปรแกรม</h2>
      <p style={s.p}>
        ชุดโปรแกรมวิเคราะห์ <strong>Overhead Crane 20–30 ton</strong> — ครอบคลุม 2 ด้านหลักของปัญหา
        แนวเชื่อม <strong>SQB BAR</strong> (แท่งเหล็กสี่เหลี่ยม 65×65 mm ที่เชื่อมยึดเข้ากับ<strong>หน้าบน
        (top flange) ของ WF beam</strong> เพื่อทำหน้าที่เป็นรางกันล้อหลุด) และการบิดตัวของ WF beam ใต้แรงข้าง
      </p>
      <table style={s.table}>
        <thead><tr><th style={s.th}>App</th><th style={s.th}>จุดประสงค์หลัก</th><th style={s.th}>คำถามที่ตอบได้</th></tr></thead>
        <tbody>
          <tr>
            <td style={{ ...s.td, fontWeight: 700, color: "#1d4ed8" }}>▶▶ Long Travel & ↔ Cross Travel Skew</td>
            <td style={s.td}>ตรวจสอบการบิด/โก่งของ WF beam และผลของ Tie Back</td>
            <td style={s.td}>ต้องติด Tie Back ไหม? beam เอียงมากแค่ไหนถ้าไม่ติด?</td>
          </tr>
          <tr>
            <td style={{ ...s.td, fontWeight: 700, color: "#c2410c" }}>⚡ Simultaneous Motion</td>
            <td style={s.td}>ตรวจสอบความเค้นและอายุความล้าของแนวเชื่อม SQB BAR</td>
            <td style={s.td}>แนวเชื่อมอยู่ได้กี่ปี? เมื่อ LT+CT ทำงานพร้อมกัน?</td>
          </tr>
        </tbody>
      </table>
      <div style={s.warn}>
        <strong>ระดับการวิเคราะห์: Screening Analysis</strong> — เหมาะสำหรับเปรียบเทียบ design option และระบุ worst-case
        ไม่ใช่การคำนวณเพื่อ sign-off งานก่อสร้าง ควรยืนยันด้วย field measurement และวิศวกรผู้รับผิดชอบ
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* APP 1 — Long Travel & Cross Travel Skew */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <h2 style={{ ...s.h2, color: "#1d4ed8", borderBottomColor: "#bfdbfe" }}>
        ▶▶ App 1 — Long Travel &amp; Cross Travel Skew
      </h2>
      <p style={s.p}>
        จำลองแรงข้างที่เกิดขึ้นเมื่อเครนเริ่ม/หยุดเคลื่อนที่ แล้วคำนวณว่า <em>runway beam</em> (คานรางวิ่ง)
        บิดตัว/โก่งข้างมากแค่ไหน — ทั้งสองโหมดคิดกับคานรางวิ่งตัวเดียวกัน:
        <strong>Long Travel</strong> = แรงเบียดจากเครนวิ่งตามราง ·
        <strong>Cross Travel</strong> = แรงเฉื่อยของ trolley ที่วิ่งบนสะพาน ส่งผ่าน end truck ลงไปดันรางวิ่งทั้งสองข้าง
        Tie Back เป็นตัวแปรหลัก — ถ้าไม่มีแรงข้างจะบิด beam จนอาจทำให้เสาหรือฐานแตกร้าวได้
      </p>

      <h3 style={s.h3}>วิธีใช้งาน App 1</h3>
      <Steps items={[
        ["1", "เลือก Mode — Long Travel (เครนวิ่งบน runway) หรือ Cross Travel (trolley วิ่งบน bridge)"],
        ["2", "ตั้ง Load, Trolley Position, Beam section ให้ตรงกับเครนจริง"],
        ["3", "เปิด/ปิด Tie Back เพื่อเปรียบเทียบผลก่อน-หลังติดตั้ง"],
        ["4", "เลือก VFD และ Ramp Time — VFD ลดความเร่ง ลดแรงข้าง"],
        ["5", "ปรับ Geometric Skew α (ความเบี้ยวของราง — มีเฉพาะ Long Travel)"],
        ["6", "กด Speed 1 หรือ Speed 2 (ค้างอยู่อัตโนมัติ) → สังเกต Side Thrust, Lateral Bending, Torsion"],
        ["7", "คลิกที่ค่าแต่ละตัวเพื่อดูสูตรและการคำนวณทีละขั้น (▼ คำนวณ)"],
        ["8", "กด ⏹ STOP เมื่อต้องการหยุด — จะแสดง braking force (ย้อนทิศ) ก่อน idle"],
      ]} />

      <h3 style={s.h3}>ตัวแปร Input — App 1</h3>
      <table style={s.table}>
        <thead><tr><th style={s.th}>ตัวแปร</th><th style={s.th}>ค่า/ตัวเลือก</th><th style={s.th}>คำอธิบาย</th></tr></thead>
        <tbody>
          <Row label="Mode" val="Long / Cross" desc="Long Travel: เครนทั้งตัววิ่งบน runway · Cross Travel: trolley วิ่งบนสะพาน → แรงลงรางวิ่ง" />
          <Row label="Load" val="ton" desc="น้ำหนักที่ยก (ไม่รวม trolley 2.2T, crane 20.8T)" />
          <Row label="Trolley Position" val="m" desc="ตำแหน่ง trolley บนสะพาน — Long: กระจาย mass ซ้าย/ขวา (กำหนดรางที่ BITE) · Cross: แบ่งแรง trolley ลงราง L/R ตามน้ำหนักล้อ" />
          <Row label="Runway Beam" val="H500 / H600" desc="หน้าตัดคานรางวิ่ง (ใช้ทั้งสองโหมด) — กำหนดความแกร่ง (Iy, J, Cw)" />
          <Row label="ระยะเสา" val="5 / 10 m" desc="ช่วงคานระหว่างเสา — ช่วง 10 ม. แอ่นข้างมากขึ้น 8 เท่า (L³)" />
          <Row label="Tie Back" val="Locked / Unlocked" desc="แกนต้านการบิด — ถ้าล็อก: เพิ่ม torsional stiffness อย่างมาก" />
          <Row label="Direction" val="Forward/Backward (LT) · Right/Left (CT)" desc="ทิศทางเคลื่อนที่ — กำหนดว่าราง L หรือ R ถูกดัน" />
          <Row label="VFD + Ramp" val="2–20 s" desc="มี VFD: ความเร่งลดลงตาม Ramp → แรงข้างลดลง" />
          <Row label="Sync Drive" val="on/off" desc="ขับ 2 motor พร้อมกันด้วย VFD → ล้อสองข้างเร่งเท่ากัน → F_inertia = 0 (เหมือน App 2) · ปุ่มแสดงเมื่อเปิด VFD และอยู่ใน Long Travel" />
          <Row label="Geometric Skew α" val="0–15% (Long Travel เท่านั้น)" desc="ความเบี้ยวของราง → แรงข้างที่มีตลอดเวลาที่วิ่ง (ดูรายละเอียดด้านล่าง)" />
          <Row label="Speed 1 / Speed 2" val="LT: 4/50 · CT: 5/20 m/min" desc="กดเพื่อ toggle เปิด/ปิด · กด STOP เพื่อหยุดพร้อม braking" />
          <Row label="SQB BAR Weld" val="size, pattern, ระยะ" desc="พารามิเตอร์แนวเชื่อม — เหมือนกับ App 2" />
        </tbody>
      </table>

      <h3 style={s.h3}>การคำนวณ — App 1</h3>

      <p style={{ ...s.p, fontWeight: 700, color: "#1d4ed8" }}>① Side Thrust (แรงข้าง)</p>
      <div style={s.formula}>
        {`a_g = v / t_ramp / 9.81

m_L = crane/2 + (load+trolley)×(span−pos)/span  [Long Travel]
m_R = crane/2 + (load+trolley)×pos/span

── Long Travel ──
F_inertia  = |m_L − m_R| × a_g × 1.5            ← = 0 เมื่อเปิด Sync Drive (VFD)
F_friction = max(m_L, m_R) / 2 × 0.05
F_skew     = α × (crane + load + trolley)       ← มีตลอดเวลาที่วิ่ง
F_total    = F_inertia + F_friction + F_skew   [ton] = F×9.81 [kN]

── Cross Travel (แรง trolley ลงรางวิ่ง) ──
สัดส่วน_L  = m_L / (m_L + m_R)                  ← น้ำหนักล้อ end truck (trolley กลาง = 50/50)
F_L = (load + trolley) × a_g × สัดส่วน_L
F_R = (load + trolley) × a_g × (1 − สัดส่วน_L)
F_total = max(F_L, F_R)                         ← รางทั้งสองถูกดันทิศเดียวกัน
เทียบ: มาตรฐาน 20% (ASCE/AISC) ÷ 2 · EN 1991-3 10% ÷ 2`}
      </div>

      <p style={{ ...s.p, fontWeight: 700, color: "#1565c0" }}>② Lateral Bending (การโก่งข้าง)</p>
      <div style={s.formula}>
        {`k_beam = 48 × E × I_y / L³ ÷ 9810          [ton/mm]
k_total = k_beam + k_tieback  (ถ้ามี Tie Back)
δ = F_total / k_total                           [mm]`}
      </div>

      <p style={{ ...s.p, fontWeight: 700, color: "#e65100" }}>③ Torsion (การบิด) — จุดประสงค์หลักของ App นี้</p>
      <div style={s.formula}>
        {`e = depth − tf/2 + 65 mm               [แขนโมเมนต์จากฐานคานถึงหัวราง SQB 65]
T = F × 9810 × e                           [N·mm — แรงบิด]

k_tors = G·J + 4·π²·E·Cw/L²             [N·mm/rad — ฐานเชื่อม fixed-fixed, ทั้งสองโหมด]

k_eq   = phiDenom × k_tors / L
k_tb   = k_tieback × 9810 × (depth/2)²    [ถ้ามี Tie Back]

φ      = T / (k_eq + k_tb)                [rad]
φ_deg  = φ × 180/π                        [องศา]
disp   = φ × e                            [mm — การเคลื่อนที่ที่ rail top]`}
      </div>

      <div style={s.good}>
        <strong>ผลของ Tie Back:</strong> k_tb เพิ่มเข้าไปใน denominator → φ ลดลงมาก
        ที่ค่า default (H500 ช่วงเสา 5 ม., k_tieback 24.2 ton/mm) φ ลดประมาณ <strong>13×</strong> ·
        ช่วงเสา 10 ม. ลดได้มากกว่า (~77×) — ยิ่งช่วงยาวยิ่งได้ผล ·
        แผงเช็คสมอ Tie Back รวมแรงจาก trolley (Cross Travel) ไว้ด้วยทั้งค่าใช้งานจริงและค่ามาตรฐาน 20%
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* APP 2 — Simultaneous Motion */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <h2 style={{ ...s.h2, color: "#c2410c", borderBottomColor: "#fed7aa" }}>
        ⚡ App 2 — Simultaneous Motion (LT × CT Combined)
      </h2>
      <p style={s.p}>
        จำลองกรณีที่ Long Travel และ Cross Travel ทำงานพร้อมกัน — แรงทั้งสอง<strong>ขวางรางในแนวเดียวกัน</strong>
        จึงรวมกันแบบมีทิศ: ทิศเดียวกัน = บวก (แนวเชื่อม SQB รับแรงมากขึ้น อายุสั้นลง) · สวนทาง = หักล้าง
        ใช้สูตรและค่าเริ่มต้นเดียวกับ App 1 — ใส่ค่าเท่ากันได้ผลเท่ากัน
      </p>

      {/* ── วิธีใช้งาน ── */}
      <h2 style={s.h2}>วิธีใช้งาน App 2</h2>

      <h3 style={s.h3}>ขั้นตอนแนะนำ</h3>
      <Steps items={[
        ["1", "ตั้งค่า Load และ Trolley Position ให้ตรงกับสภาพการใช้งานจริง"],
        ["2", "เลือก Weld Size, Electrode, Pattern (Continuous / Intermittent) และ ระยะเชื่อม/ระยะเว้น"],
        ["3", "ตั้ง Cycles/year ให้ใกล้เคียงจำนวนรอบเดินทางจริงต่อปี"],
        ["4", "ปรับ Geometric Skew α ให้ตรงกับสภาพราง — นี่คือตัวแปรสำคัญที่สุด"],
        ["5", "เลือกทิศเดินเครน (Forward/Backward) และทิศ trolley (ไปราง L/R) — กรณีเลวร้ายคือ trolley เร่งเข้าหารางที่ BITE"],
        ["6", "กดปุ่ม Speed เพื่อเปิด simulation แล้วสังเกต อายุ (ปี) และ Fatigue%"],
        ["7", "คลิกแถวผลลัพธ์ (▼) เพื่อดูการคำนวณทีละขั้น"],
        ["8", "ดู Weld Zone Recommendation ด้านล่างเพื่อเปรียบเทียบ option"],
      ]} />

      {/* ── ตัวแปร Input ── */}
      <h2 style={s.h2}>ตัวแปร Input — App 2</h2>

      <h3 style={s.h3}>ภาระและตำแหน่ง</h3>
      <table style={s.table}>
        <thead><tr><th style={s.th}>ตัวแปร</th><th style={s.th}>ค่า Default</th><th style={s.th}>คำอธิบาย</th></tr></thead>
        <tbody>
          <Row label="Load" val="16" unit="ton" desc="น้ำหนักที่ยก ไม่รวม trolley (2.2 ton) และตัวเครน (20.8 ton)" />
          <Row label="Trolley Position" val="11.8" unit="m" desc="ตำแหน่ง trolley บน bridge (0 = ชิดซ้าย, 22.6 = ชิดขวา) — กระทบการกระจาย mass ซ้าย/ขวา" />
        </tbody>
      </table>

      <h3 style={s.h3}>แนวเชื่อม SQB BAR</h3>
      <table style={s.table}>
        <thead><tr><th style={s.th}>ตัวแปร</th><th style={s.th}>ตัวเลือก</th><th style={s.th}>คำอธิบาย</th></tr></thead>
        <tbody>
          <Row label="Weld Size" val="4/5/6/8 mm" desc="ขนาด leg ของ fillet weld — throat = 0.707 × size" />
          <Row label="Electrode" val="E6013 / E7016" desc="E6013: τ_allow=126 MPa · E7016: τ_allow=144 MPa" />
          <Row label="Pattern" val="Continuous / Intermittent" desc="Continuous → Cat.D (τ_fat=55 MPa) · Intermittent → Cat.E (τ_fat=18 MPa)" />
          <Row label="ระยะเชื่อม" val="25–100 mm" desc="ความยาวของแต่ละ weld block — ใช้คำนวณ weld area" />
          <Row label="ระยะเว้น" val="100–500 mm" desc="ช่วงว่างระหว่าง weld block — ส่งผลต่อ gap prying factor" />
          <Row label="Cycles/year" val="21,000" desc="จำนวนรอบ start/stop ต่อปี — ส่งผลตรงต่ออายุ" />
        </tbody>
      </table>

      <h3 style={s.h3}>Long Travel</h3>
      <table style={s.table}>
        <thead><tr><th style={s.th}>ตัวแปร</th><th style={s.th}>คำอธิบาย</th></tr></thead>
        <tbody>
          <Row label="Geometric Skew α" val="" desc="ความเบี้ยวของราง — แรงข้างที่เกิดตลอดเวลาที่เครนเคลื่อนที่ ไม่ใช่แค่ตอนเร่ง (ตัวแปรสำคัญที่สุด)" />
          <Row label="VFD + Ramp" val="" desc="มี VFD → ความเร่งลดลงตาม Ramp time → แรง inertia ลดลง" />
          <Row label="Sync Drive" val="" desc="มี Sync Drive → ยกเลิก inertia difference ระหว่างล้อซ้าย-ขวา → F_inertia = 0" />
          <Row label="ทิศเดินเครน" val="Forward / Backward" desc="ร่วมกับตำแหน่ง HOIST กำหนดว่าล้อหน้าราง L หรือ R เป็นตัว BITE (กฎเดียวกับ App 1)" />
          <Row label="Speed 1/2" val="4/50 m/min" desc="กดเพื่อเปิด/ปิด simulation ที่ความเร็วนั้น" />
        </tbody>
      </table>

      <h3 style={s.h3}>Cross Travel</h3>
      <table style={s.table}>
        <thead><tr><th style={s.th}>ตัวแปร</th><th style={s.th}>คำอธิบาย</th></tr></thead>
        <tbody>
          <Row label="ทิศ trolley" val="ไปราง L / R" desc="trolley เร่งไปรางไหน แรงปฏิกิริยาดันรางทั้งสองไปทางตรงข้าม" />
          <Row label="VFD + Ramp" val="" desc="ความเร่ง trolley — ลูกศร a ในภาพยาวตามค่าจริง" />
          <Row label="Speed 1/2" val="5/20 m/min" desc="กดเพื่อเปิด/ปิด" />
        </tbody>
      </table>

      {/* ── การคำนวณ ── */}
      <h2 style={s.h2}>การคำนวณ — App 2</h2>

      <h3 style={s.h3}>1 · ความเร่ง</h3>
      <div style={s.formula}>
        a = v / t_ramp{"\n"}
        a_g = a / 9.81  (หน่วย g){"\n\n"}
        LT Speed1: v = 4/60 m/s,  t_ramp (no VFD) = 1.5 s{"\n"}
        LT Speed2: v = 50/60 m/s, t_ramp (no VFD) = 1.0 s{"\n"}
        CT Speed1: v = 5/60 m/s,  t_ramp (no VFD) = 1.0 s{"\n"}
        CT Speed2: v = 20/60 m/s, t_ramp (no VFD) = 0.8 s
      </div>

      <h3 style={s.h3}>2 · การกระจาย Mass (LT)</h3>
      <div style={s.formula}>
        total = load + trolley_mass  (ton){"\n"}
        m_Left  = CRANE/2 + total × (23.6 − pos) / 23.6{"\n"}
        m_Right = CRANE/2 + total × pos / 23.6
      </div>

      <h3 style={s.h3}>3 · แรงข้างรวม (F_LT)</h3>
      <div style={s.formula}>
        F_inertia = |m_L − m_R| × a_g × 1.5   (non-sync drive){"\n"}
        F_friction = max(m_L, m_R) / 2 × 0.05{"\n"}
        F_skew    = α × (CRANE + load + trolley)  ← มีตลอดเวลาที่วิ่ง{"\n\n"}
        F_LT = F_inertia + F_friction + F_skew
      </div>

      <h3 style={s.h3}>4 · แรง Cross Travel (F_CT)</h3>
      <div style={s.formula}>
        สัดส่วน_L = m_L / (m_L + m_R)       (น้ำหนักล้อ end truck){"\n"}
        F_CT,L = (load + trolley) × a_g × สัดส่วน_L{"\n"}
        F_CT,R = (load + trolley) × a_g × (1 − สัดส่วน_L)
      </div>

      <h3 style={s.h3}>5 · แรงรวม (Simultaneous)</h3>
      <div style={s.formula}>
        ราง BITE  = F_LT ± F_CT (รางนั้น)   (+ ทิศเดียวกัน · − สวนทาง){"\n"}
        อีกราง    = F_CT (รางนั้น){"\n"}
        F_comb    = ค่ามากของ 2 ราง
      </div>
      <p style={s.p}>
        F_LT และ F_CT <strong>ขวางรางแนวเดียวกัน</strong> จึงไม่ใช้ผลรวมเวกเตอร์ √(F_LT² + F_CT²) —
        กรณีเลวร้ายคือ trolley เร่งเข้าหารางที่ BITE (แรงบวกกัน) · หมายเหตุ: EN 1991-3 ไม่ให้รวมสองแรงนี้เต็มค่าพร้อมกัน
        ค่าที่ได้จึงเป็นกรณีอนุรักษ์
      </p>

      <h3 style={s.h3}>6 · ความเค้นแนวเชื่อม</h3>
      <div style={s.formula}>
        F_N   = F × 9810              (N){"\n"}
        F_res = F_N × √2              (แรงลัพธ์ที่คอเชื่อม — มาจาก geometry 65×65){"\n\n"}
        a      = 0.707 × weld_size    (throat, mm){"\n"}
        L_weld = ระยะเชื่อม (mm)      (intermittent) หรือ 65 mm (continuous){"\n"}
        A      = 2 × L_weld × a       (พื้นที่สองแนวข้าง){"\n\n"}
        gap_factor = √(1 + (ระยะเว้น / 520)²)   (bar prying correction){"\n"}
        τ      = F_res × gap_factor / A   (MPa)
      </div>
      <p style={s.p}>
        <strong>หมายเหตุ √2:</strong> มาจาก geometry ของ SQB BAR 65×65 — แรงข้าง F ที่กระทำกึ่งกลางความสูง
        สร้าง moment ที่ทำให้ weld รับแรงตั้งฉากเพิ่มเท่ากับแรงเฉือน → resultant = F×√2
      </p>

      <h3 style={s.h3}>7 · อายุความล้า (S-N Curve — BS7608)</h3>
      <div style={s.formula}>
        C    = 2×10⁶ × τ_fat³{"\n"}
        N    = C / τ³                 (จำนวนรอบ){"\n"}
        อายุ = N / cycles_per_year    (ปี){"\n\n"}
        Continuous (Cat.D): τ_fat = 55 MPa{"\n"}
        Intermittent (Cat.E): τ_fat = 18 MPa
      </div>

      {/* ── Geometric Skew ── */}
      <h2 style={s.h2}>Geometric Skew α — ตัวแปรสำคัญที่สุด</h2>
      <p style={s.p}>
        เมื่อ bridge เบี้ยวหรือรางไม่ขนาน ล้อพยายามวิ่งเฉียง → flange ดัน SQB BAR ตลอดเวลาที่เครนเคลื่อนที่
        แรงนี้กระทำ <strong>ทุก cycle</strong> ไม่ใช่แค่ตอน start/stop
      </p>
      <table style={s.table}>
        <thead><tr><th style={s.th}>α</th><th style={s.th}>สภาพ</th><th style={s.th}>F_skew (load 16T + trolley 2.2T + crane 20.8T = 39T)</th></tr></thead>
        <tbody>
          <Row label="0%" val="ทฤษฎีสมบูรณ์" desc="ไม่มีในทางปฏิบัติ" />
          <Row label="2–5%" val="ติดตั้งดี / บำรุงรักษาดี" desc="≈ 0.8–2.0 ton ทุก cycle" />
          <Row label="5–10%" val="ทั่วไปในโรงงาน" desc="≈ 2.0–3.9 ton ทุก cycle" />
          <Row label="10–15%" val="ราง/bridge มีปัญหา" desc="≈ 3.9–5.9 ton ทุก cycle" />
        </tbody>
      </table>
      <div style={s.good}>
        <strong>วิธีใช้:</strong> ปรับ α จนอายุที่คำนวณได้ใกล้เคียงกับที่แนวเชื่อมแตกจริง
        ค่า α ที่ได้คืองาน "ความเบี้ยวสมมูล" ของระบบ — ช่วยบอกว่าต้องแก้ปัญหารางมากแค่ไหน
      </div>

      {/* ── ระยะเว้น ── */}
      <h2 style={s.h2}>ระยะเชื่อม / ระยะเว้น</h2>
      <p style={s.p}>
        สำหรับ Intermittent weld — ระยะเว้น (gap) ส่งผลต่อการคำนวณ 2 ทาง:
      </p>
      <table style={s.table}>
        <thead><tr><th style={s.th}>ผล</th><th style={s.th}>กลไก</th><th style={s.th}>ขนาดผล</th></tr></thead>
        <tbody>
          <Row label="Fatigue Category" val="" desc="Intermittent (gap > 0) → Cat.E (18 MPa) vs Continuous → Cat.D (55 MPa) — ผลต่างมาก (27× ในอายุ)" />
          <Row label="Gap Prying Factor" val="" desc="bar พาดช่วง gap เหมือนคาน → เกิดแรงดึงที่ขอบ weld block เพิ่มขึ้นตาม gap ยาว" />
        </tbody>
      </table>

      <h2 style={s.h2}>แผงเช็คสมอ Tie Back — แบบยึดแบบไหนรับแรงพอ?</h2>
      <p style={s.p}>
        ตัวแขนและ stiffener มักไม่ใช่คอขวด — <strong>จุดชี้ขาดคือสมอเคมีที่ยึดเข้าเสาคอนกรีต</strong>
        เพราะรับแรงดึงสลับทิศทุกรอบสตาร์ท/เบรก เปิดสวิตช์ Tie Back = Locked ในโปรแกรม
        จะมีแผงเทียบกำลังสมอ 3 แบบพร้อม Safety Factor สดตามแรงที่จำลองอยู่
      </p>
      <table style={s.table}>
        <thead><tr><th style={s.th}>แบบ</th><th style={s.th}>สมอเคมี</th><th style={s.th}>กำลังรวม</th></tr></thead>
        <tbody>
          <Row label="แบบ B เดิม" val="2 × M12 ฝัง 100 mm" desc="~39 kN — ไม่ผ่านเมื่อ ramp สั้น/E-stop" />
          <Row label="แบบ ST" val="2 × M16 ฝัง 125 mm" desc="~59 kN — ผ่านการใช้งานปกติ" />
          <Row label="แบบ B ใหม่" val="4 × M16 ฝัง 125 mm (คู่บนรับดึง)" desc="~59 kN — พุกยาว 165/190 mm แต่ฝังลึก 125 mm · แรงเยื้องจากหัวรางทำให้คู่บนรับดึงทั้งหมด (2 × 29.5)" />
        </tbody>
      </table>
      <div style={s.good}>
        <strong>ที่มาของตัวเลข:</strong> ค่าแรงดึงแนะนำจาก catalog น้ำยาเคมี Welbond Plus
        (M12 ฝัง 110 mm = 21.7 kN · M16 ฝัง 125 mm = 29.5 kN) ปรับตามความลึกฝังจริงแบบเชิงเส้น
        เพราะกำลังยึดเกาะแปรตามพื้นที่ผิว · Hilti RE 500 V.3 ให้ค่าสูงกว่าราว 11% แต่บ่มตัวนานกว่า (5 ชม. เทียบ 45 นาที) ·
        <strong>เกณฑ์แนะนำ SF ≥ 2</strong> สำหรับแรงดึงสลับทิศ — catalog ทั้งสองยี่ห้อรับรองเฉพาะ static/quasi-static
        จึงควรเผื่อค่าความปลอดภัยให้พอสำหรับงาน cyclic
      </div>


      {/* ── ข้อจำกัด ── */}
      <h2 style={s.h2}>ข้อจำกัดของโปรแกรม</h2>
      <table style={s.table}>
        <thead><tr><th style={s.th}>จุด</th><th style={s.th}>ระดับ</th><th style={s.th}>หมายเหตุ</th></tr></thead>
        <tbody>
          <tr>
            <td style={s.td}>Skew force (F_skew = α×M)</td>
            <td style={s.td}><span style={s.badge("yellow")}>ประมาณ</span></td>
            <td style={s.td}>ไม่คิด span ราง, wheel base, stiffness</td>
          </tr>
          <tr>
            <td style={s.td}>RAIL_H = 65 mm (hardcode)</td>
            <td style={s.td}><span style={s.badge("green")}>ตรงหน้างาน</span></td>
            <td style={s.td}>ตรงกับราง SQB 65×65 ตามรายงานตรวจ — ถ้าใช้กับรางขนาดอื่นต้องแก้ค่าคงที่</td>
          </tr>
          <tr>
            <td style={s.td}>Gap prying factor</td>
            <td style={s.td}><span style={s.badge("yellow")}>ประมาณ</span></td>
            <td style={s.td}>fixed-end beam model — เป็น engineering approximation</td>
          </tr>
          <tr>
            <td style={s.td}>Bar bending check</td>
            <td style={s.td}><span style={s.badge("red")}>ไม่มี</span></td>
            <td style={s.td}>SQB BAR อาจโก่งเองระหว่าง weld block ก่อนที่ weld จะแตก</td>
          </tr>
          <tr>
            <td style={s.td}>Impact factor</td>
            <td style={s.td}><span style={s.badge("red")}>ไม่มี</span></td>
            <td style={s.td}>ล้อกระแทกรอยต่อราง/ข้อต่อสร้างแรงเพิ่ม</td>
          </tr>
          <tr>
            <td style={s.td}>Cycles/year</td>
            <td style={s.td}><span style={s.badge("yellow")}>ผู้ใช้ประมาณ</span></td>
            <td style={s.td}>error นี้ส่งผลตรงต่ออายุ — ควรนับจากประวัติการใช้งานจริง</td>
          </tr>
          <tr>
            <td style={s.td}>Weld quality</td>
            <td style={s.td}><span style={s.badge("red")}>ไม่มี</span></td>
            <td style={s.td}>undercut, porosity, wrong size ลดอายุจริงอย่างมีนัย</td>
          </tr>
          <tr>
            <td style={s.td}>Torsion model (App 1)</td>
            <td style={s.td}><span style={s.badge("yellow")}>ประมาณ</span></td>
            <td style={s.td}>สมมติปลายยึด ideal (fixed-fixed) — ของจริงอยู่ระหว่าง fixed กับ pin</td>
          </tr>
          <tr>
            <td style={s.td}>k_tieback (24.2 ton/mm)</td>
            <td style={s.td}><span style={s.badge("yellow")}>ค่าสมมติ</span></td>
            <td style={s.td}>stiffness จริงขึ้นกับรายละเอียดการติดตั้งและโครงสร้างที่ยึด</td>
          </tr>
          <tr>
            <td style={s.td}>ข้อต่อระหว่างท่อน SQB BAR</td>
            <td style={s.td}><span style={s.badge("red")}>ไม่มี</span></td>
            <td style={s.td}>ไม่จำลอง joint ระหว่างท่อน — จุดนี้รับแรงกระแทกซ้ำจากล้อ มักแตกก่อนช่วงกลาง</td>
          </tr>
          <tr>
            <td style={s.td}>แบ่งแรง trolley ลง 2 ราง</td>
            <td style={s.td}><span style={s.badge("yellow")}>ประมาณ</span></td>
            <td style={s.td}>สมมติแบ่งตามน้ำหนักล้อ end truck — ของจริงขึ้นกับระยะห่างบังใบล้อและความแกร่งด้านข้างของแต่ละราง</td>
          </tr>
          <tr>
            <td style={s.td}>ค่าสัมประสิทธิ์ (α, ×1.5, friction 5%)</td>
            <td style={s.td}><span style={s.badge("yellow")}>ยังไม่ปรับเทียบ</span></td>
            <td style={s.td}>ควรวัดการเอนของคานรางจริงขณะเครนวิ่ง แล้วเทียบกับที่โปรแกรมคำนวณ</td>
          </tr>
        </tbody>
      </table>

      {/* ── คำศัพท์ ── */}
      <h2 style={s.h2}>คำศัพท์</h2>
      <table style={s.table}>
        <thead><tr><th style={s.th}>คำ</th><th style={s.th}>ความหมาย</th></tr></thead>
        <tbody>
          {[
            ["SQB BAR", "Square Bar — แท่งเหล็กสี่เหลี่ยม 65×65 mm เชื่อมยึดบนหน้าบน (top flange) ของ WF beam ใช้เป็น rail กันหลุดของล้อเครน"],
            ["Tie Back", "แกน/ค้ำยึดหน้าบน beam เข้ากับโครงสร้างอาคาร — เพิ่ม torsional stiffness ต้านการบิดจากแรงข้าง"],
            ["Skew / ความเบี้ยว", "การที่ bridge เครนไม่ตั้งฉากกับราง — สร้างแรงข้างตลอดเวลาที่เคลื่อนที่"],
            ["τ (tau)", "ความเค้นเฉือน (MPa) ที่แนวเชื่อม"],
            ["τ_fat", "ค่าความเค้นเฉือนอ้างอิงสำหรับ S-N curve ของ fatigue category นั้น"],
            ["Cat.D / Cat.E", "Fatigue category ตาม BS7608 — D (continuous) ดีกว่า E (intermittent)"],
            ["throat (a)", "ความหนาประสิทธิผลของ fillet weld = 0.707 × leg size"],
            ["Cycles/year", "จำนวนรอบ start+stop ของเครนต่อปี"],
            ["VFD", "Variable Frequency Drive — ควบคุมความเร่ง/ลดความเร็วให้ smooth"],
            ["Sync Drive", "ขับ 2 motor พร้อมกัน — ลด inertia difference ระหว่างล้อซ้าย/ขวา"],
            ["Screening Analysis", "การวิเคราะห์เบื้องต้นเพื่อระบุความเสี่ยง ไม่ใช่การ sign-off"],
          ].map(([term, def]) => (
            <tr key={term}>
              <td style={{ ...s.td, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>{term}</td>
              <td style={s.td}>{def}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}
