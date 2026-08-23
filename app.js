const words = [
  { word: "adventure", phonetic: "/ədˈven.tʃər/", fa: "ماجراجویی", category: "Travel", meaning: "An exciting or unusual experience.", example: "Our weekend hike was a real adventure." },
  { word: "invite", phonetic: "/ɪnˈvaɪt/", fa: "دعوت کردن", category: "Social", meaning: "To ask someone to come somewhere or do something.", example: "I want to invite Sara to the picnic." },
  { word: "journey", phonetic: "/ˈdʒɜː.ni/", fa: "سفر", category: "Travel", meaning: "The act of travelling from one place to another.", example: "The train journey took three hours." },
  { word: "suggest", phonetic: "/səˈdʒest/", fa: "پیشنهاد دادن", category: "Conversation", meaning: "To mention an idea or plan for someone to consider.", example: "Can you suggest a good restaurant?" },
  { word: "available", phonetic: "/əˈveɪ.lə.bəl/", fa: "در دسترس، آزاد", category: "Daily life", meaning: "Free and able to do something at a particular time.", example: "Are you available on Saturday?" },
  { word: "improve", phonetic: "/ɪmˈpruːv/", fa: "بهبود دادن", category: "Learning", meaning: "To become better, or to make something better.", example: "Daily practice will improve your English." },
  { word: "confident", phonetic: "/ˈkɒn.fɪ.dənt/", fa: "بااعتمادبه‌نفس", category: "Learning", meaning: "Feeling sure about your abilities.", example: "She feels confident speaking English." },
  { word: "schedule", phonetic: "/ˈʃed.juːl/", fa: "برنامه زمانی", category: "Daily life", meaning: "A plan showing when activities will happen.", example: "Let me check my schedule." },
];

const copy = {
  en: { learn: "Learn", dictionary: "Dictionary", progress: "Progress", today: "Today", path: "Learning path", vocabulary: "Vocabulary", grammar: "Grammar", speaking: "Speaking", myWords: "My words", library: "LIBRARY", weekly: "Weekly goal", goal: "Two more lessons to go!" },
  fa: { learn: "یادگیری", dictionary: "فرهنگ لغت", progress: "پیشرفت", today: "امروز", path: "مسیر یادگیری", vocabulary: "واژگان", grammar: "گرامر", speaking: "مکالمه", myWords: "واژه‌های من", library: "کتابخانه", weekly: "هدف هفتگی", goal: "فقط دو درس دیگر مانده!" },
};

const savedFromStorage = JSON.parse(localStorage.getItem("enacademy-saved") || "[]");
const settings = JSON.parse(localStorage.getItem("enacademy-settings") || "{}");
const state = {
  view: "today",
  language: settings.language || "en",
  mode: settings.mode || "dark",
  palette: settings.palette || "midnight",
  themeOpen: false,
  mobileOpen: false,
  selectedWord: words[0].word,
  saved: new Set(savedFromStorage),
  grammarChoice: null,
  grammarChecked: false,
  recording: false,
  lessonStep: 0,
};

const app = document.querySelector("#app");
const tr = (en, fa) => state.language === "fa" ? fa : en;

function persist() {
  localStorage.setItem("enacademy-settings", JSON.stringify({ language: state.language, mode: state.mode, palette: state.palette }));
  localStorage.setItem("enacademy-saved", JSON.stringify([...state.saved]));
}

function button(label, view, icon) {
  return `<button class="side-item ${state.view === view ? "active" : ""}" data-view="${view}"><span>${icon}</span>${label}</button>`;
}

