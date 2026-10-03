/* Shared helpers */
export const GOVERNORATES = [
  "القاهرة","الجيزة","الإسكندرية","القليوبية","الشرقية","الدقهلية","البحيرة","المنوفية","الغربية",
  "كفر الشيخ","دمياط","بورسعيد","الإسماعيلية","السويس","شمال سيناء","جنوب سيناء","الفيوم",
  "بني سويف","المنيا","أسيوط","سوهاج","قنا","الأقصر","أسوان","البحر الأحمر","الوادي الجديد","مطروح"
];

export const COLLEGES = [
  "طب الفم والاسنان",
  "العلاج الطبيعي",
  "الصيدلة",
  "الهندسة",
  "الحاسبات والمعلومات والذكاء الاصطناعي",
  "التمريض",
  "تكنولوجيا العلوم الصحية التطبيقية",
  "الادارة والاقتصاد والعلوم السياسية"
];

export const ACTIVITIES = [
  { key: "sport",   label: "نشاط رياضي", color: "#2ec4b6" },
  { key: "art",     label: "نشاط فني",   color: "#e07aff" },
  { key: "culture", label: "نشاط ثقافي", color: "#5aa9ff" },
  { key: "social",  label: "نشاط اجتماعي", color: "#ffb347" }
];

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export function toLatinDigits(s) {
  return String(s).replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d));
}

export function cleanText(s, max = 200) {
  return String(s ?? "")
    .replace(/[\u0000-\u001F\u007F<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function fillSelect(el, items, placeholder) {
  el.textContent = "";
  if (placeholder) {
    const o = document.createElement("option");
    o.value = ""; o.textContent = placeholder; o.disabled = true; o.selected = true;
    el.appendChild(o);
  }
  items.forEach(v => {
    const o = document.createElement("option");
    o.value = v; o.textContent = v;
    el.appendChild(o);
  });
}

export function el(tag, props = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
    else n.setAttribute(k, v);
  }
  children.flat().forEach(c => { if (c != null) n.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return n;
}

/* Animated particle background */
export function startBackground(canvas) {
  const ctx = canvas.getContext("2d");
  let w, h, dpr, pts = [];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    const n = Math.round(Math.min(70, innerWidth / 18));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - .5) * .25 * dpr, vy: (Math.random() - .5) * .25 * dpr,
      r: (Math.random() * 1.6 + .6) * dpr
    }));
  }
  function frame() {
    ctx.clearRect(0, 0, w, h);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fillStyle = "rgba(230,195,106,.55)"; ctx.fill();
    }
    const max = 130 * dpr;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.hypot(dx, dy);
      if (d < max) {
        ctx.strokeStyle = `rgba(230,195,106,${(1 - d / max) * .16})`;
        ctx.lineWidth = dpr * .8;
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
      }
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  resize(); frame();
  addEventListener("resize", () => { resize(); if (reduce) frame(); });
}
