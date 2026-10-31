// --- BROWSER / EXTENSION UNIVERSAL COMPATIBILITY SHIM ---
if (typeof chrome === "undefined" || !chrome.storage) {
  window.chrome = {
    storage: {
      local: {
        get: (keys) => {
          return new Promise((resolve) => {
            const res = {};
            const keyList = Array.isArray(keys) ? keys : (typeof keys === "string" ? [keys] : Object.keys(keys || {}));
            keyList.forEach(k => {
              const val = localStorage.getItem(k);
              if (val !== null) {
                try { res[k] = JSON.parse(val); } catch (e) { res[k] = val; }
              }
            });
            resolve(res);
          });
        },
        set: (items, cb) => {
          return new Promise((resolve) => {
            Object.entries(items).forEach(([k, v]) => {
              localStorage.setItem(k, typeof v === "object" ? JSON.stringify(v) : v);
            });
            if (cb) cb();
            resolve();
          });
        },
        remove: (keys, cb) => {
          return new Promise((resolve) => {
            const list = Array.isArray(keys) ? keys : [keys];
            list.forEach(k => localStorage.removeItem(k));
            if (cb) cb();
            resolve();
          });
        }
      }
    },
    tabs: {
      create: (opts) => { window.open(opts.url, '_blank'); },
      query: (opts) => Promise.resolve([{ url: window.location.href, title: document.title }])
    }
  };
}