function shell() {
  const c = copy[state.language];
  document.documentElement.lang = state.language;
  document.documentElement.dir = state.language === "fa" ? "rtl" : "ltr";
  app.dir = document.documentElement.dir;
  app.dataset.mode = state.mode;
  app.dataset.palette = state.palette;
  app.innerHTML = `
    <header class="topbar">
      <button class="menu-button" data-action="menu" aria-label="Menu">☰</button>
      <button class="brand" data-view="today"><span class="brand-mark">EN</span><span>ENAcademy</span></button>
      <nav class="nav-links" aria-label="Main navigation">
        <button data-view="today" class="${["today","path","vocabulary","grammar","speaking","lesson"].includes(state.view) ? "active" : ""}">${c.learn}</button>
        <button data-view="dictionary" class="${state.view === "dictionary" ? "active" : ""}">${c.dictionary}</button>
        <button data-view="progress" class="${state.view === "progress" ? "active" : ""}">${c.progress}</button>
      </nav>
      <div class="header-actions">
        <button class="soft-button language-button" data-action="language">${state.language === "en" ? "EN · فارسی" : "فارسی · EN"}</button>
        <button class="icon-button" data-action="theme" aria-label="${tr("Appearance", "ظاهر سایت")}">${state.mode === "dark" ? "☾" : "☼"}</button>
        <button class="avatar" data-view="progress" aria-label="Profile">KS</button>
      </div>
      ${state.themeOpen ? themePanel() : ""}
    </header>
    <div class="dashboard-layout">
      <aside class="sidebar ${state.mobileOpen ? "mobile-open" : ""}" aria-label="Learning sections">
        <div class="side-label">${c.learn.toUpperCase()}</div>
        ${button(c.today, "today", "⌂")}
        ${button(c.path, "path", "↗")}
        ${button(c.vocabulary, "vocabulary", "Aa")}
        ${button(c.grammar, "grammar", "✦")}
        ${button(c.speaking, "speaking", "◉")}
        <div class="side-label library-label">${c.library}</div>
        ${button(c.dictionary, "dictionary", "⌕")}
        ${button(c.myWords, "saved", "♡")}
        <div class="sidebar-goal">
          <div class="goal-top"><span>${c.weekly}</span><strong>3/5</strong></div>
          <div class="progress-track"><span></span></div><small>${c.goal}</small>
        </div>
      </aside>
      <section class="content">${view()}</section>
    </div>`;
}

function themePanel() {
  const palettes = state.mode === "dark"
    ? [["midnight", "Midnight Academy", "#67d7b0"], ["forest", "Forest Night", "#9bd06f"], ["plum", "Royal Plum", "#d69be8"]]
    : [["classic", "Classic Green", "#0f7652"], ["sage", "Soft Sage", "#63805d"], ["sunrise", "Warm Sunrise", "#d36f3e"]];
  return `<div class="theme-panel">
    <div class="panel-head"><h3>${tr("Appearance", "ظاهر سایت")}</h3><button data-action="theme-close" aria-label="Close">×</button></div>
    <div class="mode-switch"><button data-mode="light" class="${state.mode === "light" ? "active" : ""}">☼ ${tr("Light", "روشن")}</button><button data-mode="dark" class="${state.mode === "dark" ? "active" : ""}">☾ ${tr("Dark", "تیره")}</button></div>
    <p class="panel-label">${tr("Color palette", "پالت رنگ")}</p>
    <div class="palette-list">${palettes.map(([id,name,color]) => `<button data-palette="${id}" class="${state.palette === id ? "active" : ""}"><i style="background:${color}"></i>${name}<span>${state.palette === id ? "✓" : ""}</span></button>`).join("")}</div>
  </div>`;
}

function heading(eyebrow, title, subtitle) {
  return `<div class="page-heading"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${subtitle}</p></div>`;
}

function view() {
  return ({ today, path, vocabulary, grammar, speaking, dictionary, saved, progress, lesson })[state.view]();
}

