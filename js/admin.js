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
    { key: "sport",   label: "نشاط رياضي", color: "#2ec4b6", icon: "⚽" },
    { key: "art",     label: "نشاط فني",   color: "#a855f7", icon: "🎨" },
    { key: "culture", label: "نشاط ثقافي", color: "#3b82f6", icon: "📚" },
    { key: "social",  label: "نشاط اجتماعي", color: "#f97316", icon: "🤝" }
  ];



  /* ---------- State ---------- */
  var students = [];
  var dbUnsub = null;
  var shown = 50;
  var PAGE = 50;
  var stack = [];

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

  function fillSelect(el, items, placeholder) {
    if (!el) return;
    el.innerHTML = "";
    if (placeholder) {
      var o = document.createElement("option");
      o.value = ""; o.textContent = placeholder; o.disabled = true; o.selected = true;
      el.appendChild(o);
    }
    items.forEach(function (v) {
      var o = document.createElement("option");
      o.value = v; o.textContent = v;
      el.appendChild(o);
    });
  }

  function el(tag, props) {
    var n = document.createElement(tag);
    props = props || {};
    for (var k in props) {
      if (props.hasOwnProperty(k)) {
        var v = props[k];
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k.indexOf("on") === 0 && typeof v === "function") n.addEventListener(k.slice(2), v);
        else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
        else n.setAttribute(k, v);
      }
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child != null) {
        if (Array.isArray(child)) {
          child.forEach(function (c) { if (c != null) n.appendChild(c.nodeType ? c : document.createTextNode(String(c))); });
        } else {
          n.appendChild(child.nodeType ? child : document.createTextNode(String(child)));
        }
      }
    }
    return n;
  }

  function toast(msg, type) {
    var container = $("toasts");
    if (!container) return;
    var t = el("div", { class: "toast " + (type || "ok"), text: msg });
    container.appendChild(t);
    setTimeout(function () { t.remove(); }, 4000);
  }

  function fmtDate(ts) {
    return ts ? new Date(ts).toLocaleDateString("en-GB") : "—";
  }

  function actKeys(s) {
    return ACTIVITIES.filter(function (a) { return s.activities && s.activities[a.key] === true; });
  }

  function actText(s) {
    return actKeys(s).map(function (a) { return a.label; }).join("، ");
  }

  function countBy(rows, fn) {
    var m = new Map();
    rows.forEach(function (r) {
      var k = fn(r);
      if (k) m.set(k, (m.get(k) || 0) + 1);
    });
    return Array.from(m.entries()).sort(function (a, b) { return b[1] - a[1]; });
  }

  function pct(n, t) {
    return t ? (n / t * 100).toFixed(1) + "%" : "0%";
  }

  function startOfDay(d) {
    d = d || new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  function hobbies(rows) {
    var m = new Map();
    rows.forEach(function (r) {
      var txt = String(r.activityDetail || "").trim();
      if (!txt) return;
      txt.split(/\s*[-–—,،;؛\n\/+]\s*|\s+و\s+/)
        .map(function (x) { return x.trim(); })
        .filter(function (x) { return x.length >= 2; })
        .forEach(function (item) {
          m.set(item, (m.get(item) || 0) + 1);
        });
    });
    return Array.from(m.entries()).sort(function (a, b) { return b[1] - a[1]; });
  }

  function normAr(s) {
    return String(s || "")
      .replace(/[\u064B-\u0652]/g, "")
      .replace(/أ|إ|آ/g, "ا")
      .replace(/ة/g, "ه")
      .toLowerCase();
  }

  function renderHobbyChart() {
    var wrap = $("chHobby");
    if (!wrap) return;
    var q = toLatinDigits($("qHobby") ? $("qHobby").value : "").trim();
    var qNorm = normAr(q);

    var hb = hobbies(students);
    if (qNorm) {
      hb = hb.filter(function (pair) {
        return normAr(pair[0]).indexOf(qNorm) !== -1;
      });
    }

    bars(wrap, hb.slice(0, 15), function (name) {
      openDetail("نشاط: " + name, students.filter(function (s) {
        return normAr(s.activityDetail).indexOf(normAr(name)) !== -1;
      }));
    });
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

  /* ---------- Login Check ---------- */
  function loginMsg(m) {
    var err = $("loginErr");
    if (err) err.textContent = m || "";
  }

  function unlockDashboard() {
    $("login").hidden = true;
    $("app").hidden = false;
    listenData();
  }

  function lockDashboard() {
    if (dbUnsub && typeof dbUnsub.off === "function") {
      dbUnsub.off();
      dbUnsub = null;
    }
    students = [];
    if ($("login")) $("login").hidden = false;
    if ($("app")) $("app").hidden = true;
    if ($("loginBtn")) $("loginBtn").disabled = false;
  }

  function listenData() {
    if (!db) {
      toast("تعذر الاتصال بقاعدة البيانات", "bad");
      return;
    }
    var ref = db.ref("students");
    ref.on("value", function (snap) {
      var v = snap.val() || {};
      students = Object.keys(v).map(function (k) {
        var item = v[k];
        item._k = k;
        return item;
      }).sort(function (a, b) {
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      renderAll();
    }, function (err) {
      toast("تعذر تحميل البيانات", "bad");
    });
    dbUnsub = ref;
  }

  /* ---------- Rendering Dashboard ---------- */
  function renderAll() {
    renderKPIs();
    renderCharts();
    rebuildFilters();
    renderTable();
  }

  function renderKPIs() {
    var T = students.length;
    if ($("totalBadgeCount")) $("totalBadgeCount").textContent = String(T);
    if ($("valTotal")) $("valTotal").textContent = String(T);
    if ($("pctTotal")) $("pctTotal").textContent = T + " طالب إجمالي";

    var sportRows = students.filter(function (s) { return s.activities && s.activities.sport; });
    var artRows = students.filter(function (s) { return s.activities && s.activities.art; });
    var cultureRows = students.filter(function (s) { return s.activities && s.activities.culture; });
    var socialRows = students.filter(function (s) { return s.activities && s.activities.social; });

    if ($("valSport")) $("valSport").textContent = String(sportRows.length);
    if ($("pctSport")) $("pctSport").textContent = sportRows.length + " طالب";

    if ($("valArt")) $("valArt").textContent = String(artRows.length);
    if ($("pctArt")) $("pctArt").textContent = artRows.length + " طالب";

    if ($("valCulture")) $("valCulture").textContent = String(cultureRows.length);
    if ($("pctCulture")) $("pctCulture").textContent = cultureRows.length + " طالب";

    if ($("valSocial")) $("valSocial").textContent = String(socialRows.length);
    if ($("pctSocial")) $("pctSocial").textContent = socialRows.length + " طالب";

    // Attach click listeners to KPI Cards for detail modal & exports
    var bindKPI = function (id, title, rows) {
      var card = $(id);
      if (!card) return;
      var newCard = card.cloneNode(true);
      card.parentNode.replaceChild(newCard, card);
      newCard.addEventListener("click", function () {
        openDetail(title, rows, true);
      });
      newCard.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDetail(title, rows, true);
        }
      });
    };

    bindKPI("kpiTotal", "كشف إجمالي الطلاب المسجلين", students);
    bindKPI("kpiSport", "كشف طلاب النشاط الرياضي ⚽", sportRows);
    bindKPI("kpiArt", "كشف طلاب النشاط الفني 🎨", artRows);
    bindKPI("kpiCulture", "كشف طلاب النشاط الثقافي 📚", cultureRows);
    bindKPI("kpiSocial", "كشف طلاب النشاط الاجتماعي 🤝", socialRows);
  }

  function bars(container, entries, onClick) {
    if (!container) return;
    container.innerHTML = "";
    if (!entries.length) {
      container.appendChild(el("div", { class: "empty", text: "لا توجد بيانات" }));
      return;
    }
    var max = entries[0][1];
    entries.forEach(function (pair, idx) {
      var name = pair[0], n = pair[1];
      var f = el("span", { class: "bar-fill" });
      f.style.setProperty("--w", (n / max * 100) + "%");

      var rankClass = idx === 0 ? "rank-1" : idx === 1 ? "rank-2" : idx === 2 ? "rank-3" : "";
      var rankBadge = el("span", { class: "rank-badge " + rankClass, text: String(idx + 1) });

      var b = el("button", { class: "bar-item", type: "button" },
        rankBadge,
        el("span", { class: "bar-label", text: name }),
        el("span", { class: "bar-track" }, f),
        el("b", { text: String(n) })
      );
      b.addEventListener("click", function () { onClick(name); });
      container.appendChild(b);
    });
  }

  function renderCharts() {
    /* Donut */
    var wrap = $("chDonut");
    if (wrap) {
      wrap.innerHTML = "";
      var items = ACTIVITIES.map(function (a) {
        return { a: a, n: students.filter(function (s) { return s.activities && s.activities[a.key] === true; }).length };
      });
      var total = items.reduce(function (x, y) { return x + y.n; }, 0);

      if (!total) {
        wrap.appendChild(el("div", { class: "empty", text: "لا توجد بيانات" }));
      } else {
        var NS = "http://www.w3.org/2000/svg", C = 2 * Math.PI * 70;
        var svg = document.createElementNS(NS, "svg");
        svg.setAttribute("viewBox", "0 0 200 200");
        var acc = 0;

        items.forEach(function (item) {
          var a = item.a, n = item.n;
          if (!n) return;
          var len = n / total * C;
          var c = document.createElementNS(NS, "circle");
          c.setAttribute("class", "seg"); c.setAttribute("cx", 100); c.setAttribute("cy", 100); c.setAttribute("r", 70);
          c.setAttribute("stroke", a.color); c.setAttribute("stroke-dashoffset", -acc);
          c.style.setProperty("--len", Math.max(len - 3, 1));
          c.addEventListener("click", function () {
            openDetail(a.label, students.filter(function (s) { return s.activities && s.activities[a.key] === true; }), true);
          });
          svg.appendChild(c); acc += len;
        });

        var mkText = function (y, txt, size, fill) {
          var t = document.createElementNS(NS, "text");
          t.setAttribute("x", 100); t.setAttribute("y", y); t.setAttribute("text-anchor", "middle"); t.setAttribute("fill", fill);
          t.setAttribute("font-size", size); t.setAttribute("font-weight", "800"); t.setAttribute("transform", "rotate(90 100 100)");
          t.textContent = String(txt);
          return t;
        };
        svg.appendChild(mkText(104, total, 32, "#fff"));
        svg.appendChild(mkText(124, "مشاركة", 12, "#98a1c0"));

        var legend = el("div", { class: "legend" });
        items.forEach(function (item) {
          var a = item.a, n = item.n;
          var b = el("button", { type: "button" },
            el("i"),
            el("span", { text: a.label }),
            el("b", { text: n + " طالب" })
          );
          b.style.setProperty("--c", a.color);
          b.addEventListener("click", function () {
            openDetail(a.label, students.filter(function (s) { return s.activities && s.activities[a.key] === true; }), true);
          });
          legend.appendChild(b);
        });
        wrap.appendChild(svg);
        wrap.appendChild(legend);
      }
    }

    var byCol = countBy(students, function (s) { return s.college; }).slice(0, 8);
    bars($("chColleges"), byCol, function (n) {
      openDetail("كلية " + n, students.filter(function (s) { return s.college === n; }), true);
    });

    var byGov = countBy(students, function (s) { return s.governorate; }).slice(0, 8);
    bars($("chGov"), byGov, function (n) {
      openDetail("محافظة " + n, students.filter(function (s) { return s.governorate === n; }), true);
    });

    renderHobbyChart();
  }

  function rebuildFilters() {
    var fAct = $("fAct"), fCol = $("fCol"), fGov = $("fGov");
    if (!fAct || !fCol || !fGov) return;

    var keepA = fAct.value, keepC = fCol.value, keepG = fGov.value;
    fAct.innerHTML = "";
    fAct.appendChild(el("option", { value: "", text: "كل الأنشطة" }));
    ACTIVITIES.forEach(function (a) {
      fAct.appendChild(el("option", { value: a.key, text: a.label }));
    });

    fCol.innerHTML = "";
    fCol.appendChild(el("option", { value: "", text: "كل الكليات" }));
    var colSet = new Set(COLLEGES.concat(students.map(function (s) { return s.college; }).filter(Boolean)));
    Array.from(colSet).forEach(function (c) {
      if (c) fCol.appendChild(el("option", { value: c, text: c }));
    });

    fGov.innerHTML = "";
    fGov.appendChild(el("option", { value: "", text: "كل المحافظات" }));
    Array.from(new Set(students.map(function (s) { return s.governorate; }))).sort().forEach(function (g) {
      if (g) fGov.appendChild(el("option", { value: g, text: g }));
    });

    fAct.value = keepA; fCol.value = keepC; fGov.value = keepG;
  }

  function filtered() {
    var q = toLatinDigits($("q") ? $("q").value : "").trim().toLowerCase();
    var a = $("fAct") ? $("fAct").value : "";
    var c = $("fCol") ? $("fCol").value : "";
    var g = $("fGov") ? $("fGov").value : "";

    return students.filter(function (s) {
      if (a && (!s.activities || s.activities[a] !== true)) return false;
      if (c && s.college !== c) return false;
      if (g && s.governorate !== g) return false;
      if (q) {
        var str = [s.name, s.code, s.phone, s.college, s.governorate, s.activityDetail].join(" ").toLowerCase();
        if (str.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function chips(s) {
    var frag = document.createDocumentFragment();
    actKeys(s).forEach(function (a) {
      var c = el("span", { class: "chip", text: a.label.replace("نشاط ", "") });
      c.style.setProperty("--c", a.color);
      frag.appendChild(c);
    });
    return frag;
  }

  function fillRows(tbody, rows, withActions, startAt) {
    startAt = startAt || 0;
    rows.forEach(function (s, i) {
      var initial = (s.name || "ط").trim().charAt(0);
      var studentCell = el("div", { class: "student-cell" },
        el("div", { class: "avatar-circle", text: initial }),
        el("b", { text: s.name })
      );

      var tr = el("tr", {},
        el("td", { text: String(startAt + i + 1) }),
        el("td", {}, studentCell),
        el("td", {}, el("span", { class: "code-badge", text: s.code })),
        el("td", { text: s.college }),
        el("td", { text: s.governorate }),
        el("td", { class: "ltr", text: s.phone }),
        el("td", {}, chips(s)),
        el("td", { text: s.activityDetail || "—" }),
        el("td", { text: fmtDate(s.createdAt) })
      );
      tr.style.animationDelay = Math.min(i, 20) * 25 + "ms";

      if (withActions) {
        tr.appendChild(el("td", {}, el("div", { class: "row-act" },
          el("button", { class: "icon-btn", type: "button", title: "تعديل", "aria-label": "تعديل", text: "✎", onclick: function () { openEdit(s); } }),
          el("button", { class: "icon-btn del", type: "button", title: "حذف", "aria-label": "حذف", text: "🗑", onclick: function () { openDelete(s); } })
        )));
      }
      tbody.appendChild(tr);
    });
  }

  function renderTable() {
    var tbl = $("tbl");
    if (!tbl) return;
    var rows = filtered();
    var tb = tbl.querySelector("tbody");
    tb.innerHTML = "";
    fillRows(tb, rows.slice(0, shown), true, 0);

    if ($("countPill")) $("countPill").textContent = rows.length + " طالب";
    if ($("pageInfo")) $("pageInfo").textContent = "عرض " + Math.min(shown, rows.length) + " من أصل " + rows.length + " سجل مفلتر (الإجمالي: " + students.length + ")";
    if ($("more")) $("more").hidden = rows.length <= shown;

    if (!rows.length) {
      tb.appendChild(el("tr", {}, el("td", { colspan: 10, class: "empty", text: "لا توجد سجلات مطابقة للبحث" })));
    }
  }

  /* ---------- Modal Helpers ---------- */
  function showModal() {
    var top = stack[stack.length - 1];
    if (!top) return;
    $("mTitle").textContent = top.title;
    $("mBack").hidden = stack.length < 2;
    $("mPrint").hidden = !top.rows;
    if ($("mXlsx")) $("mXlsx").hidden = !top.rows;
    var body = $("mBody"); body.innerHTML = "";
    body.appendChild(top.build());
    $("modal").hidden = false;
  }
  function pushModal(item) { stack.push(item); showModal(); }
  function closeModal() { stack = []; $("modal").hidden = true; }

  function openDetail(title, rows) {
    pushModal({
      title: title + " (" + rows.length + " طالب)", rows: rows,
      build: function () {
        var root = el("div");
        var tbody = el("tbody");
        root.appendChild(el("div", { class: "tbl-responsive" }, el("table", { class: "data-table" },
          el("thead", {}, el("tr", {}, ["#", "الاسم", "الكود", "الكلية", "المحافظة", "الموبايل", "الأنشطة", "نوع النشاط", "التاريخ"].map(function (h) { return el("th", { text: h }); }))),
          tbody
        )));
        fillRows(tbody, rows.slice(0, 300), false, 0);
        if (rows.length > 300) {
          root.appendChild(el("p", { class: "muted", text: "تم عرض أول 300 سجل من " + rows.length + ". استخدم الطباعة أو التصدير للقائمة الكاملة." }));
        }
        if (!rows.length) {
          tbody.appendChild(el("tr", {}, el("td", { colspan: 9, class: "empty", text: "لا توجد سجلات" })));
        }
        return root;
      }
    });
  }

  function openEdit(s) {
    pushModal({
      title: "تعديل بيانات الطالب",
      build: function () {
        var f = {
          name: el("input", { type: "text", maxlength: 100, value: s.name, class: "input-styled" }),
          college: el("select", { class: "input-styled" }),
          gov: el("select", { class: "input-styled" }),
          phone: el("input", { type: "tel", maxlength: 11, dir: "ltr", value: s.phone, class: "input-styled" }),
          detail: el("input", { type: "text", maxlength: 200, value: s.activityDetail || "", class: "input-styled" })
        };
        fillSelect(f.college, COLLEGES); f.college.value = s.college;
        fillSelect(f.gov, GOVERNORATES); f.gov.value = s.governorate;

        var checks = ACTIVITIES.map(function (a) {
          var i = el("input", { type: "checkbox" });
          i.checked = s.activities && s.activities[a.key] === true;
          return [a, i];
        });

        var msg = el("span", { class: "err" });
        var fld = function (label, node, full) {
          return el("div", { class: "field" + (full ? " full" : "") }, el("label", { class: "lbl", text: label }), node);
        };

        var save = el("button", { class: "btn btn-gold-shine", type: "button", text: "حفظ التعديلات" });
        save.addEventListener("click", function () {
          var actsObj = {};
          checks.forEach(function (pair) { actsObj[pair[0].key] = pair[1].checked; });

          var d = {
            name: cleanText(f.name.value, 100),
            college: cleanText(f.college.value, 60),
            governorate: f.gov.value,
            phone: toLatinDigits(f.phone.value).replace(/\s|-/g, ""),
            activities: actsObj,
            activityDetail: cleanText(f.detail.value, 200)
          };

          if (!/^[^ ]+( [^ ]+){3,}$/.test(d.name)) return msg.textContent = "الاسم يجب أن يكون رباعيًا";
          if (d.college.length < 2) return msg.textContent = "أدخل الكلية";
          if (!/^01[0125][0-9]{8}$/.test(d.phone)) return msg.textContent = "رقم الموبايل غير صحيح";
          var hasAct = Object.keys(d.activities).some(function (k) { return d.activities[k]; });
          if (!hasAct) return msg.textContent = "اختر نشاطًا واحدًا على الأقل";

          save.disabled = true;
          if (!db) return toast("تعذر الاتصال بقاعدة البيانات", "bad");

          db.ref("students/" + s._k).update({
            name: d.name,
            college: d.college,
            governorate: d.governorate,
            phone: d.phone,
            activities: d.activities,
            activityDetail: d.activityDetail,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
          }).then(function () {
            toast("تم حفظ التعديلات");
            closeModal();
          }).catch(function () {
            msg.textContent = "تعذر الحفظ";
            save.disabled = false;
          });
        });

        return el("div", {},
          el("div", { class: "form-grid" },
            fld("الاسم الرباعي", f.name, true),
            fld("كود الطالب (لا يمكن تغييره)", el("input", { type: "text", value: s.code, disabled: "", dir: "ltr", class: "input-styled" })),
            fld("رقم الموبايل", f.phone), fld("الكلية", f.college), fld("المحافظة", f.gov),
            el("div", { class: "full" }, el("label", { class: "lbl", text: "الأنشطة" }),
              el("div", { class: "checks" }, checks.map(function (pair) { return el("label", {}, pair[1], pair[0].label); }))),
            fld("نوع النشاط", f.detail, true)
          ),
          msg,
          el("div", { class: "form-actions" }, save, el("button", { class: "btn ghost", type: "button", text: "إلغاء", onclick: closeModal }))
        );
      }
    });
  }

  function openDelete(s) {
    pushModal({
      title: "تأكيد الحذف النهائي",
      build: function () {
        var go = el("button", { class: "btn danger", type: "button", text: "نعم، احذف نهائيًا" });
        go.addEventListener("click", function () {
          go.disabled = true;
          if (!db) return toast("تعذر الاتصال بقاعدة البيانات", "bad");
          db.ref("students/" + s._k).remove().then(function () {
            toast("تم حذف السجل");
            closeModal();
          }).catch(function () {
            toast("تعذر الحذف", "bad");
            go.disabled = false;
          });
        });

        return el("div", {},
          el("p", { class: "confirm-text" }, "هل أنت متأكد من حذف سجل الطالب ", el("b", { text: s.name }), " (كود: ", el("b", { text: s.code }), ")؟ لا يمكن التراجع عن هذا الإجراء."),
          el("div", { class: "form-actions" }, go, el("button", { class: "btn ghost", type: "button", text: "إلغاء", onclick: closeModal }))
        );
      }
    });
  }

  /* ---------- Exports & Printing ---------- */
  function exportRows(rows) {
    return [
      ["#", "الاسم الرباعي", "كود الطالب", "الكلية", "المحافظة", "رقم الموبايل", "نشاط رياضي", "نشاط فني", "نشاط ثقافي", "نشاط اجتماعي", "نوع النشاط", "تاريخ التسجيل"]
    ].concat(rows.map(function (s, i) {
      return [
        i + 1, s.name, s.code, s.college, s.governorate, s.phone,
        s.activities && s.activities.sport ? "نعم" : "",
        s.activities && s.activities.art ? "نعم" : "",
        s.activities && s.activities.culture ? "نعم" : "",
        s.activities && s.activities.social ? "نعم" : "",
        s.activityDetail || "", fmtDate(s.createdAt)
      ];
    }));
  }

  var pageStyle = null;
  function printReport(opts) {
    var area = $("printArea"); if (!area) return;
    area.innerHTML = "";
    var now = new Date();
    var dateStr = now.toLocaleDateString("ar-EG-u-nu-latn", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    var letterhead = el("div", { class: "lh" },
      el("img", { src: "assets/logo-navy.png", alt: "" }),
      el("div", { class: "names" },
        el("div", { class: "ar", text: "جامعة اللوتس بالمنيا" }),
        el("div", { class: "en", text: "LOTUS UNIVERSITY IN MINYA" }),
        el("div", { class: "dep", text: "تسجيل الأنشطة الطلابية – رعاية الشباب" })
      ),
      el("div", { class: "meta", text: now.toLocaleDateString("en-GB") })
    );

    var content = el("div", {},
      el("div", { class: "rtitle" }, el("h1", { text: opts.title }), opts.subtitle ? el("p", { text: opts.subtitle }) : null)
    );

    if (opts.html) {
      content.appendChild(opts.html);
    } else if (opts.blocks) {
      opts.blocks.forEach(function (b) {
        if (b.kv) {
          content.appendChild(el("div", { class: "kv" }, b.kv.map(function (pair) {
            return el("div", {}, el("b", { text: String(pair[1]) }), el("span", { text: pair[0] }));
          })));
        }
        if (b.head) {
          if (b.heading) content.appendChild(el("h2", { class: "sh", text: b.heading }));
          var ltrSet = new Set(b.ltr || []);
          content.appendChild(el("table", { class: "rep" },
            el("thead", {}, el("tr", {}, b.head.map(function (h) { return el("th", { text: h }); }))),
            el("tbody", {}, b.rows.map(function (r) {
              return el("tr", {}, r.map(function (c, i) {
                return el("td", { class: ltrSet.has(i) ? "ltr" : "", text: String(c) });
              }));
            }))
          ));
        }
      });
    }

    var footer = el("div", { class: "pf" },
      el("span", { text: "جامعة اللوتس بالمنيا – تسجيل الأنشطة الطلابية" }),
      el("span", { text: dateStr }),
      el("b", { class: "pf-mark", text: "B.S" })
    );

    area.appendChild(el("table", { class: "layout" },
      el("thead", {}, el("tr", {}, el("td", {}, letterhead))),
      el("tbody", {}, el("tr", {}, el("td", {}, content))),
      el("tfoot", {}, el("tr", {}, el("td", {}, footer)))
    ));

    if (pageStyle) pageStyle.remove();
    pageStyle = document.createElement("style");
    pageStyle.textContent = "@page{size:A4 " + (opts.orientation || "portrait") + "}";
    document.head.appendChild(pageStyle);

    var img = area.querySelector("img");
    var go = function () { setTimeout(function () { window.print(); }, 200); };
    if (img && img.complete) go(); else if (img) { img.onload = go; img.onerror = go; } else go();
  }

  function printStudents(rows, title) {
    if (!rows.length) return toast("لا توجد بيانات للطباعة", "bad");
    printReport({
      title: title || "كشف الطلاب المسجلين", subtitle: "إجمالي عدد الطلاب: " + rows.length, orientation: "portrait",
      blocks: [{
        head: ["#", "الاسم رباعي للطالب", "الكود", "الكلية", "المحافظة", "الموبايل", "الأنشطة", "نوع النشاط", "التاريخ"],
        ltr: [2, 5],
        rows: rows.map(function (s, i) {
          return [i + 1, s.name, s.code, s.college, s.governorate, s.phone, actText(s), s.activityDetail || "—", fmtDate(s.createdAt)];
        })
      }]
    });
  }

  /* ---------- DOM Listeners & Tabs ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    startBackground($("bg"));

    // Tab switcher logic
    var tabBtns = document.querySelectorAll(".tab-btn");
    tabBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = btn.dataset.tab;
        tabBtns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");

        var panes = document.querySelectorAll(".tab-pane");
        panes.forEach(function (p) { p.classList.remove("active"); });
        var activePane = $("pane-" + target);
        if (activePane) activePane.classList.add("active");
      });
    });

    var loginForm = $("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = $("email") ? $("email").value.trim() : "";
        var pass = $("pass") ? $("pass").value : "";
        if (!email || !pass) return loginMsg("يرجى إدخال البريد الإلكتروني وكلمة المرور");

        var loginBtn = $("loginBtn");
        if (loginBtn) loginBtn.disabled = true;
        loginMsg("جاري التحقق من الحساب...");

        if (typeof firebase === "undefined" || !firebase.auth) {
          if (loginBtn) loginBtn.disabled = false;
          return loginMsg("خدمة المصادقة غير متوفرة حالياً");
        }

        firebase.auth().signInWithEmailAndPassword(email, pass)
          .then(function () {
            loginMsg("");
            if ($("pass")) $("pass").value = "";
          })
          .catch(function (err) {
            if (loginBtn) loginBtn.disabled = false;
            var m = "بيانات الدخول غير صحيحة";
            if (err.code === "auth/invalid-email") m = "صيغة البريد الإلكتروني غير صحيحة";
            else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") m = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
            else if (err.code === "auth/too-many-requests") m = "تم حظر المحاولات لكثرة الأخطاء، يرجى الانتظار قليلاً";
            loginMsg(m);
            loginForm.classList.remove("shake");
            void loginForm.offsetWidth;
            loginForm.classList.add("shake");
          });
      });
    }

    if (typeof firebase !== "undefined" && firebase.auth) {
      firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
          unlockDashboard();
        } else {
          lockDashboard();
        }
      });
    } else {
      lockDashboard();
    }

    if ($("btnOut")) {
      $("btnOut").addEventListener("click", function () {
        if (typeof firebase !== "undefined" && firebase.auth) {
          firebase.auth().signOut().then(function () {
            lockDashboard();
          });
        } else {
          lockDashboard();
        }
      });
    }

    if ($("mClose")) $("mClose").addEventListener("click", closeModal);
    if ($("modal")) $("modal").addEventListener("click", function (e) { if (e.target === $("modal")) closeModal(); });
    if ($("mBack")) $("mBack").addEventListener("click", function () { stack.pop(); showModal(); });

    // Modal Export Excel & Print buttons
    if ($("mXlsx")) {
      $("mXlsx").addEventListener("click", function () {
        var top = stack[stack.length - 1];
        if (top && top.rows) {
          if (!top.rows.length) return toast("لا توجد بيانات للتصدير", "bad");
          window.LUMExport.download(window.LUMExport.makeXlsx(exportRows(top.rows), "تفاصيل", [5, 32, 14, 22, 16, 15, 11, 11, 11, 12, 30, 14]), "report-" + new Date().toISOString().slice(0, 10) + ".xlsx");
        }
      });
    }

    if ($("mPrint")) {
      $("mPrint").addEventListener("click", function () {
        var top = stack[stack.length - 1];
        if (top && top.rows) printStudents(top.rows, top.title);
      });
    }

    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && $("modal") && !$("modal").hidden) closeModal();
    });

    ["q", "fAct", "fCol", "fGov"].forEach(function (id) {
      var elNode = $(id);
      if (elNode) {
        elNode.addEventListener("input", function () { shown = PAGE; renderTable(); });
        elNode.addEventListener("change", function () { shown = PAGE; renderTable(); });
      }
    });

    if ($("fReset")) {
      $("fReset").addEventListener("click", function () {
        if ($("q")) $("q").value = "";
        ["fAct", "fCol", "fGov"].forEach(function (i) { if ($(i)) $(i).value = ""; });
        shown = PAGE; renderTable();
      });
    }

    if ($("qHobby")) {
      $("qHobby").addEventListener("input", function () {
        renderHobbyChart();
      });
    }

    if ($("more")) $("more").addEventListener("click", function () { shown += PAGE; renderTable(); });

    // Export buttons
    var doXlsx = function () {
      var rows = filtered(); if (!rows.length) return toast("لا توجد بيانات للتصدير", "bad");
      window.LUMExport.download(window.LUMExport.makeXlsx(exportRows(rows), "الطلاب", [5, 32, 14, 22, 16, 15, 11, 11, 11, 12, 30, 14]), "students-" + new Date().toISOString().slice(0, 10) + ".xlsx");
    };
    if ($("btnXlsx")) $("btnXlsx").addEventListener("click", doXlsx);
    if ($("btnXlsx2")) $("btnXlsx2").addEventListener("click", doXlsx);

    if ($("btnPrintList")) $("btnPrintList").addEventListener("click", function () { printStudents(filtered()); });
    if ($("btnPrintListDirect")) $("btnPrintListDirect").addEventListener("click", function () { printStudents(filtered()); });

    if ($("btnPrintStats")) {
      $("btnPrintStats").addEventListener("click", function () {
        if (!students.length) return toast("لا توجد بيانات للطباعة", "bad");
        var T = students.length;
        var actCounts = ACTIVITIES.map(function (a) {
          return [a.label, students.filter(function (s) { return s.activities && s.activities[a.key] === true; }).length];
        });
        var govs = countBy(students, function (s) { return s.governorate; });
        var hb = hobbies(students).slice(0, 5);

        var statsHtml = el("div", { class: "stats-one-page" },
          el("div", { class: "kv kv5" },
            el("div", {}, el("b", { text: String(T) }), el("span", { text: "إجمالي الطلاب" })),
            el("div", {}, el("b", { text: String(actCounts[0][1]) }), el("span", { text: "رياضي ⚽" })),
            el("div", {}, el("b", { text: String(actCounts[1][1]) }), el("span", { text: "فني 🎨" })),
            el("div", {}, el("b", { text: String(actCounts[2][1]) }), el("span", { text: "ثقافي 📚" })),
            el("div", {}, el("b", { text: String(actCounts[3][1]) }), el("span", { text: "اجتماعي 🤝" }))
          ),
          el("div", { class: "print-grid2" },
            el("div", { class: "pg-col" },
              el("h2", { class: "sh", text: "توزيع الطلاب حسب كليات الجامعة الـ 8" }),
              el("table", { class: "rep sm" },
                el("thead", {}, el("tr", {}, ["اسم الكلية", "العدد", "النسبة"].map(function (h) { return el("th", { text: h }); }))),
                el("tbody", {}, COLLEGES.map(function (c) {
                  var count = students.filter(function (s) { return s.college === c; }).length;
                  return el("tr", {}, el("td", { text: c }), el("td", { text: String(count) }), el("td", { text: pct(count, T) }));
                }))
              )
            ),
            el("div", { class: "pg-col" },
              el("h2", { class: "sh", text: "توزيع المشاركات في الأنشطة" }),
              el("table", { class: "rep sm" },
                el("thead", {}, el("tr", {}, ["النشاط", "المشاركون", "النسبة"].map(function (h) { return el("th", { text: h }); }))),
                el("tbody", {}, actCounts.map(function (pair) {
                  return el("tr", {}, el("td", { text: pair[0] }), el("td", { text: String(pair[1]) }), el("td", { text: pct(pair[1], T) }));
                }))
              ),
              (hb.length ? el("div", {},
                el("h2", { class: "sh", text: "أبرز الأنشطة المكتوبة" }),
                el("table", { class: "rep sm" },
                  el("thead", {}, el("tr", {}, ["اسم الهواية / النشاط", "التكرار"].map(function (h) { return el("th", { text: h }); }))),
                  el("tbody", {}, hb.map(function (pair) {
                    return el("tr", {}, el("td", { text: pair[0] }), el("td", { text: String(pair[1]) }));
                  }))
                )
              ) : null),
              (govs.length ? el("div", {},
                el("h2", { class: "sh", text: "أبرز المحافظات تفاعلاً" }),
                el("div", { class: "govs-summary", text: govs.slice(0, 5).map(function (g) { return g[0] + " (" + g[1] + ")"; }).join(" • ") })
              ) : null)
            )
          )
        );

        printReport({
          title: "تقرير الإحصائيات الشامل للأنشطة الطلابية",
          subtitle: "إجمالي بيانات " + T + " طالب مسجل بجامعة اللوتس",
          orientation: "portrait",
          html: statsHtml
        });
      });
    }

    window.addEventListener("afterprint", function () {
      if ($("printArea")) $("printArea").innerHTML = "";
      if (pageStyle) { pageStyle.remove(); pageStyle = null; }
    });
  });
})();
