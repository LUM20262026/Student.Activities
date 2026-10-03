(function () {
  "use strict";

  /* ---------- Firebase Config ---------- */
  var firebaseConfig = {
    apiKey: "AIzaSyBREOeP5McdKfi7EE9t77ZtN6RgXSntprU",
    authDomain: "student-3346e.firebaseapp.com",
    databaseURL: "https://student-3346e-default-rtdb.firebaseio.com",
    projectId: "student-3346e",
    storageBucket: "student-3346e.firebasestorage.app",
    messagingSenderId: "798475113867",
    appId: "1:798475113867:web:09cd92bf86fa3e7a2f0b8e"
  };

  if (typeof firebase !== "undefined" && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  var db = typeof firebase !== "undefined" ? firebase.database() : null;

  /* ---------- Constants ---------- */
  var GOVERNORATES = [
    "القاهرة","الجيزة","الإسكندرية","القليوبية","الشرقية","الدقهلية","البحيرة","المنوفية","الغربية",
    "كفر الشيخ","دمياط","بورسعيد","الإسماعيلية","السويس","شمال سيناء","جنوب سيناء","الفيوم",
    "بني سويف","المنيا","أسيوط","سوهاج","قنا","الأقصر","أسوان","البحر الأحمر","الوادي الجديد","مطروح"
  ];

  var COLLEGES = [
    "طب الفم والاسنان",
    "العلاج الطبيعي",
    "الصيدلة",
    "الهندسة",
    "الحاسبات والمعلومات والذكاء الاصطناعي",
    "التمريض",
    "تكنولوجيا العلوم الصحية التطبيقية",
    "الادارة والاقتصاد والعلوم السياسية"
  ];

  var ACTIVITIES = [
    { key: "sport",   label: "نشاط رياضي", color: "#2ec4b6" },
    { key: "art",     label: "نشاط فني",   color: "#e07aff" },
    { key: "culture", label: "نشاط ثقافي", color: "#5aa9ff" },
    { key: "social",  label: "نشاط اجتماعي", color: "#ffb347" }
  ];

  var ICONS = {
    sport:   '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6c3 2.4 3 10.4 0 12.8M18.4 5.6c-3 2.4-3 10.4 0 12.8"/>',
    art:     '<path d="M12 3a9 9 0 100 18c1.6 0 2-1 1.5-2-.6-1.2.1-2.5 1.6-2.5H17a4 4 0 004-4c0-5-4-9.5-9-9.5z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    culture: '<path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z"/><path d="M4 20.5A2.5 2.5 0 006.5 18H20v3H6.5A2.5 2.5 0 014 20.5z"/><path d="M9 8h7"/>',
    social:  '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.2c2.5.2 4.5 2.2 4.5 4.8"/>'
  };

  /* ---------- Helpers ---------- */
  function $ (id) { return document.getElementById(id); }

  function toLatinDigits(s) {
    var AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
    return String(s || "").replace(/[٠-٩]/g, function (d) { return AR_DIGITS.indexOf(d); });
  }

  function cleanText(s, max) {
    return String(s || "")
      .replace(/[\u0000-\u001F\u007F<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max || 200);
  }

  function startBackground(canvas) {
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var w, h, dpr, pts = [];
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      var n = Math.round(Math.min(70, window.innerWidth / 18));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - .5) * .25 * dpr, vy: (Math.random() - .5) * .25 * dpr,
          r: (Math.random() * 1.6 + .6) * dpr
        });
      }
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = "rgba(230,195,106,.55)"; ctx.fill();
      }
      var max = 130 * dpr;
      for (var i = 0; i < pts.length; i++) {
        for (var j = i + 1; j < pts.length; j++) {
          var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.hypot(dx, dy);
          if (d < max) {
            ctx.strokeStyle = "rgba(230,195,106," + ((1 - d / max) * .16) + ")";
            ctx.lineWidth = dpr * .8;
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
          }
        }
      }
      if (!reduce) requestAnimationFrame(frame);
    }
    resize(); frame();
    window.addEventListener("resize", function () { resize(); if (reduce) frame(); });
  }

  function toast(msg, type) {
    var container = $("toasts");
    if (!container) return;
    var t = document.createElement("div");
    t.className = "toast " + (type || "ok");
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(function () { t.remove(); }, 4200);
  }

  /* ---------- DOM Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    startBackground($("bg"));

    // Populate Governorates
    var govSelect = $("governorate");
    if (govSelect) {
      govSelect.innerHTML = "";
      var opt0 = document.createElement("option");
      opt0.value = ""; opt0.textContent = "اختر المحافظة"; opt0.disabled = true; opt0.selected = true;
      govSelect.appendChild(opt0);
      GOVERNORATES.forEach(function (g) {
        var opt = document.createElement("option");
        opt.value = g; opt.textContent = g;
        govSelect.appendChild(opt);
      });
    }

    // Populate Colleges
    var colSelect = $("college");
    if (colSelect) {
      colSelect.innerHTML = "";
      var opt0 = document.createElement("option");
      opt0.value = ""; opt0.textContent = "اختر الكلية"; opt0.disabled = true; opt0.selected = true;
      colSelect.appendChild(opt0);
      COLLEGES.forEach(function (c) {
        var opt = document.createElement("option");
        opt.value = c; opt.textContent = c;
        colSelect.appendChild(opt);
      });
    }

    // Populate Activities Grid
    var actGrid = $("actGrid");
    if (actGrid) {
      actGrid.innerHTML = "";
      ACTIVITIES.forEach(function (a) {
        var lab = document.createElement("label");
        lab.className = "act";
        lab.style.setProperty("--c", a.color);

        var input = document.createElement("input");
        input.type = "checkbox";
        input.name = "act";
        input.value = a.key;

        var tile = document.createElement("span");
        tile.className = "tile";

        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.innerHTML = ICONS[a.key];

        var txt = document.createTextNode(a.label);
        tile.appendChild(svg);
        tile.appendChild(txt);

        var tick = document.createElement("span");
        tick.className = "tick";
        tick.textContent = "✓";

        lab.appendChild(input);
        lab.appendChild(tile);
        lab.appendChild(tick);
        actGrid.appendChild(lab);
      });
    }

    // Form logic
    var form = $("form");
    if (!form) return;

    function setErr(name, msg) {
      var box = form.querySelector('[data-f="' + name + '"]');
      if (!box) return;
      box.classList.toggle("invalid", !!msg);
      var errEl = box.querySelector(".err");
      if (errEl) errEl.textContent = msg || "";
    }

    function formatDetail(txt) {
      if (!txt) return "";
      var raw = String(txt || "").replace(/[\u0000-\u001F\u007F<>]/g, " ");
      var parts = raw
        .split(/[-–—,،;؛\n\/+]|\s+و\s+/)
        .map(function (x) { return x.trim(); })
        .filter(function (x) { return x.length >= 2; });

      var unique = [];
      parts.forEach(function (p) {
        if (unique.indexOf(p) === -1) unique.push(p);
      });
      return unique.join(" - ");
    }

    function collect() {
      var acts = {};
      ACTIVITIES.forEach(function (a) {
        var chk = form.querySelector('input[value="' + a.key + '"]');
        acts[a.key] = chk ? chk.checked : false;
      });
      return {
        name: cleanText($("name").value, 100),
        code: toLatinDigits($("code").value).trim().toUpperCase(),
        college: cleanText($("college").value, 60),
        governorate: $("governorate").value,
        phone: toLatinDigits($("phone").value).replace(/\s|-/g, ""),
        acts: acts,
        detail: formatDetail($("detail").value)
      };
    }

    function validate(d) {
      var ok = true;
      function bad(f, m) { setErr(f, m); ok = false; }
      ["name","code","college","governorate","phone","activities","detail"].forEach(function (f) { setErr(f, ""); });
      if (!/^[^ ]+( [^ ]+){3,}$/.test(d.name) || d.name.length < 8) bad("name", "اكتب الاسم رباعيًا (4 أسماء على الأقل)");
      if (!/^[A-Z0-9]{3,20}$/.test(d.code)) bad("code", "كود الطالب غير صحيح (حروف إنجليزية وأرقام فقط)");
      if (COLLEGES.indexOf(d.college) === -1) bad("college", "اختر الكلية من القائمة المتاحة");
      if (GOVERNORATES.indexOf(d.governorate) === -1) bad("governorate", "اختر المحافظة");
      if (!/^01[0125][0-9]{8}$/.test(d.phone)) bad("phone", "رقم الموبايل غير صحيح (11 رقم يبدأ بـ 01)");
      var hasAct = Object.keys(d.acts).some(function (k) { return d.acts[k]; });
      if (!hasAct) bad("activities", "اختر نشاطًا واحدًا على الأقل");
      return ok;
    }

    var COOLDOWN_MS = 10000;
    var lastSubmit = 0;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if ($("website") && $("website").value) return; // honeypot
      if (Date.now() - lastSubmit < COOLDOWN_MS) return toast("من فضلك انتظر قليلًا قبل المحاولة مرة أخرى", "bad");

      var d = collect();
      if (!validate(d)) {
        var inv = form.querySelector(".invalid");
        if (inv) inv.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      var btn = $("submit");
      btn.disabled = true; btn.classList.add("loading");

      if (!db) {
        toast("تعذر الاتصال بقاعدة البيانات", "bad");
        btn.disabled = false; btn.classList.remove("loading");
        return;
      }

      db.ref("students/" + d.code).set({
        name: d.name,
        code: d.code,
        college: d.college,
        governorate: d.governorate,
        phone: d.phone,
        activities: d.acts,
        activityDetail: d.detail,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      }).then(function () {
        lastSubmit = Date.now();
        form.reset();
        $("success").hidden = false;
      }).catch(function () {
        toast("تعذر التسجيل: قد يكون الكود مسجلًا من قبل أو توجد مشكلة في الاتصال", "bad");
      }).then(function () {
        btn.disabled = false; btn.classList.remove("loading");
      });
    });

    var againBtn = $("again");
    if (againBtn) {
      againBtn.addEventListener("click", function () {
        $("success").hidden = true;
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    form.addEventListener("input", function (e) {
      var f = e.target.closest("[data-f]");
      if (f && f.dataset.f) setErr(f.dataset.f, "");
    });
  });
})();