function today() {
  return `<div class="welcome-row"><div><p class="eyebrow">SUNDAY, AUGUST 16</p><h1>${tr("Good afternoon, Kourosh", "عصر بخیر، کوروش")} <span>👋</span></h1><p>${tr("Small steps, real progress. Let’s keep your streak alive.", "قدم‌های کوچک، پیشرفت واقعی. زنجیره‌ات را ادامه بده.")}</p></div>
    <div class="top-stats"><div class="xp-pill">◆ <strong>420 XP</strong></div><div class="streak-card"><span class="flame">♦</span><div><strong>${tr("7 day streak", "۷ روز پیوسته")}</strong><small>${tr("Personal best: 12 days", "رکورد شخصی: ۱۲ روز")}</small></div></div></div></div>
    <article class="lesson-hero"><div class="lesson-copy"><span class="lesson-badge">${tr("TODAY’S LESSON · A2", "درس امروز · A2")}</span><h2>${tr("Make plans for the weekend", "برای آخر هفته برنامه‌ریزی کن")}</h2><p>${tr("Learn to suggest activities, use “going to,” and invite a friend out.", "پیشنهاد دادن، استفاده از going to و دعوت از یک دوست را یاد بگیر.")}</p><div class="lesson-meta"><span>◷ 12 min</span><span>◆ +40 XP</span><span>4 activities</span></div><button class="primary-button" data-view="lesson">${tr("Continue lesson", "ادامه درس")}<span>→</span></button></div>
    <div class="lesson-visual" aria-hidden="true"><div class="speech-card card-one">What are you<br>doing Saturday?</div><div class="speech-card card-two">I’m going to<br>visit a friend!</div><div class="visual-orb orb-one"></div><div class="visual-orb orb-two"></div><div class="visual-person"><div class="head"></div><div class="body-shape"></div></div></div></article>
    <div class="section-heading"><div><p class="eyebrow">${tr("YOUR SKILLS", "مهارت‌های تو")}</p><h2>${tr("Keep building your English", "انگلیسی‌ات را قوی‌تر کن")}</h2></div><button data-view="path">${tr("View learning path", "مشاهده مسیر یادگیری")} →</button></div>
    <div class="skill-grid">${skillCard("vocabulary","vocab","Aa","Vocabulary","Travel & transport",68,"34 of 50 words")}${skillCard("grammar","grammar","✦","Grammar","Future plans",52,"6 of 12 lessons")}${skillCard("speaking","speaking","◉","Speaking","Making invitations",75,"Pronunciation: 75%")}</div>`;
}

function skillCard(viewName, className, icon, title, sub, width, detail) {
  return `<article class="skill-card ${className}" data-view="${viewName}"><div class="skill-icon">${icon}</div><div><h3>${title}</h3><p>${sub}</p><div class="mini-progress"><span style="width:${width}%"></span></div><small>${detail}</small></div><button aria-label="${title}">→</button></article>`;
}

function path() {
  const units = [
    ["✓","UNIT 1","Everyday connections","Greetings, introductions & routines",100,"→",false],
    ["2","UNIT 2","Plans & invitations","Future plans, times & activities",58,"→",false],
    ["3","UNIT 3","Around the city","Directions, transport & places",12,"→",false],
    ["4","UNIT 4","Food & experiences","Restaurants, opinions & stories",0,"⌑",true],
  ];
  return `${heading(tr("COURSE · ELEMENTARY", "دوره · مقدماتی"), tr("Your A2 learning path", "مسیر یادگیری A2 تو"), tr("Practical English for everyday conversations.", "انگلیسی کاربردی برای گفت‌وگوهای روزمره."))}
    <div class="level-banner"><div><span>${tr("Current course", "دوره فعلی")}</span><strong>A2 · Elementary</strong></div><div><span>${tr("Level progress", "پیشرفت سطح")}</span><strong>42%</strong><div class="progress-track"><i style="width:42%"></i></div></div></div>
    <div class="path-list">${units.map(([n,u,t,p,pct,arrow,locked]) => `<article class="${locked ? "locked" : ""}"><div class="unit-number">${n}</div><div class="unit-copy"><small>${u}</small><h3>${t}</h3><p>${p}</p><div class="mini-progress"><span style="width:${pct}%"></span></div></div><div class="unit-status"><strong>${pct}%</strong><button ${locked ? "disabled" : ""}>${arrow}</button></div></article>`).join("")}</div>`;
}

