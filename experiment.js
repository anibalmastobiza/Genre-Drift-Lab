(async function () {
  // ===========================================
  // 1. CONFIGURATION
  // ===========================================
  
  // Google Sheets Web App URL - PASTE YOUR URL HERE
  const SHEETS_WEBAPP_URL = "PASTE_YOUR_GOOGLE_SHEETS_WEBAPP_URL_HERE";
  
  // Prolific completion URL (redirect participants here when done)
  const PROLIFIC_COMPLETION_URL = "https://app.prolific.com/submissions/complete?cc=XXXXXXXX"; // Replace XXXXXXXX with your completion code

  // ===========================================
  // 2. PROLIFIC PARAMETERS
  // ===========================================
  
  const urlParams = new URLSearchParams(window.location.search);
  const PROLIFIC_PID = urlParams.get("PROLIFIC_PID") || "unknown";
  const STUDY_ID = urlParams.get("STUDY_ID") || "unknown";
  const SESSION_ID = urlParams.get("SESSION_ID") || "unknown";

  // ===========================================
  // 3. DATA STORAGE FUNCTIONS
  // ===========================================
  
  async function postToSheet(payload) {
    if (!SHEETS_WEBAPP_URL || SHEETS_WEBAPP_URL.includes("PASTE_")) {
      console.log("Sheet URL not configured. Data:", payload);
      return { ok: true, skipped: true };
    }
    try {
      const res = await fetch(SHEETS_WEBAPP_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Sheet POST failed:", e);
      return { ok: false, error: e.message };
    }
  }

  const nowISO = () => new Date().toISOString();

  // ===========================================
  // 4. PASSAGE DATA
  // ===========================================
  
  const PASSAGES_DATA = [
    {"id":"p001","year":1895,"region":"UK","market_label":"Sensation","text":"It was near midnight when the telegram arrived, and the house had already begun to settle into its habitual silence."},
    {"id":"p002","year":1911,"region":"US","market_label":"Adventure","text":"The river turned sharply, and the current took the boat as if it had a will of its own, indifferent to our shouting."},
    {"id":"p003","year":1820,"region":"FR","market_label":"Romance","text":"She read the letter twice, slowly, as though the second time might alter the meaning that bruised her pride."},
    {"id":"p004","year":1922,"region":"IE","market_label":"Literary","text":"A thought—thin as a thread—ran through the day's noise and tied itself to the next, refusing to break."},
    {"id":"p005","year":1870,"region":"UK","market_label":"Realist","text":"The clerk's hands were clean, his cuffs precise, and yet the air about him carried the fatigue of small accounts."},
    {"id":"p006","year":1905,"region":"US","market_label":"Pulp","text":"He kicked open the door, and the room answered with gun-smoke and laughter, both equally cheap."},
    {"id":"p007","year":1797,"region":"UK","market_label":"Gothic","text":"The corridor narrowed into shadow; the candle's light trembled, as if it feared what waited beyond the arch."},
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

  // ===========================================
  // 5. MAIN EXPERIMENT
  // ===========================================
  
  const app = document.getElementById("app");

  function fatal(err) {
    console.error(err);
    app.innerHTML = `
      <div class="card">
        <h1>Study Error</h1>
        <p>The study failed to load. Please refresh the page or contact the researcher.</p>
        <p class="small"><strong>Error:</strong> ${err?.message || "Unknown error"}</p>
      </div>
    `;
  }

  try {
    // Verify jsPsych loaded
    if (typeof initJsPsych !== "function") throw new Error("jsPsych not loaded");
    if (typeof jsPsychHtmlKeyboardResponse === "undefined") throw new Error("Missing plugin: html-keyboard-response");
    if (typeof jsPsychSurveyHtmlForm === "undefined") throw new Error("Missing plugin: survey-html-form");
    if (typeof jsPsychCallFunction === "undefined") throw new Error("Missing plugin: call-function");

    // Generate unique ID
    const uid = crypto?.randomUUID?.() || `p_${Math.random().toString(16).slice(2)}_${Date.now()}`;

    // Random arm assignment
    const arms = ["text_only", "light_metadata", "market_frame"];
    const arm = arms[Math.floor(Math.random() * arms.length)];

    // Initialize jsPsych
    const jsPsych = initJsPsych({
      display_element: "app",
      show_progress_bar: true,
      auto_update_progress_bar: false,
      on_finish: function() {
        // Redirect to Prolific on completion
        if (PROLIFIC_COMPLETION_URL && !PROLIFIC_COMPLETION_URL.includes("XXXXXXXX")) {
          window.location.href = PROLIFIC_COMPLETION_URL;
        }
      }
    });

    // Progress tracking
    const TOTAL_STEPS = 29; // consent + demo + instr + 8 sliders + 12 sim + 4 repeat + debrief + final
    let completedSteps = 0;

    function advanceProgress() {
      completedSteps++;
      jsPsych.setProgressBar(Math.min(1, completedSteps / TOTAL_STEPS));
    }

    // ===========================================
    // 6. TRIAL DEFINITIONS
    // ===========================================

    // --- CONSENT ---
    const consent = {
      type: jsPsychSurveyHtmlForm,
      html: `
        <div class="card">
          <div class="topbar">
            <div>
              <h1>Genre Drift Lab</h1>
              <p class="small">Computational Cognitive Science Study</p>
            </div>
            <div class="pill">~12-15 minutes</div>
          </div>
          
          <div class="consent-text">
            <h4>Purpose</h4>
            <p>This study investigates how people perceive and categorize literary genres based on textual cues.</p>
            
            <h4>What You Will Do</h4>
            <ul>
              <li>Read short passages from historical texts</li>
              <li>Rate passages on several stylistic dimensions</li>
              <li>Compare passages for similarity</li>
            </ul>
            
            <h4>Participation</h4>
            <p>Your participation is voluntary. You may withdraw at any time. All responses are anonymous.</p>
            
            <h4>Data Use</h4>
            <p>Data will be used for academic research only. No personally identifying information is collected.</p>
          </div>
          
          <label>
            <input type="checkbox" name="consent_check" value="yes" required />
            I have read the above information and consent to participate in this study.
          </label>
          
          <div class="btnrow">
            <button class="btn" type="submit">Begin Study</button>
          </div>
        </div>
      `,
      data: { task: "consent" },
      on_finish: (data) => {
        data.prolific_pid = PROLIFIC_PID;
        data.study_id = STUDY_ID;
        data.session_id = SESSION_ID;
        advanceProgress();
      }
    };

    // --- DEMOGRAPHICS ---
    const demographics = {
      type: jsPsychSurveyHtmlForm,
      html: `
        <div class="card">
          <h2>Background Information</h2>
          <p class="small">Please answer all questions to continue.</p>
          
          <label>
            <span class="required">Age range</span>
            <select name="age_band" required>
              <option value="">Select...</option>
              <option value="18-24">18-24</option>
              <option value="25-34">25-34</option>
              <option value="35-44">35-44</option>
              <option value="45-54">45-54</option>
              <option value="55-64">55-64</option>
              <option value="65+">65+</option>
            </select>
          </label>
          
          <label>
            <span class="required">First language</span>
            <input name="first_language" type="text" required placeholder="e.g., English, Spanish" />
          </label>
          
          <label>
            <span class="required">Country of residence</span>
            <input name="country" type="text" required placeholder="e.g., United Kingdom" />
          </label>
          
          <label>
            <span class="required">How often do you read fiction?</span>
            <select name="reading_freq" required>
              <option value="">Select...</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="rarely">Rarely or never</option>
            </select>
          </label>
          
          <label>
            <span class="required">Self-rated familiarity with literary genres (0 = none, 10 = expert)</span>
            <input name="genre_familiarity" type="number" min="0" max="10" required placeholder="0-10" />
          </label>
          
          <div class="btnrow">
            <button class="btn" type="submit">Continue</button>
          </div>
        </div>
      `,
      data: { task: "demographics" },
      on_finish: () => advanceProgress()
    };

    // --- INSTRUCTIONS ---
    const instructions = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `
        <div class="card">
          <h2>Instructions</h2>
          
          <div class="instructions-list">
            <ol>
              <li><strong>Slider Ratings:</strong> You will read short passages and rate them on several stylistic dimensions using sliders.</li>
              <li><strong>Similarity Judgments:</strong> You will see a target passage and two candidates, then choose which candidate is more similar in genre/style to the target.</li>
            </ol>
          </div>
          
          <p>There are no right or wrong answers—we are interested in your intuitive judgments.</p>
          
          <p class="small">Press <kbd>SPACE</kbd> to begin.</p>
        </div>
      `,
      choices: [" "],
      data: { task: "instructions" },
      on_finish: () => advanceProgress()
    };

    // --- SLIDER TRIAL GENERATOR ---
    function createSliderTrial(passage, showFrame, phaseTag) {
      const frameHTML = showFrame ? `
        <div class="frame">
          <div><strong>Year:</strong> ${passage.year}</div>
          <div><strong>Region:</strong> ${passage.region}</div>
          ${arm === "market_frame" ? `<div><strong>Market:</strong> ${passage.market_label}</div>` : ""}
        </div>
      ` : "";

      const shelfOptions = [
        "Literary fiction", "Romance", "Crime/Mystery", "Speculative/SF",
        "Adventure", "Gothic/Horror", "Historical", "Other/Mixed"
      ].map(opt => `<option value="${opt}">${opt}</option>`).join("");

      return {
        type: jsPsychHtmlKeyboardResponse,
        choices: "NO_KEYS",
        stimulus: `
          <div class="card wide">
            <div class="topbar">
              <h2>Rate this passage</h2>
              <div class="pill">${phaseTag === "main_text_only" ? "Phase 1" : "Phase 2"}</div>
            </div>
            
            ${frameHTML}
            
            <div class="passage">${passage.text}</div>
            
            <div class="grid">
              <div class="scale">
                <div class="scale-title">Literary ↔ Popular</div>
                <div class="labels"><span>Literary</span><span>Popular</span></div>
                <input id="s_lit_pop" type="range" min="0" max="100" value="50" />
              </div>
              
              <div class="scale">
                <div class="scale-title">Realism ↔ Speculation</div>
                <div class="labels"><span>Realism</span><span>Speculation</span></div>
                <input id="s_real_spec" type="range" min="0" max="100" value="50" />
              </div>
              
              <div class="scale">
                <div class="scale-title">Romance ↔ Anti-romance</div>
                <div class="labels"><span>Romance</span><span>Anti-romance</span></div>
                <input id="s_rom_anti" type="range" min="0" max="100" value="50" />
              </div>
              
              <div class="scale">
                <div class="scale-title">Interiority ↔ Action</div>
                <div class="labels"><span>Interiority</span><span>Action</span></div>
                <input id="s_int_act" type="range" min="0" max="100" value="50" />
              </div>
              
              <div class="scale">
                <div class="scale-title">Your confidence in these ratings</div>
                <div class="labels"><span>Low</span><span>High</span></div>
                <input id="confidence" type="range" min="0" max="100" value="50" />
              </div>
              
              <div class="scale">
                <div class="scale-title required">Closest shelf label</div>
                <select id="shelf_label" required>
                  <option value="">Select...</option>
                  ${shelfOptions}
                </select>
                <span id="shelf_error" class="error-msg">Please select a shelf label</span>
              </div>
            </div>
            
            <div class="btnrow">
              <button id="continue_btn" class="btn">Continue</button>
            </div>
          </div>
        `,
        data: {
          task: "sliders",
          phase: phaseTag,
          passage_id: passage.id,
          with_frame: showFrame,
          year: passage.year,
          region: passage.region,
          market_label: passage.market_label
        },
        on_load: () => {
          document.getElementById("continue_btn").addEventListener("click", () => {
            const shelf = document.getElementById("shelf_label").value;
            if (!shelf) {
              document.getElementById("shelf_error").classList.add("visible");
              return;
            }
            jsPsych.finishTrial({
              s_lit_pop: +document.getElementById("s_lit_pop").value,
              s_real_spec: +document.getElementById("s_real_spec").value,
              s_rom_anti: +document.getElementById("s_rom_anti").value,
              s_int_act: +document.getElementById("s_int_act").value,
              confidence: +document.getElementById("confidence").value,
              shelf_label: shelf
            });
          });
        },
        on_finish: () => advanceProgress()
      };
    }

    // --- SIMILARITY TRIAL GENERATOR ---
    function createSimilarityTrial(target, optionA, optionB) {
      return {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `
          <div class="card wide">
            <div class="topbar">
              <h2>Similarity Judgment</h2>
              <div class="pill">Press 1 or 2</div>
            </div>
            
            <p>Which passage is <strong>more similar</strong> to the target in terms of genre and style?</p>
            
            <div class="triptych">
              <div class="panel target">
                <div class="tag">Target Passage</div>
                <div class="passage smallpass">${target.text}</div>
              </div>
              <div class="panel">
                <div class="tag">Option 1 — Press <kbd>1</kbd></div>
                <div class="passage smallpass">${optionA.text}</div>
              </div>
              <div class="panel">
                <div class="tag">Option 2 — Press <kbd>2</kbd></div>
                <div class="passage smallpass">${optionB.text}</div>
              </div>
            </div>
          </div>
        `,
        choices: ["1", "2"],
        data: {
          task: "similarity",
          target_id: target.id,
          option_a_id: optionA.id,
          option_b_id: optionB.id
        },
        on_finish: (data) => {
          data.chosen_option = data.response === "1" ? "a" : "b";
          data.chosen_id = data.response === "1" ? optionA.id : optionB.id;
          advanceProgress();
        }
      };
    }

    // --- DEBRIEF ---
    const debrief = {
      type: jsPsychSurveyHtmlForm,
      html: `
        <div class="card">
          <h2>Final Questions</h2>
          <p class="small">Please reflect on your experience in this study.</p>
          
          <label>
            <span class="required">What cues or features did you rely on most when making your judgments?</span>
            <textarea name="cues" required placeholder="Describe the textual features that influenced your ratings..."></textarea>
          </label>
          
          <label>
            <span class="required">If you saw metadata (year, region, etc.), did it influence your judgments? How?</span>
            <textarea name="frame_effect" required placeholder="Describe any influence of the metadata..."></textarea>
          </label>
          
          <label>
            <span>Any additional comments? (optional)</span>
            <textarea name="comments" placeholder="Optional feedback..."></textarea>
          </label>
          
          <div class="btnrow">
            <button class="btn" type="submit">Submit & Complete Study</button>
          </div>
        </div>
      `,
      data: { task: "debrief" },
      on_finish: () => advanceProgress()
    };

    // --- DATA PUSH TRIAL ---
    const pushData = {
      type: jsPsychCallFunction,
      async: true,
      func: async (done) => {
        const lastTrial = jsPsych.data.get().last(1).values()[0];
        if (lastTrial) {
          await postToSheet({
            event: "TRIAL",
            timestamp: nowISO(),
            uid: uid,
            arm: arm,
            prolific_pid: PROLIFIC_PID,
            study_id: STUDY_ID,
            session_id: SESSION_ID,
            trial: lastTrial
          });
        }
        done();
      }
    };

    // --- FINAL DATA PUSH ---
    const finalPush = {
      type: jsPsychCallFunction,
      async: true,
      func: async (done) => {
        await postToSheet({
          event: "COMPLETE",
          timestamp: nowISO(),
          uid: uid,
          arm: arm,
          prolific_pid: PROLIFIC_PID,
          study_id: STUDY_ID,
          session_id: SESSION_ID,
          all_data: jsPsych.data.get().values()
        });
        done();
      }
    };

    // --- COMPLETION SCREEN ---
    const completion = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `
        <div class="card">
          <h1>Thank You!</h1>
          <p>Your responses have been recorded.</p>
          <p>You will be redirected to Prolific shortly...</p>
          <p class="small">If you are not redirected automatically, please click the button below.</p>
          <div class="btnrow">
            <a href="${PROLIFIC_COMPLETION_URL}" class="btn">Return to Prolific</a>
          </div>
        </div>
      `,
      choices: "NO_KEYS",
      trial_duration: 3000
    };

    // ===========================================
    // 7. BUILD TIMELINE
    // ===========================================

    // Shuffle passages
    const shuffled = jsPsych.randomization.shuffle(PASSAGES_DATA);
    const mainPassages = shuffled.slice(0, 8);
    const simPool = shuffled.slice(8, 20);
    const repeatPassages = jsPsych.randomization.sampleWithoutReplacement(mainPassages, 4);

    // Build similarity trials
    const similarityTrials = [];
    for (let i = 0; i < 12; i++) {
      const target = simPool[i % simPool.length];
      const candidates = jsPsych.randomization.sampleWithoutReplacement(
        simPool.filter(p => p.id !== target.id), 2
      );
      similarityTrials.push(createSimilarityTrial(target, candidates[0], candidates[1]));
    }

    // Assemble timeline
    const timeline = [];

    // Initial blocks
    timeline.push(consent, pushData);
    timeline.push(demographics, pushData);
    timeline.push(instructions, pushData);

    // Phase 1: Main slider trials (text only)
    mainPassages.forEach(p => {
      timeline.push(createSliderTrial(p, false, "main_text_only"), pushData);
    });

    // Phase 2: Similarity trials
    similarityTrials.forEach(trial => {
      timeline.push(trial, pushData);
    });

    // Phase 3: Repeat trials (with frame based on arm)
    const showFrame = arm !== "text_only";
    repeatPassages.forEach(p => {
      timeline.push(createSliderTrial(p, showFrame, "repeat_with_frame"), pushData);
    });

    // Final blocks
    timeline.push(debrief, pushData);
    timeline.push(finalPush);
    timeline.push(completion);

    // Add global properties
    jsPsych.data.addProperties({
      uid: uid,
      arm: arm,
      prolific_pid: PROLIFIC_PID,
      study_id: STUDY_ID,
      session_id: SESSION_ID,
      start_time: nowISO()
    });

    // Run experiment
    jsPsych.run(timeline);

  } catch (err) {
    fatal(err);
  }
})();
