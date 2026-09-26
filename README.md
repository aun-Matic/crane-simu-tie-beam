# Crane Simulation — Runway Tie Back & SQB Weld

โปรแกรมจำลองแรงข้างของเครนเหนือศีรษะ (Overhead Crane) ต่อคานรางวิ่ง แนวเชื่อมราง SQB และ Tie Back

**เปิดใช้งาน:** https://aun-matic.github.io/crane-simu-tie-beam/

| หน้า | ใช้ทำอะไร |
|---|---|
| App 1 — Long / Cross Travel | แรงเบียดราง, การแอ่น/บิดของคานรางวิ่ง, ผลของ Tie Back, เช็คกำลังสมอ |
| App 2 — Simultaneous Motion | แรงรวมเมื่อเดินเครนและวิ่ง trolley พร้อมกัน → ความเค้นและอายุความล้าของแนวเชื่อม SQB |
| Help | คู่มือ สูตร และข้อจำกัดของโมเดล |

> **ระดับการวิเคราะห์: Screening** — ใช้เปรียบเทียบทางเลือกและหากรณีเลวร้าย ไม่ใช่การคำนวณเพื่อรับรองงานก่อสร้าง
> ควรยืนยันด้วยการวัดหน้างานและวิศวกรผู้รับผิดชอบ

## พัฒนาในเครื่อง

```bash
npm install      # Node 20.19+ หรือ 22.12+
npm run dev      # dev server
npm run lint
npm run build    # ออกที่ dist/
```

Push เข้า `main` แล้ว GitHub Actions จะ build และ deploy ขึ้น GitHub Pages ให้อัตโนมัติ