function vocabulary() {
  return `${heading(tr("WORD BANK · A2", "بانک واژگان · A2"), tr("Vocabulary review", "مرور واژگان"), tr("Tap a card to reveal the meaning, then listen to the pronunciation.", "روی کارت بزن تا معنی را ببینی، سپس تلفظ را گوش کن."))}
    <div class="vocab-summary"><div><strong>34</strong><span>${tr("words learned", "واژه آموخته")}</span></div><div><strong>8</strong><span>${tr("ready to review", "آماده مرور")}</span></div><div><strong>92%</strong><span>${tr("retention", "ماندگاری")}</span></div></div>
    <div class="flash-grid">${words.slice(0,6).map(w => `<article class="flash-card" data-flash="${w.word}"><div class="flash-actions"><button data-speak="${w.word}" aria-label="Pronounce">◖))</button><button data-save="${w.word}" aria-label="Save">${state.saved.has(w.word) ? "♥" : "♡"}</button></div><span class="word-tag">${w.category}</span><h3>${w.word}</h3><p>${w.phonetic}</p><small data-meaning>${tr("Tap to reveal meaning", "برای دیدن معنی کلیک کن")}</small></article>`).join("")}</div>`;
}

function grammar() {
  const options = ["I’m going to meet Ali on Friday.", "I going meet Ali on Friday.", "I’m go to meeting Ali on Friday."];
  return `${heading(tr("GRAMMAR · FUTURE PLANS", "گرامر · برنامه‌های آینده"), tr("Grammar practice", "تمرین گرامر"), tr("Choose the sentence that correctly describes a future plan.", "جمله درست برای یک برنامه آینده را انتخاب کن."))}
    <div class="grammar-card"><article class="grammar-rule"><span>going to</span><h3>${tr("Plans and intentions", "برنامه‌ها و قصدها")}</h3><p>${tr("Use am / is / are + going to + base verb for a plan you have already decided.", "برای برنامه‌ای که از قبل تصمیم گرفته‌ای از am / is / are + going to + فعل ساده استفاده کن.")}</p><code>I am going to + visit</code></article>
    <article class="question-box"><span class="question-count">1 / 3</span><h3>${tr("Which sentence is correct?", "کدام جمله درست است؟")}</h3>${options.map((o,i) => `<button data-grammar="${i}" class="${state.grammarChoice === i ? "selected" : ""} ${state.grammarChecked ? (i === 0 ? "correct" : state.grammarChoice === i ? "wrong" : "") : ""}"><b>${"ABC"[i]}</b>${o}</button>`).join("")}
    ${state.grammarChecked ? `<p class="feedback ${state.grammarChoice === 0 ? "correct-text" : "wrong-text"}">${state.grammarChoice === 0 ? tr("Correct — great work!", "درست است — آفرین!") : tr("Not quite. Remember: be + going to + base verb.", "هنوز نه. ساختار را به یاد داشته باش: be + going to + فعل ساده.")}</p>` : ""}
    <button class="primary-button dark" data-action="check-grammar" ${state.grammarChoice === null ? "disabled" : ""}>${tr("Check answer", "بررسی پاسخ")}</button></article></div>`;
}

