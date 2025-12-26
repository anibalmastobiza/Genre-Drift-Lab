(async function () {
  // 1. Configuración de Google Sheets (integrada)
  const SHEETS_WEBAPP_URL = ""; // Pega tu URL aquí si la tienes

  async function postToSheet(payload) {
    if (!SHEETS_WEBAPP_URL || SHEETS_WEBAPP_URL.includes("PASTE_")) {
       console.log("Guardado omitido (URL no configurada):", payload);
       return { ok: true, skipped: true };
    }
    const res = await fetch(SHEETS_WEBAPP_URL, {
      method: "POST", mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Sheets POST failed: ${res.status}`);
    return await res.json();
  }

  // 2. Datos de los textos (incrustados para evitar errores de carga local)
  const PASSAGES_DATA = [
    {"id":"p001","year":1895,"region":"UK","market_label":"Sensation","text":"It was near midnight when the telegram arrived, and the house had already begun to settle into its habitual silence."},
    {"id":"p002","year":1911,"region":"US","market_label":"Adventure","text":"The river turned sharply, and the current took the boat as if it had a will of its own, indifferent to our shouting."},
    {"id":"p003","year":1820,"region":"FR","market_label":"Romance","text":"She read the letter twice, slowly, as though the second time might alter the meaning that bruised her pride."},
    {"id":"p004","year":1922,"region":"IE","market_label":"Literary","text":"A thought—thin as a thread—ran through the day’s noise and tied itself to the next, refusing to break."},
    {"id":"p005","year":1870,"region":"UK","market_label":"Realist","text":"The clerk’s hands were clean, his cuffs precise, and yet the air about him carried the fatigue of small accounts."},
    {"id":"p006","year":1905,"region":"US","market_label":"Pulp","text":"He kicked open the door, and the room answered with gun-smoke and laughter, both equally cheap."},
    {"id":"p007","year":1797,"region":"UK","market_label":"Gothic","text":"The corridor narrowed into shadow; the candle’s light trembled, as if it feared what waited beyond the arch."},
    {"id":"p008","year":1930,"region":"US","market_label":"Speculative","text":"When the machine spoke, it did not sound like metal; it sounded like a patient, careful teacher correcting a mistake."},
    {"id":"p009","year":1884,"region":"UK","market_label":"Crime","text":"The evidence was ordinary—mud, a button, a delay—until you saw how neatly it assembled into intention."},
    {"id":"p010","year":1813,"region":"UK","market_label":"Domestic","text":"At tea, the conversation turned, as it always did, to money—never named, always present, like a second tablecloth."},
    {"id":"p011","year":1847,"region":"UK","market_label":"Romance","text":"He offered no explanation, only a look that asked to be believed, and she found herself believing too easily."},
    {"id":"p012","year":1890,"region":"UK","market_label":"Detective","text":"The inspector listened as though the words were less important than the pauses between them."},
    {"id":"p013","year":1868,"region":"RU","market_label":"Realist","text":"He walked the same street daily, and each day it taught him a new way to be ashamed of the same life."},
    {"id":"p014","year":1926,"region":"US","market_label":"Modernist","text":"The sentence began again in his mind, not to conclude, but to circle what could not be said directly."},
    {"id":"p015","year":1799,"region":"DE","market_label":"Gothic","text":"A wind pressed at the shutters with insistence, like a visitor certain of its welcome."},
    {"id":"p016","year":1900,"region":"UK","market_label":"Imperial","text":"Maps made the world look obedient, but the heat on the ground refused those tidy borders."},
    {"id":"p017","year":1851,"region":"US","market_label":"Adventure","text":"The sea offered no counsel; it only repeated its arguments, wave after wave, until we agreed by exhaustion."},
    {"id":"p018","year":1888,"region":"US","market_label":"Domestic","text":"She arranged the room with care, as if order could persuade the day to behave."},
    {"id":"p019","year":1918,"region":"UK","market_label":"War","text":"The letter was brief; the grief was not. The news arrived in formal phrases that did not know his voice."},
    {"id":"p020","year":1838,"region":"UK","market_label":"Social","text":"The crowd admired virtue in public and punished it in private, with the same steady enthusiasm."}
  ];

  // 3. Lógica del experimento
  const app = document.getElementById("app");

  function fatal(err) {
    console.error(err);
    app.innerHTML = `
      <div class="card">
        <h2>Study failed to load</h2>
        <p class="small"><b>${(err && err.message) ? err.message : "Unknown error"}</b></p>
        <pre>${String(err && err.stack ? err.stack : err)}</pre>
      </div>
    `;
  }

  try {
    // Verificaciones de seguridad
    if (typeof initJsPsych !== "function") throw new Error("jsPsych core not loaded. Check internet connection.");
    if (typeof jsPsychHtmlKeyboardResponse === "undefined") throw new Error("Plugin missing: html-keyboard-response.");
    if (typeof jsPsychSurveyHtmlForm === "undefined") throw new Error("Plugin missing: survey-html-form.");
    if (typeof jsPsychCallFunction === "undefined") throw new Error("Plugin missing: call-function.");

    // Usamos los datos incrustados en vez de fetch
    const passages = PASSAGES_DATA;

    const uid =
      (window.crypto && crypto.randomUUID && crypto.randomUUID()) ||
      ("p_" + Math.random().toString(16).slice(2) + "_" + Date.now());

    const nowISO = () => new Date().toISOString();

    const arms = ["text_only", "light_metadata", "market_frame"];
    const arm = arms[Math.floor(Math.random() * arms.length)];

    const jsPsych = initJsPsych({
      display_element: "app",
      show_progress_bar: true,
      auto_update_progress_bar: false,
    });

    // -------- progress controller --------
    const TOTAL_STEPS = 1 /*consent*/ + 1 /*demo*/ + 1 /*instr*/ + 8 /*sliders*/ + 12 /*sim*/ + 4 /*repeat*/ + 1 /*debrief*/;
    let done = 0;

    function advanceProgress() {
      done += 1;
      const p = Math.min(1, done / TOTAL_STEPS);
      jsPsych.setProgressBar(p);
    }

    // -------- save last trial --------
    const pushLastTrial = {
      type: jsPsychCallFunction,
      async: true,
      func: async () => {
        // Obtenemos los últimos datos
        const dataCollection = jsPsych.data.get().last(1).values();
        if (dataCollection && dataCollection.length > 0) {
            const last = dataCollection[0];
            try {
              await postToSheet({ event: "TRIAL", timestamp: nowISO(), uid, arm, trial: last });
            } catch (e) {
              console.error("Sheets push failed:", e);
            }
        }
      }
    };

    // -------- blocks --------
    const consent = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `
        <div class="card">
          <div class="topbar">
            <h1>Genre Drift Lab</h1>
            <div class="pill">anonymous · ~12–15 min</div>
          </div>
          <p>You will read short passages and make judgments about genre/style.</p>
          <p class="small">Press <kbd>SPACE</kbd> to consent and continue.</p>
        </div>`,
      choices: [" "],
      on_finish: () => advanceProgress(),
    };

    const demographics = {
      type: jsPsychSurveyHtmlForm,
      html: `
        <div class="card">
          <h2>About you</h2>
          <label>Age band
            <select name="age_band" required>
              <option value="">Select…</option>
              <option>18–24</option><option>25–34</option><option>35–44</option>
              <option>45–54</option><option>55–64</option><option>65+</option>
            </select>
          </label>
          <label>First language <input name="first_language" type="text" required /></label>
          <label>Country <input name="country" type="text" required /></label>
          <label>Reading frequency
            <select name="reading_freq" required>
              <option value="">Select…</option>
              <option>Daily</option><option>Weekly</option><option>Monthly</option><option>Rarely</option>
            </select>
          </label>
          <label>Genre familiarity (0–10)
            <input name="genre_familiarity" type="number" min="0" max="10" required />
          </label>
          <button class="btn" type="submit">Continue</button>
        </div>`,
      on_finish: () => advanceProgress(),
    };

    const instructions = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `
        <div class="card">
          <h2>How it works</h2>
          <p class="small">
            Two tasks:
            <br>1) <b>Sliders</b> (continuous judgments)
            <br>2) <b>Similarity picks</b> (press <kbd>1</kbd> or <kbd>2</kbd>)
          </p>
          <p class="small">Press <kbd>SPACE</kbd> to begin.</p>
        </div>`,
      choices: [" "],
      on_finish: () => advanceProgress(),
    };

    function sliderTrial(p, withFrame, phaseTag) {
      const frameHTML = withFrame
        ? `
          <div class="frame">
            <div><b>Year:</b> ${p.year}</div>
            <div><b>Region:</b> ${p.region}</div>
            ${arm === "market_frame" ? `<div><b>Market label:</b> ${p.market_label}</div>` : ""}
          </div>`
        : "";

      const shelfOptions = [
        "Literary fiction","Romance","Crime / mystery","Speculative / SF",
        "Adventure","Gothic / horror","Historical","Other / mixed"
      ].map(x => `<option value="${x}">${x}</option>`).join("");

      return {
        type: jsPsychHtmlKeyboardResponse,
        choices: "NO_KEYS",
        stimulus: `
          <div class="card wide">
            <div class="topbar">
              <div><b>Read the passage</b></div>
              <div class="pill">arm: ${arm.replaceAll("_"," ")}</div>
            </div>
            ${frameHTML}
            <div class="passage">${p.text}</div>

            <div class="grid">
              <div class="scale">
                <div><b>Literary</b> ↔ <b>Popular</b></div>
                <div class="labels"><span>Literary</span><span>Popular</span></div>
                <input id="s1" type="range" min="0" max="100" value="50" />
              </div>

              <div class="scale">
                <div><b>Realism</b> ↔ <b>Speculation</b></div>
                <div class="labels"><span>Realism</span><span>Speculation</span></div>
                <input id="s2" type="range" min="0" max="100" value="50" />
              </div>

              <div class="scale">
                <div><b>Romance</b> ↔ <b>Anti-romance</b></div>
                <div class="labels"><span>Romance</span><span>Anti-romance</span></div>
                <input id="s3" type="range" min="0" max="100" value="50" />
              </div>

              <div class="scale">
                <div><b>Interiority</b> ↔ <b>Action</b></div>
                <div class="labels"><span>Interiority</span><span>Action</span></div>
                <input id="s4" type="range" min="0" max="100" value="50" />
              </div>

              <div class="scale">
                <div><b>Confidence</b></div>
                <div class="labels"><span>Low</span><span>High</span></div>
                <input id="conf" type="range" min="0" max="100" value="50" />
              </div>

              <div class="scale">
                <div><b>Closest shelf label</b></div>
                <select id="shelf" required>
                  <option value="">Select…</option>
                  ${shelfOptions}
                </select>
              </div>
            </div>

            <div class="btnrow">
              <button id="btn" class="btn">Continue</button>
            </div>
          </div>
        `,
        data: {
          task: "sliders",
          phase: phaseTag,
          passage_id: p.id,
          with_frame: !!withFrame,
          year: p.year,
          region: p.region,
          market_label: p.market_label
        },
        on_load: () => {
          document.getElementById("btn").addEventListener("click", () => {
            const shelf = document.getElementById("shelf").value;
            if (!shelf) { alert("Please select a shelf label."); return; }
            jsPsych.finishTrial({
              s_lit_pop: +document.getElementById("s1").value,
              s_real_spec: +document.getElementById("s2").value,
              s_rom_anti: +document.getElementById("s3").value,
              s_int_act: +document.getElementById("s4").value,
              confidence: +document.getElementById("conf").value,
              shelf_label: shelf
            });
          });
        },
        on_finish: () => advanceProgress()
      };
    }

    function similarityTrial(target, a, b) {
      return {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `
          <div class="card wide">
            <div class="topbar">
              <h2>Similarity pick</h2>
              <div class="pill">press 1 or 2</div>
            </div>
            <p class="small">Which candidate is <b>more similar</b> to the target (genre/style)?</p>

            <div class="triptych">
              <div class="panel">
                <div class="tag">Target</div>
                <div class="passage smallpass">${target.text}</div>
              </div>
              <div class="panel">
                <div class="tag">Press <kbd>1</kbd></div>
                <div class="passage smallpass">${a.text}</div>
              </div>
              <div class="panel">
                <div class="tag">Press <kbd>2</kbd></div>
                <div class="passage smallpass">${b.text}</div>
              </div>
            </div>
          </div>`,
        choices: ["1","2"],
        data: { task:"similarity", target_id: target.id, a_id: a.id, b_id: b.id },
        on_finish: (d) => {
          d.choice = (d.response === "1") ? "a" : "b";
          advanceProgress();
        }
      };
    }

    const shuffled = jsPsych.randomization.shuffle(passages);
    const mainSliders = shuffled.slice(0, 8);
    const simPool = shuffled.slice(8, 20);
    const repeats = jsPsych.randomization.sampleWithoutReplacement(mainSliders, 4);

    const simTrials = [];
    for (let i = 0; i < 12; i++) {
      const t = simPool[i % simPool.length];
      const pair = jsPsych.randomization.sampleWithoutReplacement(simPool.filter(x => x.id !== t.id), 2);
      simTrials.push(similarityTrial(t, pair[0], pair[1]));
    }

    const debrief = {
      type: jsPsychSurveyHtmlForm,
      html: `
        <div class="card">
          <h2>Debrief</h2>
          <label>What cues did you rely on most? <textarea name="cues" required></textarea></label>
          <label>Did any metadata influence you? How? <textarea name="frame_effect" required></textarea></label>
          <button class="btn" type="submit">Submit</button>
        </div>`,
      data: { task: "debrief" },
      on_finish: () => advanceProgress()
    };

    const finalPush = {
      type: jsPsychCallFunction,
      async: true,
      func: async () => {
        try {
          await postToSheet({
            event: "FINISH_ALL",
            timestamp: nowISO(),
            uid,
            arm,
            data: jsPsych.data.get().values()
          });
        } catch (e) {
          console.error("Final push failed:", e);
        }
      }
    };

    // Timeline
    const timeline = [consent, pushLastTrial, demographics, pushLastTrial, instructions, pushLastTrial];

    mainSliders.forEach((p) => { timeline.push(sliderTrial(p, false, "main_text_only"), pushLastTrial); });
    simTrials.forEach((tr) => { timeline.push(tr, pushLastTrial); });

    const withFrame = arm !== "text_only";
    repeats.forEach((p) => { timeline.push(sliderTrial(p, withFrame, "repeat_frame_phase"), pushLastTrial); });

    timeline.push(debrief, pushLastTrial, finalPush);

    jsPsych.data.addProperties({ uid, arm });
    jsPsych.run(timeline);

  } catch (err) {
    fatal(err);
  }
})();
