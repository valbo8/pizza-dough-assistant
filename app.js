(() => {
  "use strict";

  const BASE = {
    flour: 940,
    water: 592,
    salt: 26,
    poolFlour: 300,
    poolWater: 300,
    yeast: 0.5,
    total: 1558
  };

  const stages = [
    { name: "Make poolish", hint: "Mix flour, water and IDY. Cover and leave at room temperature until mature, bubbly and aerated." },
    { name: "Make final dough", hint: "Use the poolish when it looks ready, even if the clock is slightly early or late." },
    { name: "45-minute bulk rest", hint: "Cover the finished dough at room temperature." },
    { name: "Refrigerate bulk dough", hint: "Use a very lightly oiled covered container; do not flour the dough." },
    { name: "Remove bulk from fridge", hint: "Keep covered while the bulk dough begins warming." },
    { name: "Divide and ball", hint: "Divide evenly, ball for structure, and keep covered at room temperature." },
    { name: "Make pizza 🍕", hint: "Open gently, preserve the rim gas, top and bake." }
  ];

  const $ = id => document.getElementById(id);
  let currentStage = 0;
  let activePlan = null;
  let awayRowId = 0;

  function round(n, digits = 0) {
    return Number(n.toFixed(digits));
  }

  function grams(n, digits = 0) {
    return `${round(n, digits)}g`;
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function isoDate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseLocal(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  }

  function dateFromISO(s) {
    if (!s) return null;
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }

  function addHours(date, hours) {
    return new Date(date.getTime() + hours * 3600000);
  }

  function fmt(date) {
    return date.toLocaleString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).replace(",", " ·");
  }

  function dayLabel(s) {
    const d = dateFromISO(s);
    return d ? d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : s;
  }

  function timeOptions(minMinutes = 0) {
    let html = "";
    for (let mins = minMinutes; mins <= 1410; mins += 30) {
      const hh = pad(Math.floor(mins / 60));
      const mm = pad(mins % 60);
      const value = `${hh}:${mm}`;
      html += `<option value="${value}">${value}</option>`;
    }
    return html;
  }

  function availableDays() {
    const start = dateFromISO($("startDate").value);
    const end = dateFromISO($("eatDate").value);
    if (!start || !end || end < start) return [];
    const days = [];
    const cursor = new Date(start);
    while (cursor <= end && days.length < 14) {
      days.push(isoDate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  function dayOptions(selected) {
    const days = availableDays();
    return days.map(day => `<option value="${day}" ${day === selected ? "selected" : ""}>${dayLabel(day)}</option>`).join("");
  }

  function refreshEnd(row) {
    const from = row.querySelector(".away-from");
    const to = row.querySelector(".away-to");
    const old = to.value;
    const [h, m] = from.value.split(":").map(Number);
    const start = h * 60 + m + 30;
    to.innerHTML = timeOptions(start);
    if ([...to.options].some(option => option.value === old)) to.value = old;
  }

  function addAway(defaults = {}) {
    const days = availableDays();
    if (!days.length) return;

    awayRowId += 1;
    const row = document.createElement("div");
    row.className = "away-row";
    row.dataset.id = String(awayRowId);

    const defaultDay = defaults.day && days.includes(defaults.day)
      ? defaults.day
      : days[Math.min(1, days.length - 1)];

    row.innerHTML = `
      <label class="day-wrap">
        <span>Day</span>
        <select class="away-day">${dayOptions(defaultDay)}</select>
      </label>
      <label>
        <span>From</span>
        <select class="away-from">${timeOptions(0)}</select>
      </label>
      <label>
        <span>Until</span>
        <select class="away-to"></select>
      </label>
      <div class="remove-wrap">
        <span style="display:block;height:22px" aria-hidden="true"></span>
        <button class="btn remove-away" type="button" aria-label="Remove unavailable period">✕</button>
      </div>
    `;

    $("awayList").appendChild(row);

    row.querySelector(".away-from").value = defaults.from || "08:00";
    refreshEnd(row);

    const to = row.querySelector(".away-to");
    if (defaults.to && [...to.options].some(option => option.value === defaults.to)) {
      to.value = defaults.to;
    }

    row.querySelector(".away-from").addEventListener("change", () => refreshEnd(row));
    row.querySelector(".remove-away").addEventListener("click", () => row.remove());
  }

  function refreshDayDropdowns() {
    const days = availableDays();
    document.querySelectorAll(".away-day").forEach(select => {
      const old = select.value;
      const selected = days.includes(old) ? old : days[0];
      select.innerHTML = dayOptions(selected);
    });
  }

  function getAwayPeriods() {
    return [...document.querySelectorAll(".away-row")].map(row => {
      const day = row.querySelector(".away-day").value;
      const from = row.querySelector(".away-from").value;
      const to = row.querySelector(".away-to").value;

      return {
        start: parseLocal(day, from),
        end: parseLocal(day, to),
        label: `${dayLabel(day)} ${from}–${to}`
      };
    }).filter(period => period.start && period.end && period.end > period.start);
  }

  function clashFor(time, periods) {
    return periods.find(period => time >= period.start && time <= period.end) || null;
  }

  function setDefaultDates() {
    const now = new Date();
    const eat = new Date(now);
    eat.setDate(eat.getDate() + 1);
    $("startDate").value = isoDate(now);
    $("eatDate").value = isoDate(eat);
  }

  function calculate() {
    const count = Math.max(1, Math.min(20, Number($("pizzas").value) || 6));
    const diameter = Number($("diameter").value) || 12;
    const areaScale = Math.pow(diameter / 12, 2);
    const scale = (count / 6) * areaScale;

    const eat = parseLocal($("eatDate").value, $("eatTime").value);
    const earliest = parseLocal($("startDate").value, $("startTime").value);

    if (!eat) {
      $("notice").style.display = "block";
      $("notice").textContent = "Choose an eat date and time.";
      return;
    }

    if (earliest && earliest >= eat) {
      $("notice").style.display = "block";
      $("notice").textContent = "Your earliest start must be before pizza time.";
      return;
    }

    const q = {
      flour: BASE.flour * scale,
      water: BASE.water * scale,
      salt: BASE.salt * scale,
      poolFlour: BASE.poolFlour * scale,
      poolWater: BASE.poolWater * scale,
      yeast: BASE.yeast * scale,
      total: BASE.total * scale
    };

    q.finalFlour = q.flour - q.poolFlour;
    q.remainingWater = q.water - q.poolWater;
    q.ball = q.total / count;

    // Golden baseline timing:
    // Poolish ≈ 29h before pizza
    // Final mix ≈ 21h45 before pizza
    // Fridge ≈ 20h30 before pizza
    // Remove bulk 6h before pizza
    // Ball 5h30 before pizza
    const pool = addHours(eat, -29);
    const finalMix = addHours(eat, -21.75);
    const bulkRestEnd = addHours(finalMix, 0.75);
    const fridge = addHours(finalMix, 1.5);
    const remove = addHours(eat, -6);
    const ball = addHours(eat, -5.5);

    const times = [pool, finalMix, bulkRestEnd, fridge, remove, ball, eat];
    const periods = getAwayPeriods();

    activePlan = { q, times, count, diameter, periods };

    $("totalDough").textContent = grams(q.total);
    $("ballWeight").textContent = `≈ ${grams(q.ball)}`;
    $("totalFlour").textContent = grams(q.flour);
    $("poolFlour").textContent = grams(q.poolFlour);
    $("poolWater").textContent = grams(q.poolWater);
    $("poolYeast").textContent = grams(q.yeast, 2);
    $("finalFlour").textContent = grams(q.finalFlour);
    $("remainingWater").textContent = grams(q.remainingWater);
    $("salt").textContent = grams(q.salt);

    const details = [
      `${grams(q.poolFlour)} flour + ${grams(q.poolWater)} water + ${grams(q.yeast, 2)} IDY`,
      `All poolish + ${grams(q.finalFlour)} flour + ${grams(q.remainingWater)} water + ${grams(q.salt)} salt`,
      "Finished dough covered at room temperature",
      "Very lightly oiled covered container",
      "Take the bulk dough out of the fridge",
      `${count} balls at approximately ${grams(q.ball)} each`,
      `${count} × ${diameter}-inch pizzas`
    ];

    $("timeline").innerHTML = stages.map((stage, index) => {
      const clash = clashFor(times[index], periods);
      return `
        <div class="step ${clash ? "clash" : ""}">
          <div class="when">${fmt(times[index])}</div>
          <div>
            <div class="what">${stage.name}</div>
            <div class="detail">${details[index]}</div>
            ${clash ? `<div class="clash-note">⚠ You're unavailable: ${clash.label}</div>` : ""}
          </div>
        </div>
      `;
    }).join("");

    const warnings = [];

    if (earliest && pool < earliest) {
      warnings.push(`Golden-baseline poolish start would be ${fmt(pool)}, before your earliest possible start of ${fmt(earliest)}.`);
    }

    const clashes = times.map((time, index) => {
      const period = clashFor(time, periods);
      return period ? `${stages[index].name} (${period.label})` : null;
    }).filter(Boolean);

    if (clashes.length) {
      warnings.push(`Schedule conflict${clashes.length > 1 ? "s" : ""}: ${clashes.join("; ")}.`);
    }

    const temp = Number($("temp").value);
    if (temp >= 24) warnings.push("Warm room: fermentation may run faster, so poolish maturity should override the clock.");
    if (temp && temp <= 18) warnings.push("Cool room: fermentation may run slower, so poolish maturity should override the clock.");

    $("notice").style.display = warnings.length ? "block" : "none";
    $("notice").textContent = warnings.join(" ");

    $("result").hidden = false;
    $("tracker").hidden = true;
    currentStage = 0;
    updateTracker();
    $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateTracker() {
    if (!activePlan) return;

    const q = activePlan.q;
    const qty = [
      `${grams(q.poolFlour)} flour · ${grams(q.poolWater)} water · ${grams(q.yeast, 2)} IDY`,
      `${grams(q.finalFlour)} flour · ${grams(q.remainingWater)} water · ${grams(q.salt)} salt`,
      "Keep covered",
      "Very lightly oil the container",
      "Keep bulk covered",
      `${activePlan.count} × ≈${grams(q.ball)} balls`,
      `${activePlan.count} × ${activePlan.diameter}-inch pizzas`
    ];

    $("nextAction").textContent = stages[currentStage].name;
    $("nextTime").textContent = fmt(activePlan.times[currentStage]);
    $("nextQty").textContent = qty[currentStage];
    $("stageHint").textContent = stages[currentStage].hint;
    $("bar").style.width = `${((currentStage + 1) / stages.length) * 100}%`;
    $("backBtn").disabled = currentStage === 0;
    $("doneBtn").textContent = currentStage === stages.length - 1 ? "Finished 🍕" : "Done — next step";
  }

  $("addAway").addEventListener("click", () => addAway());
  $("startDate").addEventListener("change", refreshDayDropdowns);
  $("eatDate").addEventListener("change", refreshDayDropdowns);
  $("calculateBtn").addEventListener("click", calculate);

  $("editBtn").addEventListener("click", () => {
    $("setupPanel").hidden = false;
    $("result").hidden = true;
    $("tracker").hidden = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("startBtn").addEventListener("click", () => {
    $("setupPanel").hidden = true;
    $("result").hidden = true;
    $("tracker").hidden = false;
    currentStage = 0;
    updateTracker();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("doneBtn").addEventListener("click", () => {
    if (currentStage < stages.length - 1) {
      currentStage += 1;
      updateTracker();
    }
  });

  $("backBtn").addEventListener("click", () => {
    if (currentStage > 0) {
      currentStage -= 1;
      updateTracker();
    }
  });

  $("newPlanBtn").addEventListener("click", () => {
    $("setupPanel").hidden = false;
    $("result").hidden = true;
    $("tracker").hidden = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  setDefaultDates();
  addAway({ from: "08:00", to: "12:00" });
  calculate();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }
})();