function speaking() {
  return `${heading(tr("SPEAKING · REAL LIFE", "مکالمه · زندگی واقعی"), tr("Speaking lab", "آزمایشگاه مکالمه"), tr("Build confidence with a real-life invitation.", "با یک دعوت واقعی اعتمادبه‌نفس بساز."))}
    <div class="speaking-card"><article class="conversation"><div class="speaker-row"><span class="speaker-avatar blue">M</span><div><small>Maya</small><p>Are you free this Saturday?</p><button data-speak="Are you free this Saturday?">◖))</button></div></div><div class="speaker-row you"><span class="speaker-avatar gold">YOU</span><div><small>Your turn</small><p>I’m going to visit a friend on Saturday.</p><button data-speak="I'm going to visit a friend on Saturday.">◖))</button></div></div></article>
    <article class="record-panel ${state.recording ? "recording" : ""}"><div class="sound-wave"><i></i><i></i><i></i><i></i><i></i></div><p>${tr("Say: I’m going to visit a friend on Saturday.", "بگو: I’m going to visit a friend on Saturday.")}</p><button class="record-button" data-action="record"><span>●</span>${state.recording ? tr("Stop speaking", "پایان ضبط") : tr("Start speaking", "شروع مکالمه")}</button>${state.recording ? `<div class="transcript"><small>${tr("Listening…", "در حال شنیدن…")}</small>I’m going to visit a friend on Saturday.</div>` : ""}</article></div>`;
}

function dictionary() {
  const selected = words.find(w => w.word === state.selectedWord) || words[0];
  return `${heading(tr("MINI DICTIONARY", "فرهنگ لغت کوچک"), tr("Your pocket dictionary", "فرهنگ لغت همراه تو"), tr("Meaning, pronunciation, examples, and Persian translation—all in one place.", "معنی، تلفظ، مثال و ترجمه فارسی؛ همه در یک جا."))}
    <label class="dictionary-search"><span>⌕</span><input id="word-search" placeholder="${tr("Search an English word…", "یک واژه انگلیسی جست‌وجو کن…")}" /><kbd>⌘ K</kbd></label>
    <div class="dictionary-layout"><div class="word-results" id="word-results">${dictionaryResults(words)}</div><article class="definition-card" id="definition">${definition(selected)}</article></div>`;
}

function dictionaryResults(list) {
  return list.map(w => `<button data-word="${w.word}" class="${state.selectedWord === w.word ? "active" : ""}"><div><strong>${w.word}</strong><span>${w.phonetic}</span></div><small>${w.fa}</small></button>`).join("") || `<p style="padding:20px;color:var(--muted)">${tr("No matching words.", "واژه‌ای پیدا نشد.")}</p>`;
}

function definition(w) {
  return `<div class="word-top"><div><span class="word-tag">${w.category}</span><h2>${w.word}</h2><p>${w.phonetic}</p></div><button class="sound-button" data-speak="${w.word}" aria-label="Pronounce">◖))</button></div><div class="persian-meaning">${w.fa}</div><h4>${tr("Meaning", "معنی")}</h4><p>${w.meaning}</p><h4>${tr("Example", "مثال")}</h4><blockquote>“${w.example}”</blockquote><button class="save-button ${state.saved.has(w.word) ? "saved" : ""}" data-save="${w.word}">${state.saved.has(w.word) ? "♥ " + tr("Saved", "ذخیره شد") : "♡ " + tr("Save word", "ذخیره واژه")}</button>`;
}

function saved() {
  const list = words.filter(w => state.saved.has(w.word));
  return `${heading(tr("PERSONAL WORD BANK", "بانک واژگان شخصی"), tr("Your saved words", "واژه‌های ذخیره‌شده تو"), tr("Review words you want to remember.", "واژه‌هایی را که می‌خواهی به یاد بسپاری مرور کن."))}
    ${list.length ? `<div class="saved-list">${list.map(w => `<article><div><span class="word-tag">${w.category}</span><h3>${w.word}</h3><p>${w.phonetic} · ${w.fa}</p></div><div><button data-speak="${w.word}">◖))</button><button data-save="${w.word}">♥</button></div></article>`).join("")}</div>` : `<div class="empty-state"><span>♡</span><h2>${tr("Your saved list is empty.", "فهرست ذخیره‌های تو خالی است.")}</h2><p>${tr("Save a word from the dictionary.", "یک واژه از فرهنگ لغت ذخیره کن.")}</p><button class="primary-button dark" data-view="dictionary">${tr("Dictionary", "فرهنگ لغت")}</button></div>`}`;
}