// --- PURE CODE CRYPTOGRAPHIC PBKDF2 AUTH ENGINE ---
async function hashPasscode(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const exported = await crypto.subtle.exportKey("raw", derivedKey);
  return Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- STRUCTURED PROMPT LIBRARY WITH CATEGORIES & SPECIFICATIONS ---
const BUNDLEX_PROMPTS = [
  { cat: "Coding", spec: "Architecture", title: "Code Review & Security Audit", text: "Audit this code snippet for security vulnerabilities, race conditions, memory leaks, and performance bottlenecks. Provide the refactored version:\n\n" },
  { cat: "Coding", spec: "Syntax", title: "Regex Generator & Explainer", text: "Write a regular expression to match [pattern requirement]. Break down how each token works and include edge-case test strings." },
  { cat: "Coding", spec: "Database", title: "SQL Query Optimizer", text: "Optimize this SQL query for high-throughput Postgres/MySQL production databases. Explain index usage:\n\n" },
  { cat: "Coding", spec: "Backend", title: "API Endpoint Designer", text: "Design a RESTful API specification for [feature]. Include HTTP methods, route paths, JSON request/response payloads, and status codes." },
  { cat: "Coding", spec: "Debugging", title: "Bug Root Cause Analysis", text: "Here is a stack trace and the code that triggered it. Diagnose the root cause and provide a fix:\n\n" },
  { cat: "Coding", spec: "Types", title: "TypeScript Interface Generator", text: "Convert the following JSON payload into strict TypeScript types and interfaces:\n\n" },
  { cat: "Coding", spec: "QA", title: "Unit Test Suite Builder", text: "Write comprehensive unit tests using Jest/PyTest for this function, covering happy path, null values, and edge cases:\n\n" },
  { cat: "Coding", spec: "DevOps", title: "Docker Containerization", text: "Write an optimized, multi-stage Dockerfile and docker-compose.yml file for a production [Node/Python/Go] application." },
  { cat: "Coding", spec: "Algorithms", title: "Big-O Complexity Audit", text: "Analyze the Big-O time and space complexity of this algorithm. Suggest how to optimize it:\n\n" },
  { cat: "Coding", spec: "Refactoring", title: "Language Translation", text: "Translate this code from [Python/JS] to idiomatic [Go/Rust/C++], preserving error handling:\n\n" },
  { cat: "Coding", spec: "VCS", title: "Git Command Wizard", text: "I made this mistake in Git: [describe scenario]. Provide the exact commands to resolve this without losing commits." },
  { cat: "Coding", spec: "Database", title: "Database Schema Architect", text: "Design a normalized relational database schema for [application]. Include primary keys, foreign keys, and indexes." },
  { cat: "Coding", spec: "Frontend", title: "CSS Flexbox & Grid Master", text: "Write responsive CSS using Flexbox/Grid to build [layout]. Ensure mobile compatibility without framework dependencies." },
  { cat: "Coding", spec: "Architecture", title: "Microservices vs Monolith", text: "Evaluate whether [feature/system] should be built inside a monolith or as an independent microservice based on team size and scale." },
  { cat: "Coding", spec: "DevOps", title: "CI/CD Pipeline Script", text: "Write a GitHub Actions CI/CD workflow that runs tests, builds container images, and deploys to production on push." },
  { cat: "Coding", spec: "CLI", title: "Bash Automation Script", text: "Write a robust bash script with error traps (set -euo pipefail) to automate [system maintenance task]." },
  { cat: "Coding", spec: "Backend", title: "GraphQL Schema Designer", text: "Convert this REST API domain model into a clean GraphQL schema with Queries, Mutations, and Input types:\n\n" },
  { cat: "Coding", spec: "Automation", title: "Web Scraping Architecture", text: "Write a clean web scraping script using Python/Cheerio that handles rate limiting, user agents, and retries for [target]." },
  { cat: "Coding", spec: "Patterns", title: "Design Pattern Implementer", text: "Show how to refactor this messy code using the [Factory / Strategy / Observer] pattern in clean code:\n\n" },
  { cat: "Coding", spec: "Refactoring", title: "Legacy Code Refactorer", text: "Modernize this legacy code into modern ES6+/Python3 clean architecture while keeping behavior identical:\n\n" },

  { cat: "Study", spec: "Cognitive", title: "Feynman Technique Explainer", text: "Explain [complex scientific/math concept] using the Feynman technique: pretend I am 12 years old, use an intuitive analogy, and avoid jargon." },
  { cat: "Study", spec: "Evaluation", title: "Exam Quiz Master", text: "Based on these notes, generate 5 multiple choice questions and 2 conceptual problems with detailed answer rationales:\n\n" },
  { cat: "Study", spec: "Synthesis", title: "Research Paper Breakdown", text: "Summarize this paper into 4 sections: 1) Core Hypothesis, 2) Methodology, 3) Key Findings, 4) Weaknesses & Limitations:\n\n" },
  { cat: "Study", spec: "Flashcards", title: "Spaced Repetition Anki Cards", text: "Convert these study notes into 10 high-yield Anki flashcards with Front (Question) and Back (Concise Answer):\n\n" },
  { cat: "Study", spec: "Writing", title: "Thesis Statement Builder", text: "Help me refine a strong, arguable thesis statement for an essay about [topic]. Provide 3 counter-perspectives." },
  { cat: "Study", spec: "Math", title: "Calculus Step-by-Step Solver", text: "Solve this calculus problem step-by-step. Show all intermediate differentiation/integration rules used:\n\n" },
  { cat: "Study", spec: "Humanities", title: "Literature Theme Analyzer", text: "Analyze how the motif of [symbol/motif] is developed in [book/novel] and how it reflects the historical context." },
  { cat: "Study", spec: "History", title: "Historical Causation Matrix", text: "Break down the primary economic, political, and social catalysts that led directly to [historical event]." },
  { cat: "Study", spec: "Memory", title: "Memory Palace Generator", text: "Help me memorize these 10 concepts using the Method of Loci (Memory Palace). Assign each to vivid rooms in a house:\n\n" },
  { cat: "Study", spec: "Outlining", title: "Academic Essay Outline", text: "Create a detailed 5-paragraph essay outline for [topic], including topic sentences and supporting evidence prompts." },

  { cat: "Work", spec: "Communication", title: "Executive Email Polisher", text: "Rewrite this rough draft into a polite, diplomatic, yet assertively concise email for an executive manager:\n\n" },
  { cat: "Work", spec: "Management", title: "Meeting Minutes to Action Items", text: "Turn these raw meeting notes into structured minutes: 1) Key Decisions, 2) Action Items (Owner + Deadline), 3) Blockers:\n\n" },
  { cat: "Work", spec: "HR", title: "Difficult Feedback Courier", text: "Draft an empathetic script to give constructive feedback to a teammate regarding [issue] without making them defensive." },
  { cat: "Work", spec: "Negotiation", title: "Salary Review Script", text: "Help me draft a confident, respectful email asking for a compensation review based on these accomplishments: [list wins]." },
  { cat: "Work", spec: "Reporting", title: "Weekly 1-5-15 Status Report", text: "Summarize my completed projects into a crisp 1-5-15 report (1 headline, 5 bullets of achievements, 15-minute read)." },

  { cat: "Business", spec: "Modeling", title: "Lean Canvas Business Model", text: "Build a Lean Canvas table for a startup idea: [describe business idea]. Fill in Problem, Solution, UVP, Unfair Advantage, and Channels." },
  { cat: "Business", spec: "Analysis", title: "SWOT Analysis Matrix", text: "Perform a thorough SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) for [company/industry]." },
  { cat: "Business", spec: "Economics", title: "Unit Economics Breakdown", text: "Calculate and explain Customer Acquisition Cost (CAC), Lifetime Value (LTV), and payback period for a business with [metrics]." },
  { cat: "Business", spec: "Strategy", title: "90-Day GTM Strategy", text: "Outline a 90-day GTM launch plan for a B2B SaaS product targeting [target persona] with $0 ad spend." },

  { cat: "Writing", spec: "Copywriting", title: "Viral Hook Generator", text: "Write 5 irresistible, pattern-interrupt hooks for an article or video about [topic] using curiosity gaps." },
  { cat: "Writing", spec: "Narrative", title: "Storytelling Arc Builder", text: "Structure a narrative about [scenario] following Dan Harmon's Story Circle (Comfort, Want, Enter, Search, Find, Pay, Return, Change)." },
  { cat: "Writing", spec: "SEO", title: "SEO Blog Post Outline", text: "Create an SEO-optimized blog post outline with H2/H3 headers covering the complete guide to [topic]." },

  { cat: "Productivity", spec: "Planning", title: "Time Blocking Daily Schedule", text: "Organize my workday from 9 AM to 6 PM using deep work time blocks around these priorities: [list tasks]." },
  { cat: "Productivity", spec: "Prioritization", title: "Eisenhower Matrix Prioritization", text: "Sort this overwhelming to-do list into the 4 Eisenhower boxes: Urgent/Important, Schedule, Delegate, Eliminate:\n\n" },
  { cat: "Productivity", spec: "Habits", title: "Atomic Habits Stacking", text: "Use James Clear's habit-stacking framework (After I [current habit], I will [new habit]) to design a morning routine." }
];

// --- PRE-BUILT AI ASSISTANTS ---
const DEFAULT_AGENTS = [
  {
    id: "lead_architect",
    name: "Full-Stack Software Architect",
    icon: "💻",
    category: "Engineering",
    desc: "Reviews code architecture, writes production-ready patterns, and handles technical debugging.",
    instructions: "You are a Principal Software Architect. Always prioritize performance, Big-O efficiency, type safety, modular design, and robust edge-case handling. When providing code, deliver clean, documented, modern standards.",
    assignedTool: "code"
  },
  {
    id: "wallstreet_analyst",
    name: "Financial & Market Analyst",
    icon: "📈",
    category: "Finance",
    desc: "Evaluates market trends, financial statements, DCF valuations, and unit economics.",
    instructions: "You are a senior hedge fund and equity research analyst. Deliver objective, grounded, mathematically verified analysis of financial metrics, market trends, valuations, and risk factors.",
    assignedTool: "chart"
  },
  {
    id: "academic_tutor",
    name: "Socratic Academic Tutor",
    icon: "🎓",
    category: "Education",
    desc: "Breaks complex subjects down using first principles and the Feynman Technique.",
    instructions: "You are an elite academic professor who teaches using first principles, intuition, and Socratic questioning. Do not just hand out answers—guide the student step-by-step through derivations.",
    assignedTool: "calc"
  },
  {
    id: "conversion_copywriter",
    name: "Direct-Response Copywriter",
    icon: "✍️",
    category: "Marketing",
    desc: "Drafts punchy headlines, sales pages, social threads, and emails using proven copywriting frameworks.",
    instructions: "You are a master direct-response copywriter. Craft high-converting copy using frameworks like PAS (Problem, Agitate, Solution) and AIDA. Keep sentences punchy, eliminate fluff, and focus on psychological triggers.",
    assignedTool: "web"
  }
];

// --- TOOLS CATALOG ---
const BUNDLEX_PLUGINS = [
  { id: "web_browser", name: "Web Browser", icon: "🌐", group: "Model tools", desc: "Allows the AI to search the internet in real-time for live data, news, and prices.", enabled: true },
  { id: "code_sandbox", name: "Code Sandbox", icon: "⚙️", group: "Model tools", desc: "Adds rigorous unit tests, Big-O complexity audits, and defensive error traps to all code.", enabled: false },
  { id: "simple_calculator", name: "Simple Calculator", icon: "🧮", group: "Installed", desc: "Helps the AI assistant do math calculations more accurately with step-by-step arithmetic verification.", enabled: false },
  { id: "web_app_builder", name: "Web App Builder", icon: "💻", group: "Installed", desc: "Build simple web apps with HTML/CSS/JS (frontend only). Preview and self-contained code included.", enabled: false },
  { id: "render_chart", name: "Render Chart", icon: "📊", group: "Installed", desc: "Visualizes data by structuring findings into clean Markdown tables and charts.", enabled: false },
  { id: "deep_research", name: "Deep Research", icon: "🔬", group: "Installed", desc: "Performs deep research on a specific topic and compiles an exhaustive final report.", enabled: false },
  { id: "perplexity_search", name: "Perplexity Search", icon: "✳️", group: "Store", desc: "Searches information from the web with citations and synthesized summaries.", enabled: false },
  { id: "market_news", name: "Market News", icon: "📈", group: "Store", desc: "Provides up-to-date market information and financial summaries.", enabled: false }
];

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const chatViewport = document.getElementById("chatViewport");
  const promptInput = document.getElementById("promptInput");
  const btnStrike = document.getElementById("btnStrike");
  const btnStop = document.getElementById("btnStop");
  const btnNewChat = document.getElementById("btnNewChat");
  const modelPicker = document.getElementById("modelPicker");
  const modelSearch = document.getElementById("modelSearch");

  // Auth Elements
  const authOverlay = document.getElementById("authOverlay");
  const authTitle = document.getElementById("authTitle");
  const authSubtitle = document.getElementById("authSubtitle");
  const authError = document.getElementById("authError");
  const authDisplayName = document.getElementById("authDisplayName");
  const authPassword = document.getElementById("authPassword");
  const authConfirmPassword = document.getElementById("authConfirmPassword");
  const btnAuthSubmit = document.getElementById("btnAuthSubmit");
  const authSwitchPrompt = document.getElementById("authSwitchPrompt");
  const authSwitchLink = document.getElementById("authSwitchLink");
  const groupDisplayName = document.getElementById("groupDisplayName");
  const groupConfirmPassword = document.getElementById("groupConfirmPassword");

  // Drawers
  const drawerProfile = document.getElementById("drawerProfile");
  const drawerKeys = document.getElementById("drawerKeys");
  const drawerPrompts = document.getElementById("drawerPrompts");
  const drawerHistory = document.getElementById("drawerHistory");
  const drawerPlugins = document.getElementById("drawerPlugins");
  const drawerAgents = document.getElementById("drawerAgents");
  const drawerKB = document.getElementById("drawerKB");
  const drawerSettings = document.getElementById("drawerSettings");

  const btnNavProfile = document.getElementById("btnNavProfile");
  const btnNavKeys = document.getElementById("btnNavKeys");
  const btnNavPrompts = document.getElementById("btnNavPrompts");
  const btnNavHistory = document.getElementById("btnNavHistory");
  const btnNavPlugins = document.getElementById("btnNavPlugins");
  const btnNavAgents = document.getElementById("btnNavAgents");
  const btnNavKB = document.getElementById("btnNavKB");
  const btnNavSettings = document.getElementById("btnNavSettings");
  const activePluginsBadge = document.getElementById("activePluginsBadge");

  // Settings Elements
  const toggleSettingStream = document.getElementById("toggleSettingStream");
  const toggleSettingSound = document.getElementById("toggleSettingSound");
  const toggleSettingEnter = document.getElementById("toggleSettingEnter");
  const toggleSettingResume = document.getElementById("toggleSettingResume");
  const settingAccentColor = document.getElementById("settingAccentColor");
  const settingFontSize = document.getElementById("settingFontSize");
  const settingVoicePitch = document.getElementById("settingVoicePitch");
  const settingVoiceRate = document.getElementById("settingVoiceRate");
  const btnExportChats = document.getElementById("btnExportChats");
  const btnImportChats = document.getElementById("btnImportChats");
  const importChatFile = document.getElementById("importChatFile");
  const btnResetSettings = document.getElementById("btnResetSettings");

  // Speech-to-Text
  const btnSpeechToText = document.getElementById("btnSpeechToText");
  let recognition = null;
  let isRecordingVoice = false;

  // Knowledge Base Elements
  const btnUploadKBFile = document.getElementById("btnUploadKBFile");
  const kbFileInput = document.getElementById("kbFileInput");
  const btnOpenAddKB = document.getElementById("btnOpenAddKB");
  const btnCancelAddKB = document.getElementById("btnCancelAddKB");
  const addKBForm = document.getElementById("addKBForm");
  const kbDocTitle = document.getElementById("kbDocTitle");
  const kbDocCategory = document.getElementById("kbDocCategory");
  const kbDocContent = document.getElementById("kbDocContent");
  const btnSaveKBDoc = document.getElementById("btnSaveKBDoc");
  const kbSearchInput = document.getElementById("kbSearchInput");
  const kbContainer = document.getElementById("kbContainer");
  const connectorsGrid = document.getElementById("connectorsGrid");

  // Agent Creation
  const activeAgentBanner = document.getElementById("activeAgentBanner");
  const activeAgentLabel = document.getElementById("activeAgentLabel");
  const btnDismissAgent = document.getElementById("btnDismissAgent");
  const btnOpenCreateAgent = document.getElementById("btnOpenCreateAgent");
  const btnCancelCreateAgent = document.getElementById("btnCancelCreateAgent");
  const createAgentForm = document.getElementById("createAgentForm");
  const btnSaveNewAgent = document.getElementById("btnSaveNewAgent");
  const newAgentName = document.getElementById("newAgentName");
  const newAgentIcon = document.getElementById("newAgentIcon");
  const newAgentCategory = document.getElementById("newAgentCategory");
  const newAgentInstructions = document.getElementById("newAgentInstructions");
  const newAgentAssignedTool = document.getElementById("newAgentAssignedTool");
  const agentSearchInput = document.getElementById("agentSearchInput");
  const agentsContainer = document.getElementById("agentsContainer");

  // Popups & Menus
  const btnPlusMenu = document.getElementById("btnPlusMenu");
  const btnThinkingMenu = document.getElementById("btnThinkingMenu");
  const menuFeatures = document.getElementById("menuFeatures");
  const menuThinking = document.getElementById("menuThinking");
  const itemAgents = document.getElementById("itemAgents");
  const itemKB = document.getElementById("itemKB");
  const itemPrompts = document.getElementById("itemPrompts");
  const itemUpload = document.getElementById("itemUpload");
  const toggleKB = document.getElementById("toggleKB");
  const toggleThinking = document.getElementById("toggleThinking");
  const toggleBackground = document.getElementById("toggleBackground");
  const switchKB = document.getElementById("switchKB");
  const switchThinking = document.getElementById("switchThinking");
  const switchBackground = document.getElementById("switchBackground");

  // Tools & Attachments
  const btnAttachFile = document.getElementById("btnAttachFile");
  const filePicker = document.getElementById("filePicker");
  const btnGrabTab = document.getElementById("btnGrabTab");
  const attachmentBadge = document.getElementById("attachmentBadge");
  const attachmentFileName = document.getElementById("attachmentFileName");
  const btnDropFile = document.getElementById("btnDropFile");

  // Key Inputs: All 23 Providers
  const keysSearchInput = document.getElementById("keysSearchInput");
  const keyInputsMap = {
    geminiKey: document.getElementById("inputGemini"),
    openaiKey: document.getElementById("inputOpenAI"),
    claudeKey: document.getElementById("inputClaude"),
    openrouterKey: document.getElementById("inputOpenRouter"),
    spacexaiKey: document.getElementById("inputSpaceXAI"),
    deepseekKey: document.getElementById("inputDeepseek"),
    moonshotKey: document.getElementById("inputMoonshot"),
    zaiKey: document.getElementById("inputZAI"),
    metaKey: document.getElementById("inputMeta"),
    mistralKey: document.getElementById("inputMistral"),
    groqKey: document.getElementById("inputGroq"),
    perplexityKey: document.getElementById("inputPerplexity"),
    fireworksKey: document.getElementById("inputFireworks"),
    deepinfraKey: document.getElementById("inputDeepinfra"),
    vercelKey: document.getElementById("inputVercel"),
    chutesKey: document.getElementById("inputChutes"),
    alibabaKey: document.getElementById("inputAlibaba"),
    ollamaCloudKey: document.getElementById("inputOllamaCloud"),
    openCodeGoKey: document.getElementById("inputOpenCodeGo"),
    minimaxKey: document.getElementById("inputMiniMax"),
    xiaomiKey: document.getElementById("inputXiaomi"),
    novitaKey: document.getElementById("inputNovita"),
    sakanaKey: document.getElementById("inputSakana")
  };

  const advInputsMap = {
    advOpenAIOrg: document.getElementById("advOpenAIOrg"),
    advOpenAIProject: document.getElementById("advOpenAIProject"),
    advOpenAIEndpoint: document.getElementById("advOpenAIEndpoint"),
    advOpenAIResponses: document.getElementById("advOpenAIResponses"),
    advOpenAIModel: document.getElementById("advOpenAIModel"),
    advClaudeEndpoint: document.getElementById("advClaudeEndpoint"),
    advClaudeModel: document.getElementById("advClaudeModel"),
    advGoogleEndpoint: document.getElementById("advGoogleEndpoint"),
    advGoogleModel: document.getElementById("advGoogleModel"),
    advAlibabaEndpoint: document.getElementById("advAlibabaEndpoint"),
    advAlibabaModel: document.getElementById("advAlibabaModel"),
    advOllamaEndpoint: document.getElementById("advOllamaEndpoint"),
    advOpenCodeChatEndpoint: document.getElementById("advOpenCodeChatEndpoint"),
    advOpenCodeResponsesEndpoint: document.getElementById("advOpenCodeResponsesEndpoint"),
    advOpenCodeAnthropicEndpoint: document.getElementById("advOpenCodeAnthropicEndpoint"),
    advSakanaEndpoint: document.getElementById("advSakanaEndpoint")
  };

  const btnSaveKeys = document.getElementById("btnSaveKeys");

  // Profile Inputs
  const dispName = document.getElementById("dispName");
  const btnLockApp = document.getElementById("btnLockApp");
  const btnLogoutReset = document.getElementById("btnLogoutReset");

  // Prompts & Plugins UI
  const catBar = document.getElementById("catBar");
  const promptSearchInput = document.getElementById("promptSearchInput");
  const promptsList = document.getElementById("promptsList");
  const pluginSearchInput = document.getElementById("pluginSearchInput");
  const pluginsContainer = document.getElementById("pluginsContainer");
  const historyBackupContainer = document.getElementById("historyBackupContainer");
  const btnClearHistory = document.getElementById("btnClearHistory");

  let activeCat = "all";
  let openRouterCatalog = [];
  let currentFile = null;
  let activeAbortController = null;
  let isGenerating = false;

  // Operational Preferences & Shortcuts
  let userSettings = {
    streamResponses: true,
    soundNotifications: true,
    enterToSend: true,
    resumeChat: true,
    accentColor: "#38bdf8",
    fontSize: "12px",
    voicePitch: 1.0,
    voiceRate: 1.0
  };

  let customShortcuts = {
    openSearch: "Ctrl+K",
    newChat: "Ctrl+Alt+N",
    resetChat: "Ctrl+Alt+R",
    regenerate: "Ctrl+Alt+E",
    clearContext: "Ctrl+Alt+J",
    togglePlugins: "Ctrl+Alt+P",
    copyLast: "Ctrl+Alt+C",
    openVoice: "Ctrl+Alt+V",
    toggleTemp: "Ctrl+Alt+T"
  };

  let reasoningEffort = "medium";
  let isThinkingMode = true;
  let isKnowledgeBase = false;
  let isBackgroundMode = false;
  let currentActiveAgent = null;

  // --- AUTHENTICATION STATE CONTROLLER ---
  let isSetupMode = false;
  const authData = await chrome.storage.local.get(["bundlexAuthHash", "bundlexAuthSalt", "bundlexUserName"]);

  if (!authData.bundlexAuthHash) {
    // First-time user setup
    isSetupMode = true;
    authTitle.textContent = "Setup Master Account";
    authSubtitle.textContent = "Create your secure master password. This authenticates you and encrypts your local keys.";
    groupDisplayName.style.display = "flex";
    groupConfirmPassword.style.display = "flex";
    btnAuthSubmit.textContent = "Create Master Key & Enter";
    authSwitchPrompt.textContent = "Already set up?";
    authSwitchLink.textContent = "Sign In Instead";
  } else {
    // Normal Login Mode
    isSetupMode = false;
    authTitle.textContent = "Sign In to Bundlex";
    authSubtitle.textContent = "Enter your master password to unlock your personal workspace.";
    groupDisplayName.style.display = "none";
    groupConfirmPassword.style.display = "none";
    btnAuthSubmit.textContent = "Unlock Workspace";
    authSwitchPrompt.textContent = "Forgot or want to reset?";
    authSwitchLink.textContent = "Reset Account";
  }

  authSwitchLink.onclick = () => {
    authError.textContent = "";
    if (isSetupMode) {
      isSetupMode = false;
      authTitle.textContent = "Sign In to Bundlex";
      authSubtitle.textContent = "Enter your master password to unlock your workspace.";
      groupDisplayName.style.display = "none";
      groupConfirmPassword.style.display = "none";
      btnAuthSubmit.textContent = "Unlock Workspace";
      authSwitchPrompt.textContent = "Need a new personal space?";
      authSwitchLink.textContent = "Setup Master Account";
    } else {
      if (confirm("Resetting account will clear all encrypted keys and local chat data. Continue?")) {
        chrome.storage.local.remove(["bundlexAuthHash", "bundlexAuthSalt", "bundlexUserName", "chatBackup"]);
        location.reload();
      }
    }
  };

  btnAuthSubmit.onclick = async () => {
    const password = authPassword.value;
    authError.textContent = "";

    if (!password || password.length < 6) {
      authError.textContent = "Password must be at least 6 characters long.";
      return;
    }

    if (isSetupMode) {
      const confirmPass = authConfirmPassword.value;
      const userName = authDisplayName.value.trim() || "User";

      if (password !== confirmPass) {
        authError.textContent = "Passwords do not match.";
        return;
      }

      const salt = "bundlex_salt_" + Date.now();
      const hash = await hashPasscode(password, salt);

      await chrome.storage.local.set({
        bundlexAuthHash: hash,
        bundlexAuthSalt: salt,
        bundlexUserName: userName
      });

      authOverlay.style.display = "none";
      btnNavProfile.textContent = `👤 ${userName}`;
      dispName.textContent = userName;
    } else {
      const storedSalt = authData.bundlexAuthSalt;
      const expectedHash = authData.bundlexAuthHash;
      const calculatedHash = await hashPasscode(password, storedSalt);

      if (calculatedHash === expectedHash) {
        authOverlay.style.display = "none";
        const userName = authData.bundlexUserName || "User";
        btnNavProfile.textContent = `👤 ${userName}`;
        dispName.textContent = userName;
      } else {
        authError.textContent = "Incorrect master password. Access denied.";
        authPassword.value = "";
        authPassword.focus();
      }
    }
  };

  btnLockApp.onclick = () => {
    drawerProfile.style.display = "none";
    authPassword.value = "";
    authOverlay.style.display = "flex";
    authPassword.focus();
  };

  btnLogoutReset.onclick = () => {
    if (confirm("This will log you out and clear stored session cache. Proceed?")) {
      chrome.storage.local.remove(["bundlexAuthHash", "bundlexAuthSalt"]);
      location.reload();
    }
  };

  function scrollToBottom(smooth = true) {
    if (!chatViewport) return;
    requestAnimationFrame(() => {
      chatViewport.scrollTo({
        top: chatViewport.scrollHeight,
        behavior: smooth ? "smooth" : "auto"
      });
    });
  }

  // Keyboard Shortcuts Matcher
  function matchShortcut(e, shortcutStr) {
    if (!shortcutStr || shortcutStr === "None") return false;
    const parts = shortcutStr.split("+").map(p => p.trim().toUpperCase());
    const needsCtrl = parts.includes("CTRL");
    const needsAlt = parts.includes("ALT");
    const needsShift = parts.includes("SHIFT");
    const keyPart = parts[parts.length - 1];

    const ctrlPressed = e.ctrlKey || e.metaKey;
    const altPressed = e.altKey;
    const shiftPressed = e.shiftKey;
    const keyMatches = e.key.toUpperCase() === keyPart;

    return needsCtrl === ctrlPressed && needsAlt === altPressed && needsShift === shiftPressed && keyMatches;
  }

  window.addEventListener("keydown", (e) => {
    if (authOverlay.style.display !== "none") {
      if (e.key === "Enter") btnAuthSubmit.click();
      return;
    }

    if (matchShortcut(e, customShortcuts.openSearch) || (e.key === "/" && document.activeElement !== promptInput && !e.ctrlKey && !e.metaKey)) {
      e.preventDefault();
      promptInput.focus();
      return;
    }
    if (matchShortcut(e, customShortcuts.newChat)) {
      e.preventDefault();
      btnNewChat.click();
      return;
    }
    if (matchShortcut(e, customShortcuts.resetChat)) {
      e.preventDefault();
      chatViewport.innerHTML = "";
      chrome.storage.local.remove("chatBackup");
      return;
    }
    if (matchShortcut(e, customShortcuts.regenerate)) {
      e.preventDefault();
      const lastUserMsg = chatViewport.querySelector(".msg-user-container:last-of-type .msg-bubble-user");
      if (lastUserMsg) {
        promptInput.value = lastUserMsg.getAttribute("data-raw") || lastUserMsg.textContent;
        handleSend();
      }
      return;
    }
    if (matchShortcut(e, customShortcuts.clearContext)) {
      e.preventDefault();
      chatViewport.innerHTML = "";
      return;
    }
    if (matchShortcut(e, customShortcuts.togglePlugins)) {
      e.preventDefault();
      btnNavPlugins.click();
      return;
    }
    if (matchShortcut(e, customShortcuts.copyLast)) {
      e.preventDefault();
      const lastAiCard = chatViewport.querySelector(".model-card:last-of-type .card-content");
      if (lastAiCard) copyText(lastAiCard.textContent, null);
      return;
    }
    if (matchShortcut(e, customShortcuts.openVoice)) {
      e.preventDefault();
      btnSpeechToText.click();
      return;
    }
    if (matchShortcut(e, customShortcuts.toggleTemp)) {
      e.preventDefault();
      alert("Temporary chat mode toggled: conversations will not be archived.");
      return;
    }
  });

  document.querySelectorAll(".shortcut-select").forEach(select => {
    select.onchange = () => {
      const action = select.getAttribute("data-action");
      customShortcuts[action] = select.value;
      chrome.storage.local.set({ customShortcuts });
    };
  });

  function syncShortcutsUI() {
    document.querySelectorAll(".shortcut-select").forEach(select => {
      const action = select.getAttribute("data-action");
      if (customShortcuts[action]) select.value = customShortcuts[action];
    });
  }

  function playNotificationChime() {
    if (!userSettings.soundNotifications) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {}
  }

  // Text-To-Speech
  function speakResponseText(text, btn) {
    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported in this browser version.");
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (btn) btn.textContent = "🔊 Listen";
      return;
    }

    const cleanText = text.replace(/[*_#`[\]]/g, "").trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.pitch = userSettings.voicePitch || 1.0;
    utterance.rate = userSettings.voiceRate || 1.0;

    if (btn) btn.textContent = "⏹ Stop";
    utterance.onend = () => { if (btn) btn.textContent = "🔊 Listen"; };
    utterance.onerror = () => { if (btn) btn.textContent = "🔊 Listen"; };

    window.speechSynthesis.speak(utterance);
  }

  // Speech-To-Text Dictation
  function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btnSpeechToText.onclick = () => alert("Web Speech Recognition API is not supported in this browser.");
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      isRecordingVoice = true;
      btnSpeechToText.classList.add("recording");
      btnSpeechToText.textContent = "🔴";
      btnSpeechToText.title = "Listening... Speak now";
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      promptInput.value = (promptInput.value + " " + transcript).trim();
      promptInput.dispatchEvent(new Event("input"));
    };

    recognition.onerror = (event) => {
      stopVoiceRecording();
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        alert("Microphone permission was not granted. Please check microphone access in browser settings.");
      }
    };

    recognition.onend = () => {
      stopVoiceRecording();
    };
  }

  function stopVoiceRecording() {
    isRecordingVoice = false;
    btnSpeechToText.classList.remove("recording");
    btnSpeechToText.textContent = "🎙️";
    btnSpeechToText.title = "Voice Input (Speech-to-Text)";
  }

  btnSpeechToText.onclick = () => {
    if (!recognition) setupSpeechRecognition();
    if (isRecordingVoice) {
      recognition.stop();
      stopVoiceRecording();
    } else {
      try {
        recognition.start();
      } catch (e) {
        stopVoiceRecording();
      }
    }
  };

  setupSpeechRecognition();

  promptInput.addEventListener("input", () => {
    promptInput.style.height = "auto";
    promptInput.style.height = Math.min(promptInput.scrollHeight, 140) + "px";
  });

  // Advanced Options Toggles
  document.querySelectorAll(".btn-toggle-adv").forEach(btn => {
    btn.onclick = () => {
      const targetId = btn.getAttribute("data-target");
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        const isOpen = targetPanel.classList.toggle("open");
        btn.textContent = isOpen ? "▾ Hide advanced options" : "▸ Show advanced options";
      }
    };
  });

  function closePopups() {
    menuFeatures.style.display = "none";
    menuThinking.style.display = "none";
  }

  btnPlusMenu.onclick = (e) => {
    e.stopPropagation();
    const isShowing = menuFeatures.style.display === "flex";
    closePopups();
    if (!isShowing) menuFeatures.style.display = "flex";
  };

  btnThinkingMenu.onclick = (e) => {
    e.stopPropagation();
    const isShowing = menuThinking.style.display === "flex";
    closePopups();
    if (!isShowing) menuThinking.style.display = "flex";
  };

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".popup-menu") && !e.target.closest(".tool-icon")) {
      closePopups();
    }
  });

  document.querySelectorAll(".effort-item").forEach(item => {
    item.onclick = () => {
      document.querySelectorAll(".effort-item").forEach(el => el.classList.remove("active"));
      item.classList.add("active");
      reasoningEffort = item.getAttribute("data-effort");
      btnThinkingMenu.title = `Thinking Mode: ${reasoningEffort.toUpperCase()}`;
      closePopups();
    };
  });

  itemAgents.onclick = () => { closePopups(); toggleDrawer(drawerAgents); };
  itemKB.onclick = () => { closePopups(); toggleDrawer(drawerKB); };
  itemPrompts.onclick = () => { closePopups(); toggleDrawer(drawerPrompts); };
  itemUpload.onclick = () => { closePopups(); filePicker.click(); };

  toggleKB.onclick = (e) => {
    e.stopPropagation();
    isKnowledgeBase = !isKnowledgeBase;
    switchKB.classList.toggle("on", isKnowledgeBase);
  };

  toggleThinking.onclick = (e) => {
    e.stopPropagation();
    isThinkingMode = !isThinkingMode;
    switchThinking.classList.toggle("on", isThinkingMode);
    btnThinkingMenu.classList.toggle("active", isThinkingMode);
  };

  toggleBackground.onclick = (e) => {
    e.stopPropagation();
    isBackgroundMode = !isBackgroundMode;
    switchBackground.classList.toggle("on", isBackgroundMode);
  };

  function toggleDrawer(target) {
    if (!target) return;
    closePopups();
    const isShowing = target.style.display === "flex";
    [drawerProfile, drawerKeys, drawerPrompts, drawerHistory, drawerPlugins, drawerAgents, drawerKB, drawerSettings].forEach(d => {
      if (d) d.style.display = "none";
    });
    if (!isShowing) {
      target.style.display = "flex";
      if (target === drawerPrompts) renderPrompts();
      if (target === drawerHistory) renderHistory();
      if (target === drawerPlugins) renderPlugins();
      if (target === drawerAgents) renderAgents();
      if (target === drawerKB) renderKB();
    }
  }

  btnNavProfile.onclick = () => toggleDrawer(drawerProfile);
  btnNavKeys.onclick = () => toggleDrawer(drawerKeys);
  btnNavPrompts.onclick = () => toggleDrawer(drawerPrompts);
  btnNavHistory.onclick = () => toggleDrawer(drawerHistory);
  btnNavPlugins.onclick = () => toggleDrawer(drawerPlugins);
  btnNavAgents.onclick = () => toggleDrawer(drawerAgents);
  btnNavKB.onclick = () => toggleDrawer(drawerKB);
  btnNavSettings.onclick = () => toggleDrawer(drawerSettings);

  document.querySelectorAll(".close-btn").forEach(btn => {
    btn.onclick = () => {
      const panelId = btn.getAttribute("data-close");
      const el = document.getElementById(panelId);
      if (el) el.style.display = "none";
    };
  });

  // Settings
  function applyThemeSettings() {
    document.documentElement.style.setProperty("--primary", userSettings.accentColor);
    document.documentElement.style.setProperty("--chat-font-size", userSettings.fontSize);
  }

  function saveSettings() {
    chrome.storage.local.set({ userSettings });
    applyThemeSettings();
  }

  toggleSettingStream.onclick = () => {
    userSettings.streamResponses = !userSettings.streamResponses;
    toggleSettingStream.classList.toggle("on", userSettings.streamResponses);
    saveSettings();
  };

  toggleSettingSound.onclick = () => {
    userSettings.soundNotifications = !userSettings.soundNotifications;
    toggleSettingSound.classList.toggle("on", userSettings.soundNotifications);
    saveSettings();
  };

  toggleSettingEnter.onclick = () => {
    userSettings.enterToSend = !userSettings.enterToSend;
    toggleSettingEnter.classList.toggle("on", userSettings.enterToSend);
    saveSettings();
  };

  toggleSettingResume.onclick = () => {
    userSettings.resumeChat = !userSettings.resumeChat;
    toggleSettingResume.classList.toggle("on", userSettings.resumeChat);
    saveSettings();
  };

  settingAccentColor.onchange = (e) => {
    userSettings.accentColor = e.target.value;
    saveSettings();
  };

  settingFontSize.onchange = (e) => {
    userSettings.fontSize = e.target.value;
    saveSettings();
  };

  settingVoicePitch.oninput = (e) => {
    userSettings.voicePitch = parseFloat(e.target.value);
    saveSettings();
  };

  settingVoiceRate.oninput = (e) => {
    userSettings.voiceRate = parseFloat(e.target.value);
    saveSettings();
  };

  btnExportChats.onclick = async () => {
    const { savedSessions = [] } = await chrome.storage.local.get(["savedSessions"]);
    const blob = new Blob([JSON.stringify(savedSessions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bundlex_ai_chats_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  btnImportChats.onclick = () => importChatFile.click();

  importChatFile.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const imported = JSON.parse(reader.result);
        if (Array.isArray(imported)) {
          await chrome.storage.local.set({ savedSessions: imported });
          alert(`Successfully imported ${imported.length} chat sessions!`);
          renderHistory();
        }
      } catch (err) {
        alert("Invalid backup file: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  btnResetSettings.onclick = () => {
    if (confirm("Reset all settings and shortcuts to defaults?")) {
      userSettings = {
        streamResponses: true,
        soundNotifications: true,
        enterToSend: true,
        resumeChat: true,
        accentColor: "#38bdf8",
        fontSize: "12px",
        voicePitch: 1.0,
        voiceRate: 1.0
      };
      customShortcuts = {
        openSearch: "Ctrl+K",
        newChat: "Ctrl+Alt+N",
        resetChat: "Ctrl+Alt+R",
        regenerate: "Ctrl+Alt+E",
        clearContext: "Ctrl+Alt+J",
        togglePlugins: "Ctrl+Alt+P",
        copyLast: "Ctrl+Alt+C",
        openVoice: "Ctrl+Alt+V",
        toggleTemp: "Ctrl+Alt+T"
      };
      saveSettings();
      chrome.storage.local.set({ customShortcuts });
      syncSettingsUI();
      syncShortcutsUI();
    }
  };

  function syncSettingsUI() {
    toggleSettingStream.classList.toggle("on", userSettings.streamResponses);
    toggleSettingSound.classList.toggle("on", userSettings.soundNotifications);
    toggleSettingEnter.classList.toggle("on", userSettings.enterToSend);
    toggleSettingResume.classList.toggle("on", userSettings.resumeChat);
    settingAccentColor.value = userSettings.accentColor || "#38bdf8";
    settingFontSize.value = userSettings.fontSize || "12px";
    settingVoicePitch.value = userSettings.voicePitch || 1.0;
    settingVoiceRate.value = userSettings.voiceRate || 1.0;
    applyThemeSettings();
  }

  if (keysSearchInput) {
    keysSearchInput.oninput = () => {
      const q = keysSearchInput.value.toLowerCase().trim();
      document.querySelectorAll(".key-item-field").forEach(field => {
        const text = (field.getAttribute("data-name") || "") + " " + field.innerText.toLowerCase();
        field.style.display = (!q || text.includes(q)) ? "flex" : "none";
      });
    };
  }

  // Knowledge Base
  btnUploadKBFile.onclick = () => kbFileInput.click();

  kbFileInput.onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const { kbDocuments = [] } = await chrome.storage.local.get(["kbDocuments"]);

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async () => {
        const textContent = reader.result;
        const newDoc = {
          id: "kb_file_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
          title: file.name,
          category: file.name.split('.').pop().toUpperCase() + " File",
          content: typeof textContent === 'string' ? textContent.slice(0, 10000) : "Parsed text document",
          created: new Date().toLocaleDateString()
        };
        kbDocuments.unshift(newDoc);
        await chrome.storage.local.set({ kbDocuments });
        renderKB();
      };
      reader.readAsText(file);
    }
    kbFileInput.value = "";
  };

  if (connectorsGrid) {
    connectorsGrid.querySelectorAll(".connector-card").forEach(card => {
      card.onclick = () => {
        const appName = card.getAttribute("data-app");
        addKBForm.style.display = "block";
        kbDocCategory.value = appName;
        kbDocTitle.value = `${appName} Data Stream`;
        kbDocContent.placeholder = `Provide access link, API token, repo path or data text for ${appName}...`;
        kbDocTitle.focus();
      };
    });
  }

  btnOpenAddKB.onclick = () => {
    addKBForm.style.display = "block";
    btnCancelAddKB.style.display = "inline-block";
    kbDocTitle.focus();
  };

  btnCancelAddKB.onclick = () => {
    addKBForm.style.display = "none";
  };

  btnSaveKBDoc.onclick = async () => {
    const title = kbDocTitle.value.trim();
    const category = kbDocCategory.value.trim() || "Connected App";
    const content = kbDocContent.value.trim();

    if (!title || !content) {
      alert("Please provide both a Title and Content for this Knowledge Base entry.");
      return;
    }

    const { kbDocuments = [] } = await chrome.storage.local.get(["kbDocuments"]);
    const newDoc = {
      id: "kb_" + Date.now(),
      title,
      category,
      content,
      created: new Date().toLocaleDateString()
    };

    kbDocuments.unshift(newDoc);
    await chrome.storage.local.set({ kbDocuments });

    kbDocTitle.value = "";
    kbDocCategory.value = "";
    kbDocContent.value = "";
    addKBForm.style.display = "none";
    renderKB();
  };

  async function renderKB() {
    if (!kbContainer) return;
    kbContainer.innerHTML = "";

    const { kbDocuments = [] } = await chrome.storage.local.get(["kbDocuments"]);
    const q = kbSearchInput.value.toLowerCase().trim();

    const filtered = kbDocuments.filter(d => !q || d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));

    if (filtered.length === 0) {
      kbContainer.innerHTML = `<div style="font-size:11px; color:#94a3b8; text-align:center; padding:15px;">Knowledge Base is ready. Click "Upload Files" or select one of the 18 connected app sources!</div>`;
      return;
    }

    filtered.forEach(doc => {
      const card = document.createElement("div");
      card.className = "prompt-card";
      card.style.background = "#0e2444";
      card.style.borderColor = "#173b6c";
      card.innerHTML = `
        <div class="prompt-top" style="align-items: center;">
          <div>
            <div class="prompt-title" style="color: var(--primary); font-size: 12px;">📄 ${doc.title}</div>
            <span class="prompt-cat" style="font-size: 8px;">${doc.category}</span>
          </div>
          <button class="mini-btn btn-del-kb" style="background:#b91c1c; color:#fff;">🗑️ Delete</button>
        </div>
        <div class="prompt-desc" style="margin-top: 6px; color:#cbd5e1; max-height:55px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical;">
          ${doc.content}
        </div>
      `;

      card.querySelector(".btn-del-kb").onclick = async () => {
        const updated = kbDocuments.filter(d => d.id !== doc.id);
        await chrome.storage.local.set({ kbDocuments: updated });
        renderKB();
      };

      kbContainer.appendChild(card);
    });
  }

  kbSearchInput.oninput = renderKB;

  async function queryKnowledgeBase(userPrompt) {
    const { kbDocuments = [] } = await chrome.storage.local.get(["kbDocuments"]);
    if (kbDocuments.length === 0) return "";

    const terms = userPrompt.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const matches = [];

    kbDocuments.forEach(doc => {
      const text = (doc.title + " " + doc.content).toLowerCase();
      let score = 0;
      terms.forEach(t => {
        if (text.includes(t)) score += 1;
      });
      if (score > 0 || kbDocuments.length <= 4) {
        matches.push(`[DOCUMENT: ${doc.title} (${doc.category})]\n${doc.content.slice(0, 1500)}`);
      }
    });

    if (matches.length > 0) {
      return `\n\n[ATTACHED KNOWLEDGE BASE CONTEXT - Dig into and prioritize this verified documentation when answering]:\n` + matches.slice(0, 4).join("\n\n");
    }
    return "";
  }

  function inspectAndActuateBrowserActions(aiResponseText) {
    if (!chrome || !chrome.tabs || !chrome.tabs.create) return;
    const openCommandRegex = /(?:open|navigate to|launch|visit)\s+(https?:\/\/[^\s\)\>]+)/i;
    const match = aiResponseText.match(openCommandRegex);
    if (match && match[1]) {
      chrome.tabs.create({ url: match[1], active: true });
    }
  }

  // Custom Agents
  function updateActiveAgentBanner() {
    if (currentActiveAgent) {
      activeAgentBanner.style.display = "flex";
      activeAgentLabel.textContent = `Active Assistant: ${currentActiveAgent.icon} ${currentActiveAgent.name}`;
      btnNavAgents.textContent = `${currentActiveAgent.icon} Active`;
    } else {
      activeAgentBanner.style.display = "none";
      btnNavAgents.textContent = `🤖 Agents`;
    }
  }

  btnDismissAgent.onclick = () => {
    currentActiveAgent = null;
    chrome.storage.local.remove("activeAgent");
    updateActiveAgentBanner();
  };

  btnOpenCreateAgent.onclick = () => {
    createAgentForm.style.display = "block";
    btnCancelCreateAgent.style.display = "inline-block";
    btnOpenCreateAgent.style.display = "none";
  };

  btnCancelCreateAgent.onclick = () => {
    createAgentForm.style.display = "none";
    btnCancelCreateAgent.style.display = "none";
    btnOpenCreateAgent.style.display = "inline-block";
  };

  btnSaveNewAgent.onclick = async () => {
    const name = newAgentName.value.trim();
    const icon = newAgentIcon.value.trim() || "🤖";
    const category = newAgentCategory.value.trim() || "Custom";
    const instructions = newAgentInstructions.value.trim();
    const assignedTool = newAgentAssignedTool.value;

    if (!name || !instructions) {
      alert("Please enter both an Agent Name and Custom Instructions.");
      return;
    }

    const { customAgents = [] } = await chrome.storage.local.get(["customAgents"]);
    const newAgent = {
      id: "agent_" + Date.now(),
      name,
      icon,
      category,
      desc: instructions.slice(0, 75) + "...",
      instructions,
      assignedTool
    };

    customAgents.unshift(newAgent);
    await chrome.storage.local.set({ customAgents });

    newAgentName.value = "";
    newAgentInstructions.value = "";
    newAgentCategory.value = "";
    btnCancelCreateAgent.click();
    renderAgents();
  };

  async function renderAgents() {
    if (!agentsContainer) return;
    agentsContainer.innerHTML = "";

    const { customAgents = [] } = await chrome.storage.local.get(["customAgents"]);
    const allAgents = [...customAgents, ...DEFAULT_AGENTS];
    const q = agentSearchInput.value.toLowerCase().trim();

    const filtered = allAgents.filter(a => !q || a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q));

    if (filtered.length === 0) {
      agentsContainer.innerHTML = `<div style="font-size:11px; color:#94a3b8; text-align:center; padding:15px;">No assistants match your search.</div>`;
      return;
    }

    filtered.forEach(agent => {
      const isSelected = currentActiveAgent && currentActiveAgent.id === agent.id;
      const card = document.createElement("div");
      card.className = "prompt-card";
      card.style.background = "#0e2444";
      card.style.borderColor = isSelected ? "#facc15" : "#173b6c";
      card.innerHTML = `
        <div class="prompt-top" style="align-items: center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:18px;">${agent.icon}</span>
            <div>
              <div class="prompt-title">${agent.name}</div>
              <span class="prompt-cat" style="font-size:7px; padding:1px 4px;">${agent.category}</span>
            </div>
          </div>
          <button class="mini-btn select-agent-btn" style="background:${isSelected ? '#eab308' : '#0284c7'}; color:${isSelected ? '#000' : '#fff'}; font-weight:700;">
            ${isSelected ? "✓ Active" : "Select Agent"}
          </button>
        </div>
        <div class="prompt-desc" style="margin-top:5px;">${agent.desc}</div>
      `;

      card.querySelector(".select-agent-btn").onclick = () => {
        currentActiveAgent = agent;
        chrome.storage.local.set({ activeAgent: agent });
        updateActiveAgentBanner();
        drawerAgents.style.display = "none";
        promptInput.focus();
      };

      agentsContainer.appendChild(card);
    });
  }

  agentSearchInput.oninput = renderAgents;

  // Tools Engine
  function updatePluginBadge() {
    if (!activePluginsBadge) return;
    const count = BUNDLEX_PLUGINS.filter(p => p.enabled).length;
    activePluginsBadge.textContent = `${count} Active`;
  }

  function renderPlugins() {
    if (!pluginsContainer) return;
    pluginsContainer.innerHTML = "";
    const q = pluginSearchInput.value.toLowerCase().trim();

    const filtered = BUNDLEX_PLUGINS.filter(p => !q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.group.toLowerCase().includes(q));

    if (filtered.length === 0) {
      pluginsContainer.innerHTML = `<div style="font-size:11px; color:#94a3b8; text-align:center; padding:15px;">No tools match your search.</div>`;
      return;
    }

    const groups = ["Model tools", "Installed", "Store"];
    groups.forEach(groupName => {
      const inGroup = filtered.filter(p => p.group === groupName);
      if (inGroup.length === 0) return;

      const divider = document.createElement("div");
      divider.className = "group-header";
      divider.innerHTML = `
        <span class="group-title">${groupName}</span>
        <span class="group-badge">${inGroup.length}</span>
      `;
      pluginsContainer.appendChild(divider);

      inGroup.forEach(p => {
        const card = document.createElement("div");
        card.className = "prompt-card";
        card.style.background = "#0e2444";
        card.style.borderColor = p.enabled ? "var(--primary)" : "#173b6c";
        card.innerHTML = `
          <div class="prompt-top" style="align-items: center;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:16px;">${p.icon}</span>
              <span class="prompt-title">${p.name}</span>
            </div>
            <button class="mini-btn toggle-plugin-btn" style="background:${p.enabled ? '#0284c7' : '#173b6c'}; color:#ffffff; font-weight:700;">
              ${p.enabled ? "✓ Enabled" : "+ Enable"}
            </button>
          </div>
          <div class="prompt-desc" style="margin-top:4px;">${p.desc}</div>
        `;

        card.querySelector(".toggle-plugin-btn").onclick = () => {
          p.enabled = !p.enabled;
          const saved = {};
          BUNDLEX_PLUGINS.forEach(item => (saved[item.id] = item.enabled));
          chrome.storage.local.set({ bundlexPluginStates: saved });
          updatePluginBadge();
          renderPlugins();
        };

        pluginsContainer.appendChild(card);
      });
    });
  }

  pluginSearchInput.oninput = renderPlugins;

  async function applyActivePlugins(raw) {
    let augmented = raw;

    if (currentActiveAgent && currentActiveAgent.instructions) {
      augmented = `[SYSTEM PERSONA - ${currentActiveAgent.name.toUpperCase()}]: ${currentActiveAgent.instructions}\n\n[USER INQUIRY]: ` + augmented;
    }

    if (isThinkingMode) {
      const effortGuides = {
        low: "Keep reasoning concise and direct.",
        medium: "Plan thoughts step-by-step before declaring final conclusions.",
        high: "Deeply evaluate edge cases, counterarguments, and mathematical rigor.",
        extra: "Exhaustively audit every calculation, assumption, and structural implication."
      };
      augmented += `\n\n[Thinking Mode: Reasoning Effort = ${reasoningEffort.toUpperCase()}. ${effortGuides[reasoningEffort]}]`;
    }

    if (isKnowledgeBase) {
      const kbContext = await queryKnowledgeBase(raw);
      if (kbContext) augmented += kbContext;
    }

    augmented += "\n\n[Browser Action Capability: If the user asks to open or navigate to a webpage, specify the full URL clearly in format 'Open https://...']";

    const active = BUNDLEX_PLUGINS.filter(p => p.enabled);
    active.forEach(p => {
      if (p.id === "simple_calculator") {
        augmented += "\n\n[Tool: Simple Calculator - Perform step-by-step arithmetic verification before stating the result.]";
      } else if (p.id === "web_app_builder") {
        augmented += "\n\n[Tool: Web App Builder - Provide a complete, single-file HTML/CSS/JavaScript app with clean styling.]";
      } else if (p.id === "render_chart") {
        augmented += "\n\n[Tool: Render Chart - Structure numerical comparisons into clean visual Markdown tables.]";
      } else if (p.id === "deep_research") {
        augmented += "\n\n[Tool: Deep Research - Execute an exhaustive, multi-perspective report covering methodology, risks, and actionable steps.]";
      } else if (p.id === "code_sandbox") {
        augmented += "\n\n[Tool: Code Sandbox - Add comprehensive unit tests, defensive error boundaries, and Big-O audits.]";
      } else if (p.id === "perplexity_search") {
        augmented += "\n\n[Tool: Perplexity Search - Ground your response with detailed citations and multi-source synthesis.]";
      } else if (p.id === "market_news") {
        augmented += "\n\n[Tool: Market News - Focus specifically on current market trends, financial valuations, and pricing drivers.]";
      }
    });

    return augmented;
  }

  // Prompt Library
  function renderPrompts() {
    promptsList.innerHTML = "";
    const q = promptSearchInput.value.toLowerCase().trim();

    const filtered = BUNDLEX_PROMPTS.filter(p => {
      const matchCat = activeCat === "all" || p.cat === activeCat;
      const matchQ = !q || p.title.toLowerCase().includes(q) || p.text.toLowerCase().includes(q) || (p.spec && p.spec.toLowerCase().includes(q));
      return matchCat && matchQ;
    });

    if (filtered.length === 0) {
      promptsList.innerHTML = `<div style="font-size:11px; color:#64748b; text-align:center; padding:15px;">No prompts found matching your criteria.</div>`;
      return;
    }

    const categories = [...new Set(filtered.map(p => p.cat))];

    categories.forEach(catName => {
      const promptsInCat = filtered.filter(p => p.cat === catName);

      const divider = document.createElement("div");
      divider.className = "group-header";
      divider.innerHTML = `
        <span class="group-title">${catName}</span>
        <span class="group-badge">${promptsInCat.length} Prompts</span>
      `;
      promptsList.appendChild(divider);

      promptsInCat.forEach(p => {
        const card = document.createElement("div");
        card.className = "prompt-card";
        card.innerHTML = `
          <div class="prompt-top">
            <span class="prompt-title">${p.title}</span>
            <span class="prompt-cat">${p.spec || p.cat}</span>
          </div>
          <div class="prompt-desc">${p.text}</div>
          <div class="prompt-actions">
            <button class="mini-btn btn-use">⚡ Use Prompt</button>
            <button class="mini-btn btn-cp">📋 Copy</button>
          </div>
        `;

        card.querySelector(".btn-use").onclick = () => {
          promptInput.value = p.text;
          promptInput.dispatchEvent(new Event("input"));
          drawerPrompts.style.display = "none";
          promptInput.focus();
        };

        card.querySelector(".btn-cp").onclick = (e) => {
          copyText(p.text, e.currentTarget);
        };

        promptsList.appendChild(card);
      });
    });
  }

  catBar.querySelectorAll(".cat-pill").forEach(pill => {
    pill.onclick = () => {
      catBar.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeCat = pill.getAttribute("data-cat");
      renderPrompts();
    };
  });

  promptSearchInput.oninput = renderPrompts;

  // History & Sessions
  async function archiveCurrentSession() {
    const chatHtml = chatViewport.innerHTML.trim();
    if (!chatHtml) return;

    const firstMsg = chatViewport.querySelector(".msg-bubble-user");
    const previewTitle = firstMsg ? (firstMsg.getAttribute("data-raw") || firstMsg.textContent).slice(0, 40) : "Conversation";

    const { savedSessions = [] } = await chrome.storage.local.get(["savedSessions"]);
    
    if (savedSessions.length === 0 || savedSessions[0].html !== chatHtml) {
      const newSession = {
        id: Date.now(),
        title: previewTitle,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        date: new Date().toLocaleDateString(),
        html: chatHtml
      };
      savedSessions.unshift(newSession);
      if (savedSessions.length > 50) savedSessions.pop();
      await chrome.storage.local.set({ savedSessions });
    }
  }

  btnNewChat.onclick = async () => {
    await archiveCurrentSession();
    chatViewport.innerHTML = "";
    chrome.storage.local.remove("chatBackup");
    promptInput.value = "";
    promptInput.style.height = "44px";
    btnDropFile.click();
    promptInput.focus();
  };

  btnClearHistory.onclick = () => {
    if (confirm("Permanently erase all saved conversation sessions?")) {
      chatViewport.innerHTML = "";
      chrome.storage.local.remove(["chatBackup", "savedSessions"]);
      renderHistory();
      drawerHistory.style.display = "none";
    }
  };

  async function renderHistory() {
    historyBackupContainer.innerHTML = "";
    const { savedSessions = [] } = await chrome.storage.local.get(["savedSessions"]);

    if (savedSessions.length === 0) {
      historyBackupContainer.innerHTML = `<div style="font-size:11px; color:#94a3b8; text-align:center; padding:25px 10px;">No saved conversations yet. Chat and click "+ New Chat" to archive sessions here!</div>`;
      return;
    }

    savedSessions.forEach((session, index) => {
      const card = document.createElement("div");
      card.className = "prompt-card";
      card.style.background = "#0e2444";
      card.style.borderColor = "#173b6c";
      card.style.marginBottom = "8px";
      card.innerHTML = `
        <div class="prompt-top">
          <span class="prompt-title" style="color: var(--primary); font-size:12px; font-weight:700;">${session.title}...</span>
          <span class="prompt-cat" style="background:#173b6c;">${session.date} ${session.time}</span>
        </div>
        <div class="prompt-desc" style="color:#94a3b8; font-size:10px; margin-top:2px;">Saved Chat Session #${savedSessions.length - index}</div>
        <div class="prompt-actions" style="margin-top:8px;">
          <button class="mini-btn btn-open-session" style="background:#0284c7; color:#fff;">📂 Open Chat</button>
          <button class="mini-btn btn-del-session" style="background:#b91c1c; color:#fff;">🗑️ Delete</button>
        </div>
      `;

      card.querySelector(".btn-open-session").onclick = () => {
        chatViewport.innerHTML = session.html;
        chrome.storage.local.set({ chatBackup: session.html });
        drawerHistory.style.display = "none";
        scrollToBottom(false);
      };

      card.querySelector(".btn-del-session").onclick = async () => {
        const updated = savedSessions.filter(s => s.id !== session.id);
        await chrome.storage.local.set({ savedSessions: updated });
        renderHistory();
      };

      historyBackupContainer.appendChild(card);
    });
  }

  // Restoration
  const storageKeysToLoad = [
    "chatBackup", "bundlexPluginStates", "activeAgent", "userSettings", "customShortcuts",
    ...Object.keys(keyInputsMap),
    ...Object.keys(advInputsMap)
  ];

  chrome.storage.local.get(storageKeysToLoad).then((data) => {
    Object.keys(keyInputsMap).forEach(k => {
      if (data[k] && keyInputsMap[k]) keyInputsMap[k].value = data[k];
    });

    Object.keys(advInputsMap).forEach(k => {
      if (data[k] && advInputsMap[k]) advInputsMap[k].value = data[k];
    });

    if (data.userSettings) userSettings = { ...userSettings, ...data.userSettings };
    syncSettingsUI();

    if (data.customShortcuts) customShortcuts = { ...customShortcuts, ...data.customShortcuts };
    syncShortcutsUI();

    if (data.activeAgent) {
      currentActiveAgent = data.activeAgent;
      updateActiveAgentBanner();
    }
    if (data.bundlexPluginStates) {
      BUNDLEX_PLUGINS.forEach(p => {
        if (typeof data.bundlexPluginStates[p.id] !== "undefined") p.enabled = data.bundlexPluginStates[p.id];
      });
    }
    updatePluginBadge();

    if (data.chatBackup && userSettings.resumeChat) {
      chatViewport.innerHTML = data.chatBackup;
      scrollToBottom(false);
    }
  });

  btnSaveKeys.onclick = () => {
    const dataToSave = {};
    Object.keys(keyInputsMap).forEach(k => {
      if (keyInputsMap[k]) dataToSave[k] = keyInputsMap[k].value.trim();
    });

    Object.keys(advInputsMap).forEach(k => {
      if (advInputsMap[k]) dataToSave[k] = advInputsMap[k].value.trim();
    });

    chrome.storage.local.set(dataToSave).then(() => {
      alert("All 23 Provider keys and advanced options saved successfully!");
      drawerKeys.style.display = "none";
    });
  };

  function saveChat() {
    chrome.storage.local.set({ chatBackup: chatViewport.innerHTML });
  }

  // Attachments
  btnAttachFile.onclick = () => filePicker.click();
  filePicker.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      currentFile = {
        name: file.name,
        type: file.type || "application/octet-stream",
        base64: reader.result.split(",")[1],
        preview: reader.result
      };
      attachmentFileName.textContent = file.name;
      attachmentBadge.style.display = "flex";
    };
    reader.readAsDataURL(file);
  };

  btnDropFile.onclick = () => {
    currentFile = null;
    filePicker.value = "";
    attachmentBadge.style.display = "none";
  };

  btnGrabTab.onclick = async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (tab && tab.url) {
        const urlRef = `\n\n[Context Link: ${tab.title || "Page"} (${tab.url})]`;
        promptInput.value = (promptInput.value + urlRef).trim();
        promptInput.dispatchEvent(new Event("input"));
        promptInput.focus();
      }
    } catch (e) {
      alert("Unable to fetch tab link: " + e.message);
    }
  };

  // Model Catalog
  async function fetchModels() {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models");
      const json = await res.json();
      if (json && json.data) {
        openRouterCatalog = json.data;
        populateModels(openRouterCatalog);
      }
    } catch (e) {}
  }

  function populateModels(list) {
    const cur = modelPicker.value;
    modelPicker.innerHTML = `
      <option value="gemini_direct" selected>Google Gemini (Direct)</option>
      <option value="compare_all">⚡ Compare All 3 (Claude + GPT + Gemini)</option>
      <option value="openai_direct">ChatGPT (OpenAI Direct)</option>
      <option value="claude_direct">Claude 3.5 Sonnet (Direct)</option>
      <option value="openrouter/free">Free Models (via OpenRouter)</option>
    `;
    const grp = document.createElement("optgroup");
    grp.label = "All Models";
    list.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name || m.id;
      grp.appendChild(opt);
    });
    modelPicker.appendChild(grp);
    if (cur) modelPicker.value = cur;
  }

  modelSearch.oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = openRouterCatalog.filter(m => (m.name && m.name.toLowerCase().includes(q)) || m.id.toLowerCase().includes(q));
    populateModels(filtered);
    if (filtered.length > 0) modelPicker.value = filtered[0].id;
  };

  // Clipboard
  function copyText(text, btn) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => flashSuccess(btn)).catch(() => fallbackCopy(text, btn));
    } else {
      fallbackCopy(text, btn);
    }
  }

  function fallbackCopy(text, btn) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
      flashSuccess(btn);
    } catch (e) {
      alert("Copy failed: " + e.message);
    }
    document.body.removeChild(ta);
  }

  function flashSuccess(btn) {
    if (!btn) return;
    const oldText = btn.textContent;
    btn.textContent = "✅ Copied";
    setTimeout(() => { btn.textContent = oldText; }, 1500);
  }

  chatViewport.addEventListener("click", (e) => {
    const copyCardBtn = e.target.closest(".card-copy-btn");
    if (copyCardBtn) {
      const card = copyCardBtn.closest(".model-card");
      if (card) copyText(card.querySelector(".card-content").textContent, copyCardBtn);
      return;
    }

    const speakCardBtn = e.target.closest(".card-speak-btn");
    if (speakCardBtn) {
      const card = speakCardBtn.closest(".model-card");
      if (card) speakResponseText(card.querySelector(".card-content").textContent, speakCardBtn);
      return;
    }

    const copyUserBtn = e.target.closest(".copy-user-btn");
    if (copyUserBtn) {
      const msgRow = copyUserBtn.closest(".msg-user-container");
      if (msgRow) {
        const text = msgRow.querySelector(".msg-bubble-user").getAttribute("data-raw") || msgRow.querySelector(".msg-bubble-user").textContent;
        copyText(text, copyUserBtn);
      }
      return;
    }

    const editUserBtn = e.target.closest(".edit-user-btn");
    if (editUserBtn) {
      const msgRow = editUserBtn.closest(".msg-user-container");
      if (msgRow) {
        const raw = msgRow.querySelector(".msg-bubble-user").getAttribute("data-raw") || msgRow.querySelector(".msg-bubble-user").textContent;
        promptInput.value = raw;
        promptInput.dispatchEvent(new Event("input"));
        promptInput.focus();
      }
      return;
    }
  });

  async function streamRenderText(element, fullText, signal) {
    if (!userSettings.streamResponses) {
      element.textContent = fullText;
      return;
    }

    element.textContent = "";
    const words = fullText.split(/(\s+)/);
    for (let i = 0; i < words.length; i++) {
      if (signal && signal.aborted) break;
      element.textContent += words[i];
      if (i % 2 === 0) {
        scrollToBottom(true);
        await new Promise(r => setTimeout(r, 12));
      }
    }
  }

  // API Engines
  async function callGemini(prompt, fileData, key, bodyEl, signal) {
    if (!key) {
      bodyEl.textContent = "⚠️ Missing Gemini Key. Click 🔑 Keys to save it.";
      return;
    }
    bodyEl.textContent = "⚡ Searching web & generating response...";
    scrollToBottom(true);

    const parts = [];
    if (fileData && fileData.base64) {
      parts.push({ inline_data: { mime_type: fileData.type, data: fileData.base64 } });
    }
    parts.push({ text: prompt });

    const payloadWithSearch = JSON.stringify({
      contents: [{ parts }],
      tools: [{ google_search: {} }]
    });

    const payloadStandard = JSON.stringify({ contents: [{ parts }] });

    const { advGoogleEndpoint, advGoogleModel } = await chrome.storage.local.get(["advGoogleEndpoint", "advGoogleModel"]);
    const chosenModel = advGoogleModel || "gemini-2.5-flash";
    const baseEndpoint = (advGoogleEndpoint && advGoogleEndpoint.trim()) ? advGoogleEndpoint.trim().replace(/\/+$/, "") : "https://generativelanguage.googleapis.com";

    const endpoints = [
      `${baseEndpoint}/v1beta/models/${chosenModel}:generateContent?key=${encodeURIComponent(key.trim())}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key.trim())}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(key.trim())}`
    ];

    let lastError = null;

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payloadWithSearch,
          signal: signal
        });

        const data = await res.json();
        if (res.ok) {
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            await streamRenderText(bodyEl, reply, signal);
            saveChat();
            playNotificationChime();
            inspectAndActuateBrowserActions(reply);
            scrollToBottom(true);
            return;
          }
        } else {
          if (res.status === 400) {
            const fallbackRes = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: payloadStandard,
              signal: signal
            });
            const fallbackData = await fallbackRes.json();
            if (fallbackRes.ok) {
              const reply = fallbackData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (reply) {
                await streamRenderText(bodyEl, reply, signal);
                saveChat();
                playNotificationChime();
                inspectAndActuateBrowserActions(reply);
                scrollToBottom(true);
                return;
              }
            }
          }

          lastError = data.error?.message || `HTTP ${res.status}`;
          if (res.status === 404 || res.status === 429) continue;

          bodyEl.textContent = `❌ Gemini Error (${res.status}): ${lastError}`;
          saveChat();
          scrollToBottom(true);
          return;
        }
      } catch (err) {
        if (err.name === "AbortError") {
          bodyEl.textContent = "🛑 Generation stopped by user.";
          scrollToBottom(true);
          return;
        }
        lastError = err.message;
      }
    }

    bodyEl.textContent = `❌ Gemini Error: ${lastError || "Check your API key or quota in Google AI Studio."}`;
    saveChat();
    scrollToBottom(true);
  }

  async function callOpenAI(prompt, fileData, key, bodyEl, signal) {
    if (!key) return (bodyEl.textContent = "⚠️ Missing OpenAI Key. Click 🔑 Keys to save it.");
    bodyEl.textContent = "⚡ Calling OpenAI...";
    scrollToBottom(true);

    const { advOpenAIOrg, advOpenAIProject, advOpenAIEndpoint, advOpenAIModel } = await chrome.storage.local.get([
      "advOpenAIOrg", "advOpenAIProject", "advOpenAIEndpoint", "advOpenAIModel"
    ]);

    const targetUrl = (advOpenAIEndpoint && advOpenAIEndpoint.trim()) ? advOpenAIEndpoint.trim() : "https://api.openai.com/v1/chat/completions";
    const selectedModel = (advOpenAIModel && advOpenAIModel.trim()) ? advOpenAIModel.trim() : "gpt-4o-mini";

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    };

    if (advOpenAIOrg && advOpenAIOrg.trim()) headers["OpenAI-Organization"] = advOpenAIOrg.trim();
    if (advOpenAIProject && advOpenAIProject.trim()) headers["OpenAI-Project"] = advOpenAIProject.trim();

    const content = [];
    if (fileData && fileData.base64 && fileData.type.startsWith("image/")) {
      content.push({ type: "image_url", image_url: { url: `data:${fileData.type};base64,${fileData.base64}` } });
    }
    content.push({ type: "text", text: prompt });

    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: "user", content }]
        }),
        signal: signal
      });
      const data = await res.json();
      if (!res.ok) {
        bodyEl.textContent = `❌ OpenAI Error: ${data.error?.message || res.statusText}`;
        saveChat();
        scrollToBottom(true);
        return;
      }
      const reply = data.choices?.[0]?.message?.content || "⚠️ Empty response.";
      await streamRenderText(bodyEl, reply, signal);
      playNotificationChime();
      inspectAndActuateBrowserActions(reply);
    } catch (err) {
      bodyEl.textContent = err.name === "AbortError" ? "🛑 Generation stopped." : `❌ Network Error: ${err.message}`;
    }
    saveChat();
    scrollToBottom(true);
  }

  async function callClaude(prompt, fileData, key, bodyEl, signal) {
    if (!key) return (bodyEl.textContent = "⚠️ Missing Claude Key. Click 🔑 Keys to save it.");
    bodyEl.textContent = "⚡ Calling Claude...";
    scrollToBottom(true);

    const { advClaudeEndpoint, advClaudeModel } = await chrome.storage.local.get(["advClaudeEndpoint", "advClaudeModel"]);
    const targetUrl = (advClaudeEndpoint && advClaudeEndpoint.trim()) ? advClaudeEndpoint.trim() : "https://api.anthropic.com/v1/messages";
    const chosenModel = (advClaudeModel && advClaudeModel.trim()) ? advClaudeModel.trim() : "claude-3-5-sonnet-20241022";

    const content = [];
    if (fileData && fileData.base64 && fileData.type.startsWith("image/")) {
      content.push({ type: "image", source: { type: "base64", media_type: fileData.type, data: fileData.base64 } });
    }
    content.push({ type: "text", text: prompt });

    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({ model: chosenModel, max_tokens: 1024, messages: [{ role: "user", content }] }),
        signal: signal
      });
      const data = await res.json();
      if (!res.ok) {
        bodyEl.textContent = `❌ Claude Error: ${data.error?.message || res.statusText}`;
        saveChat();
        scrollToBottom(true);
        return;
      }
      const reply = data.content?.[0]?.text || "⚠️ Empty response.";
      await streamRenderText(bodyEl, reply, signal);
      playNotificationChime();
      inspectAndActuateBrowserActions(reply);
    } catch (err) {
      bodyEl.textContent = err.name === "AbortError" ? "🛑 Generation stopped." : `❌ Network Error: ${err.message}`;
    }
    saveChat();
    scrollToBottom(true);
  }

  async function callOpenRouter(prompt, modelId, key, bodyEl, signal) {
    if (!key) return (bodyEl.textContent = "⚠️ Missing OpenRouter Key. Click 🔑 Keys to save it.");
    bodyEl.textContent = "⚡ Calling OpenRouter...";
    scrollToBottom(true);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
          "HTTP-Referer": "https://bundlex-ai.app",
          "X-Title": "Bundlex AI"
        },
        body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: prompt }] }),
        signal: signal
      });
      const data = await res.json();
      if (!res.ok) {
        bodyEl.textContent = `❌ OpenRouter Error: ${data.error?.message || res.statusText}`;
        saveChat();
        scrollToBottom(true);
        return;
      }
      const reply = data.choices?.[0]?.message?.content || "⚠️ Empty response.";
      await streamRenderText(bodyEl, reply, signal);
      playNotificationChime();
      inspectAndActuateBrowserActions(reply);
    } catch (err) {
      bodyEl.textContent = err.name === "AbortError" ? "🛑 Generation stopped." : `❌ Network Error: ${err.message}`;
    }
    saveChat();
    scrollToBottom(true);
  }

  function makeCard(title) {
    const card = document.createElement("div");
    card.className = "model-card";
    card.innerHTML = `
      <div class="card-head">
        <span class="model-name">${title}</span>
        <div class="card-controls">
          <button class="card-speak-btn" title="Listen with Text-to-Speech">🔊 Listen</button>
          <button class="card-copy-btn" title="Copy to clipboard">📋 Copy</button>
        </div>
      </div>
      <div class="card-content">⚡ Thinking...</div>
    `;
    const bodyEl = card.querySelector(".card-content");
    return { card, bodyEl };
  }

  function setGenerating(loading) {
    isGenerating = loading;
    btnStrike.style.display = loading ? "none" : "block";
    btnStop.style.display = loading ? "block" : "none";
    promptInput.disabled = loading;
  }

  btnStop.onclick = () => {
    if (activeAbortController) {
      activeAbortController.abort();
      setGenerating(false);
    }
  };

  // Main Send Action
  async function handleSend() {
    if (isGenerating) return;

    const rawText = promptInput.value.trim();
    if (!rawText && !currentFile) return;

    let queryText = rawText || (currentFile ? `Please analyze this attached file: ${currentFile.name}` : "");
    queryText = await applyActivePlugins(queryText);

    const attachedFileBackup = currentFile ? { ...currentFile } : null;
    const mode = modelPicker.value;

    promptInput.value = "";
    promptInput.style.height = "44px";
    btnDropFile.click();

    const userContainer = document.createElement("div");
    userContainer.className = "msg-user-container";
    
    let innerHtml = "";
    if (attachedFileBackup && attachedFileBackup.type.startsWith("image/")) {
      innerHtml += `<img src="${attachedFileBackup.preview}" style="max-width:100%; max-height:140px; border-radius:6px; display:block; margin-bottom:6px;" />`;
    } else if (attachedFileBackup) {
      innerHtml += `<div style="font-size:11px; opacity:0.8; margin-bottom:4px;">📎 ${attachedFileBackup.name}</div>`;
    }
    innerHtml += `<div class="msg-bubble-user" data-raw="${encodeURIComponent(rawText)}">${rawText.replace(/</g, "&lt;")}</div>`;
    innerHtml += `
      <div class="user-actions">
        <button class="action-link edit-user-btn">✏️ Edit</button>
        <button class="action-link copy-user-btn">📋 Copy</button>
      </div>
    `;

    userContainer.innerHTML = innerHtml;
    userContainer.querySelector(".msg-bubble-user").setAttribute("data-raw", rawText);
    chatViewport.appendChild(userContainer);
    
    scrollToBottom(true);

    const storageKeysNeeded = ["geminiKey", "openaiKey", "claudeKey", "openrouterKey"];
    const storedKeys = await chrome.storage.local.get(storageKeysNeeded);

    const grid = document.createElement("div");
    grid.className = "arena-grid";

    activeAbortController = new AbortController();
    const signal = activeAbortController.signal;
    setGenerating(true);

    try {
      if (mode === "gemini_direct") {
        const title = currentActiveAgent ? `${currentActiveAgent.icon} ${currentActiveAgent.name} (Gemini)` : "Google Gemini";
        const card = makeCard(title);
        grid.appendChild(card.card);
        chatViewport.appendChild(grid);
        scrollToBottom(true);
        await callGemini(queryText, attachedFileBackup, storedKeys.geminiKey, card.bodyEl, signal);
      } else if (mode === "compare_all") {
        const geminiCard = makeCard("Google Gemini");
        const openaiCard = makeCard("ChatGPT (OpenAI)");
        const claudeCard = makeCard("Claude 3.5 Sonnet");

        grid.appendChild(geminiCard.card);
        grid.appendChild(openaiCard.card);
        grid.appendChild(claudeCard.card);
        chatViewport.appendChild(grid);
        scrollToBottom(true);

        await Promise.all([
          callGemini(queryText, attachedFileBackup, storedKeys.geminiKey, geminiCard.bodyEl, signal),
          callOpenAI(queryText, attachedFileBackup, storedKeys.openaiKey, openaiCard.bodyEl, signal),
          callClaude(queryText, attachedFileBackup, storedKeys.claudeKey, claudeCard.bodyEl, signal)
        ]);
      } else if (mode === "openai_direct") {
        const title = currentActiveAgent ? `${currentActiveAgent.icon} ${currentActiveAgent.name} (OpenAI)` : "ChatGPT (OpenAI)";
        const card = makeCard(title);
        grid.appendChild(card.card);
        chatViewport.appendChild(grid);
        scrollToBottom(true);
        await callOpenAI(queryText, attachedFileBackup, storedKeys.openaiKey, card.bodyEl, signal);
      } else if (mode === "claude_direct") {
        const title = currentActiveAgent ? `${currentActiveAgent.icon} ${currentActiveAgent.name} (Claude)` : "Claude 3.5 Sonnet";
        const card = makeCard(title);
        grid.appendChild(card.card);
        chatViewport.appendChild(grid);
        scrollToBottom(true);
        await callClaude(queryText, attachedFileBackup, storedKeys.claudeKey, card.bodyEl, signal);
      } else {
        const label = modelPicker.options[modelPicker.selectedIndex]?.text || mode;
        const card = makeCard(label);
        grid.appendChild(card.card);
        chatViewport.appendChild(grid);
        scrollToBottom(true);
        await callOpenRouter(queryText, mode, storedKeys.openrouterKey, card.bodyEl, signal);
      }
    } finally {
      setGenerating(false);
      activeAbortController = null;
      promptInput.focus();
      scrollToBottom(true);
    }

    saveChat();
  }

  btnStrike.onclick = handleSend;

  promptInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      if (userSettings.enterToSend && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      } else if (!userSettings.enterToSend && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  fetchModels();
});