function progress() {
  const bars = [42,68,54,82,61,90,74];
  const skills = [["Vocabulary",68],["Grammar",52],["Speaking",75],["Listening",61]];
  return `${heading(tr("YOUR LEARNING STORY", "داستان یادگیری تو"), tr("Your progress", "پیشرفت تو"), tr("Consistency is turning into confident English.", "پیوستگی در حال تبدیل شدن به انگلیسی روان است."))}
    <div class="stat-grid">${[["◆","420",tr("Total XP","مجموع امتیاز")],["Aa","34",tr("Words learned","واژه‌های آموخته")],["✓","6",tr("Lessons complete","درس‌های کامل")],["◎","88%",tr("Quiz accuracy","دقت آزمون")]].map(([i,n,l]) => `<article><span>${i}</span><strong>${n}</strong><small>${l}</small></article>`).join("")}</div>
    <div class="progress-layout"><article class="activity-card"><div class="card-heading"><div><h3>${tr("Learning activity", "فعالیت یادگیری")}</h3><p>${tr("Minutes practised this week", "دقایق تمرین این هفته")}</p></div><strong>86 min</strong></div><div class="bar-chart">${bars.map((h,i) => `<div><span style="height:${h}%"></span><small>${state.language === "fa" ? "دسچپجشی"[i] : "MTWTFSS"[i]}</small></div>`).join("")}</div></article>
    <article class="skill-radar"><h3>${tr("Skill strength", "قدرت مهارت‌ها")}</h3>${skills.map(([s,p]) => `<div class="strength"><div><span>${s}</span><strong>${p}%</strong></div><div class="mini-progress"><span style="width:${p}%"></span></div></div>`).join("")}</article></div>
    <article class="achievement-card"><div class="achievement-icon">★</div><div><span>${tr("LATEST ACHIEVEMENT", "جدیدترین دستاورد")}</span><h3>${tr("One week stronger", "یک هفته قوی‌تر")}</h3><p>${tr("You studied English for seven days in a row.", "هفت روز پیاپی انگلیسی تمرین کردی.")}</p></div><b>+75 XP</b></article>`;
}

const lessonStages = [
  () => `<p class="eyebrow">WARM UP</p><h1>Listen to the conversation</h1><div class="dialogue"><span class="speaker-avatar blue">M</span><div><p>Are you free this Saturday?</p><button data-speak="Are you free this Saturday?">◖))</button></div></div><div class="dialogue reply"><span class="speaker-avatar gold">K</span><div><p>I’m going to visit a friend. How about Sunday?</p><button data-speak="I'm going to visit a friend. How about Sunday?">◖))</button></div></div><div class="tip-box">Tip: Use “Are you free…?” to start a friendly invitation.</div>`,
  () => `<p class="eyebrow">VOCABULARY</p><h1>Useful words for making plans</h1><div class="lesson-words">${words.slice(1,5).map(w => `<button data-speak="${w.word}"><span>${w.word}</span><small>${w.fa}</small><i>◖))</i></button>`).join("")}</div>`,
  () => `<p class="eyebrow">GRAMMAR</p><h1>Talk about your plans</h1><div class="formula"><span>am / is / are</span><b>+</b><span>going to</span><b>+</b><span>base verb</span></div><div class="mini-grammar"><p>I <mark>am going to visit</mark> a friend.</p><p>We <mark>are going to watch</mark> a movie.</p></div>`,
  () => `<div class="completion"><div class="completion-ring">✓</div><h2>Lesson complete!</h2><p>You made plans, learned useful words, and practised “going to.”</p><div class="reward-grid"><div><strong>+40</strong><span>XP EARNED</span></div><div><strong>4</strong><span>ACTIVITIES</span></div><div><strong>8m</strong><span>LEARNING TIME</span></div></div><button class="primary-button dark" data-view="today">Back to dashboard</button></div>`,
];

function lesson() {
  const pct = ((state.lessonStep + 1) / lessonStages.length) * 100;
  return `<div class="lesson-page"><div class="lesson-top"><button data-action="lesson-close">×</button><div><span>${tr("TODAY’S LESSON", "درس امروز")}</span><div class="lesson-track"><i style="width:${pct}%"></i></div></div><b>${state.lessonStep + 1}/${lessonStages.length}</b></div><article class="lesson-stage">${lessonStages[state.lessonStep]()}</article><div class="lesson-footer"><button class="secondary-button" data-action="lesson-prev" ${state.lessonStep === 0 ? "disabled" : ""}>← ${tr("Back", "قبلی")}</button>${state.lessonStep < lessonStages.length - 1 ? `<button class="primary-button dark" data-action="lesson-next">${tr("Continue", "ادامه")} →</button>` : ""}</div></div>`;
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.88;
  speechSynthesis.speak(utterance);
}

app.addEventListener("click", event => {
  const viewTarget = event.target.closest("[data-view]");
  if (viewTarget) {
    state.view = viewTarget.dataset.view;
    state.mobileOpen = false;
    state.themeOpen = false;
    if (state.view === "lesson") state.lessonStep = 0;
    shell(); return;
  }
  const actionTarget = event.target.closest("[data-action]");
  if (actionTarget) {
    const action = actionTarget.dataset.action;
    if (action === "menu") state.mobileOpen = !state.mobileOpen;
    if (action === "language") state.language = state.language === "en" ? "fa" : "en";
    if (action === "theme") state.themeOpen = !state.themeOpen;
    if (action === "theme-close") state.themeOpen = false;
    if (action === "check-grammar") state.grammarChecked = true;
    if (action === "record") state.recording = !state.recording;
    if (action === "lesson-close") state.view = "today";
    if (action === "lesson-prev") state.lessonStep = Math.max(0, state.lessonStep - 1);
    if (action === "lesson-next") state.lessonStep = Math.min(lessonStages.length - 1, state.lessonStep + 1);
    persist(); shell(); return;
  }
  const modeTarget = event.target.closest("button[data-mode]");
  if (modeTarget) {
    state.mode = modeTarget.dataset.mode;
    state.palette = state.mode === "dark" ? "midnight" : "classic";
    persist(); shell(); return;
  }
  const paletteTarget = event.target.closest("button[data-palette]");
  if (paletteTarget) { state.palette = paletteTarget.dataset.palette; persist(); shell(); return; }
  const wordTarget = event.target.closest("[data-word]");
  if (wordTarget) { state.selectedWord = wordTarget.dataset.word; shell(); return; }
  const saveTarget = event.target.closest("[data-save]");
  if (saveTarget) {
    const word = saveTarget.dataset.save;
    state.saved.has(word) ? state.saved.delete(word) : state.saved.add(word);
    persist(); shell(); return;
  }
  const speakTarget = event.target.closest("[data-speak]");
  if (speakTarget) { event.stopPropagation(); speak(speakTarget.dataset.speak); return; }
  const grammarTarget = event.target.closest("[data-grammar]");
  if (grammarTarget && !state.grammarChecked) { state.grammarChoice = Number(grammarTarget.dataset.grammar); shell(); return; }
  const flashTarget = event.target.closest("[data-flash]");
  if (flashTarget) {
    const w = words.find(item => item.word === flashTarget.dataset.flash);
    flashTarget.classList.toggle("flipped");
    flashTarget.querySelector("[data-meaning]").textContent = flashTarget.classList.contains("flipped") ? `${w.fa} — ${w.meaning}` : tr("Tap to reveal meaning", "برای دیدن معنی کلیک کن");
  }
});

app.addEventListener("input", event => {
  if (event.target.id !== "word-search") return;
  const query = event.target.value.trim().toLowerCase();
  document.querySelector("#word-results").innerHTML = dictionaryResults(words.filter(w => `${w.word} ${w.fa} ${w.meaning}`.toLowerCase().includes(query)));
});

document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (state.view !== "dictionary") { state.view = "dictionary"; shell(); }
    document.querySelector("#word-search")?.focus();
  }
});

shell();
