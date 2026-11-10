// --- OPTIONAL SUPABASE CLIENT CONFIGURATION ---
// If you want live email verification & recovery, get these free from https://supabase.com
const SUPABASE_URL = "https://YOUR_SUPABASE_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const supabaseClient = (window.supabase && SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_SUPABASE")) 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

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

// --- MASTER ADMIN SECRET PASSKEY ---
const BUNDLEX_MASTER_SECRET = "BUNDLEX-MASTER-2026";

// --- CRYPTOGRAPHIC HASH ENGINE (PBKDF2) ---
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

// --- STRUCTURED PROMPT LIBRARY ---
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

// --- FAST MULTI-SOURCE WEB GROUNDING ENGINE ---
async function fetchLiveWebContext(query) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const sanitized = query
      .replace(/\[.*?\]/g, "")
      .replace(/cham\[?i?o?n?s?\s*league/i, "UEFA Champions League")
      .trim();

    const cleanQuery = encodeURIComponent(sanitized.slice(0, 100));
    const searchUrl = `https://api.duckduckgo.com/?q=${cleanQuery}&format=json&no_html=1&skip_disambig=1`;
    
    const res = await fetch(searchUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      let context = "";

      if (data.AbstractText) {
        context += `\n- [Primary Result]: ${data.AbstractText} (Source: ${data.AbstractURL || data.AbstractSource || "Web"})`;
      }

      if (Array.isArray(data.RelatedTopics)) {
        const topSnippets = data.RelatedTopics
          .filter(t => t && t.Text)
          .slice(0, 3)
          .map(t => `- ${t.Text} [Link: ${t.FirstURL || ""}]`)
          .join("\n");
        if (topSnippets) context += `\n${topSnippets}`;
      }

      return context.trim() ? `\n\n[LIVE SEARCH DATA]:\n${context}` : "";
    }
  } catch (err) {
    console.warn("Live web search fetch skipped or timed out:", err);
  }
  return "";
}

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
  const authSuccess = document.getElementById("authSuccess");
  const authDisplayName = document.getElementById("authDisplayName");
  const authEmail = document.getElementById("authEmail");
  const authPassword = document.getElementById("authPassword");
  const authConfirmPassword = document.getElementById("authConfirmPassword");
  const btnAuthSubmit = document.getElementById("btnAuthSubmit");
  const btnAuthClose = document.getElementById("btnAuthClose");
  const btnContinueGuest = document.getElementById("btnContinueGuest");
  const tabSignIn = document.getElementById("tabSignIn");
  const tabSignUp = document.getElementById("tabSignUp");
  const tabForgot = document.getElementById("tabForgot");
  const groupDisplayName = document.getElementById("groupDisplayName");
  const groupEmail = document.getElementById("groupEmail");
  const groupPassword = document.getElementById("groupPassword");
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

  // KEYS BUTTON IS PERMANENTLY VISIBLE FOR EVERYONE
  if (btnNavKeys) {
    btnNavKeys.style.display = "inline-flex";
  }

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

  // Key Inputs Map (Including NVIDIA NIM)
  const keysSearchInput = document.getElementById("keysSearchInput");
  const keyInputsMap = {
    nvidiaKey: document.getElementById("inputNvidia"),
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
  const dispRoleBadge = document.getElementById("dispRoleBadge");
  const dispStatus = document.getElementById("dispStatus");
  const btnLockApp = document.getElementById("btnLockApp");
  const btnLogoutReset = document.getElementById("btnLogoutReset");
  const btnOpenAuthModal = document.getElementById("btnOpenAuthModal");

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
  let currentUser = null;

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

  // --- REFRESH USER AUTH STATE ---
  async function refreshUserSession() {
    if (supabaseClient) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      currentUser = session ? session.user : null;
    } else {
      const stored = await chrome.storage.local.get(["bundlexUserName", "bundlexRole"]);
      if (stored.bundlexUserName && stored.bundlexRole !== "guest") {
        currentUser = { email: stored.bundlexUserName, role: stored.bundlexRole };
      } else {
        currentUser = null;
      }
    }

    if (currentUser) {
      const email = currentUser.email || "User";
      btnNavProfile.textContent = `👤 ${email.split('@')[0]}`;
      if (dispName) dispName.textContent = email;
      if (dispRoleBadge) dispRoleBadge.textContent = "Authenticated";
      if (dispStatus) dispStatus.textContent = "Full access unlocked.";
    } else {
      btnNavProfile.textContent = "👤 Sign In";
      if (dispName) dispName.textContent = "Guest User";
      if (dispRoleBadge) dispRoleBadge.textContent = "Free Guest Mode";
      if (dispStatus) dispStatus.textContent = "Free local sandbox active.";
    }
  }

  // --- AUTH MODAL TAB CONTROLLER (SIGN IN, SIGN UP WITH INBOX LINK, FORGOT PASSWORD) ---
  let authMode = "signin";

  function setAuthMode(mode) {
    authMode = mode;
    if (authError) authError.textContent = "";
    if (authSuccess) authSuccess.textContent = "";
    [tabSignIn, tabSignUp, tabForgot].forEach(t => t && t.classList.remove("active"));

    if (mode === "signup") {
      if (tabSignUp) tabSignUp.classList.add("active");
      if (authTitle) authTitle.textContent = "Create an Account";
      if (authSubtitle) authSubtitle.textContent = "Enter your email to receive an instant verification link.";
      if (groupDisplayName) groupDisplayName.style.display = "flex";
      if (groupPassword) groupPassword.style.display = "flex";
      if (groupConfirmPassword) groupConfirmPassword.style.display = "flex";
      if (btnAuthSubmit) btnAuthSubmit.textContent = "Sign Up & Verify Email";
    } else if (mode === "forgot") {
      if (tabForgot) tabForgot.classList.add("active");
      if (authTitle) authTitle.textContent = "Reset Password";
      if (authSubtitle) authSubtitle.textContent = "Enter your email to receive a password recovery link.";
      if (groupDisplayName) groupDisplayName.style.display = "none";
      if (groupPassword) groupPassword.style.display = "none";
      if (groupConfirmPassword) groupConfirmPassword.style.display = "none";
      if (btnAuthSubmit) btnAuthSubmit.textContent = "Send Recovery Email";
    } else {
      if (tabSignIn) tabSignIn.classList.add("active");
      if (authTitle) authTitle.textContent = "Sign In to Bundlex";
      if (authSubtitle) authSubtitle.textContent = "Log in to use NVIDIA NIM, Gemini, and custom API keys.";
      if (groupDisplayName) groupDisplayName.style.display = "none";
      if (groupPassword) groupPassword.style.display = "flex";
      if (groupConfirmPassword) groupConfirmPassword.style.display = "none";
      if (btnAuthSubmit) btnAuthSubmit.textContent = "Sign In";
    }
  }

  if (tabSignIn) tabSignIn.onclick = () => setAuthMode("signin");
  if (tabSignUp) tabSignUp.onclick = () => setAuthMode("signup");
  if (tabForgot) tabForgot.onclick = () => setAuthMode("forgot");
  if (btnAuthClose) btnAuthClose.onclick = () => { authOverlay.style.display = "none"; };
  if (btnContinueGuest) {
    btnContinueGuest.onclick = () => {
      authOverlay.style.display = "none";
      modelPicker.value = "bundlex_free";
    };
  }

  if (btnNavProfile) {
    btnNavProfile.onclick = () => {
      if (currentUser) {
        toggleDrawer(drawerProfile);
      } else {
        setAuthMode("signin");
        authOverlay.style.display = "flex";
      }
    };
  }

  btnAuthSubmit.onclick = async () => {
    const email = authEmail ? authEmail.value.trim() : "";
    const password = authPassword ? authPassword.value.trim() : "";
    const displayName = (authDisplayName && authDisplayName.value.trim()) || email.split("@")[0] || "User";

    if (authError) authError.textContent = "";
    if (authSuccess) authSuccess.textContent = "";

    if (!email) {
      if (authError) authError.textContent = "Please enter your email address.";
      return;
    }

    // 1. MASTER ADMIN BYPASS (Preserved)
    if (password === BUNDLEX_MASTER_SECRET) {
      await chrome.storage.local.set({
        bundlexRole: "admin",
        bundlexUserName: displayName.toLowerCase() === "user" ? "Creator (Master)" : displayName
      });
      currentUser = { email: "Master Admin", role: "admin" };
      await refreshUserSession();
      authOverlay.style.display = "none";
      return;
    }

    // 2. LIVE SUPABASE OR LOCAL FLOW
    if (supabaseClient) {
      if (authMode === "signup") {
        if (password.length < 6) {
          if (authError) authError.textContent = "Password must be at least 6 characters.";
          return;
        }
        const { error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.href }
        });
        if (error) {
          if (authError) authError.textContent = error.message;
        } else {
          if (authSuccess) authSuccess.textContent = "📩 Verification link sent to your inbox! Please verify.";
        }
      } else if (authMode === "signin") {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
          if (authError) authError.textContent = error.message;
        } else {
          currentUser = data.user;
          await refreshUserSession();
          authOverlay.style.display = "none";
        }
      } else if (authMode === "forgot") {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
        if (error) {
          if (authError) authError.textContent = error.message;
        } else {
          if (authSuccess) authSuccess.textContent = "📩 Password recovery link sent! Check your inbox.";
        }
      }
    } else {
      // Local encrypted PBKDF2 fallback simulation
      if (authMode === "signup") {
        const confirmPass = authConfirmPassword ? authConfirmPassword.value.trim() : "";
        if (password !== confirmPass) {
          if (authError) authError.textContent = "Passwords do not match.";
          return;
        }
        const salt = "bundlex_salt_" + Date.now();
        const hash = await hashPasscode(password, salt);
        await chrome.storage.local.set({
          bundlexAuthHash: hash,
          bundlexAuthSalt: salt,
          bundlexRole: "user",
          bundlexUserName: displayName
        });
        if (authSuccess) authSuccess.textContent = "📩 Verification link sent! (Account ready)";
        currentUser = { email: displayName, role: "user" };
        setTimeout(() => { authOverlay.style.display = "none"; refreshUserSession(); }, 1200);
      } else if (authMode === "signin") {
        await chrome.storage.local.set({ bundlexRole: "user", bundlexUserName: displayName });
        currentUser = { email: displayName, role: "user" };
        await refreshUserSession();
        authOverlay.style.display = "none";
      } else if (authMode === "forgot") {
        if (authSuccess) authSuccess.textContent = "📩 Password reset email simulated for " + email;
      }
    }
  };

  if (btnLogoutReset) {
    btnLogoutReset.onclick = async () => {
      if (confirm("Log out of this session?")) {
        if (supabaseClient) await supabaseClient.auth.signOut();
        await chrome.storage.local.remove(["bundlexRole", "bundlexUserName"]);
        currentUser = null;
        await refreshUserSession();
        drawerProfile.style.display = "none";
      }
    };
  }

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
    if (authOverlay && authOverlay.style.display !== "none") {
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

  function speakResponseText(text, btn) {
    if (!('speechSynthesis' in window)) return;
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

  function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btnSpeechToText.onclick = () => alert("Speech Recognition not supported in this browser.");
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
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      promptInput.value = (promptInput.value + " " + transcript).trim();
      promptInput.dispatchEvent(new Event("input"));
    };

    recognition.onerror = () => stopVoiceRecording();
    recognition.onend = () => stopVoiceRecording();
  }

  function stopVoiceRecording() {
    isRecordingVoice = false;
    btnSpeechToText.classList.remove("recording");
    btnSpeechToText.textContent = "🎙️";
  }

  btnSpeechToText.onclick = () => {
    if (!recognition) setupSpeechRecognition();
    if (isRecordingVoice) {
      recognition.stop();
      stopVoiceRecording();
    } else {
      try { recognition.start(); } catch (e) { stopVoiceRecording(); }
    }
  };

  setupSpeechRecognition();

  promptInput.addEventListener("input", () => {
    promptInput.style.height = "auto";
    promptInput.style.height = Math.min(promptInput.scrollHeight, 140) + "px";
  });

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

  function applyThemeSettings() {
    document.documentElement.style.setProperty("--primary", userSettings.accentColor);
    document.documentElement.style.setProperty("--chat-font-size", userSettings.fontSize);
  }

  function saveSettings() {
    chrome.storage.local.set({ userSettings });
    applyThemeSettings();
  }

  toggleSettingStream.onclick = () => { userSettings.streamResponses = !userSettings.streamResponses; toggleSettingStream.classList.toggle("on", userSettings.streamResponses); saveSettings(); };
  toggleSettingSound.onclick = () => { userSettings.soundNotifications = !userSettings.soundNotifications; toggleSettingSound.classList.toggle("on", userSettings.soundNotifications); saveSettings(); };
  toggleSettingEnter.onclick = () => { userSettings.enterToSend = !userSettings.enterToSend; toggleSettingEnter.classList.toggle("on", userSettings.enterToSend); saveSettings(); };
  toggleSettingResume.onclick = () => { userSettings.resumeChat = !userSettings.resumeChat; toggleSettingResume.classList.toggle("on", userSettings.resumeChat); saveSettings(); };

  settingAccentColor.onchange = (e) => { userSettings.accentColor = e.target.value; saveSettings(); };
  settingFontSize.onchange = (e) => { userSettings.fontSize = e.target.value; saveSettings(); };
  settingVoicePitch.oninput = (e) => { userSettings.voicePitch = parseFloat(e.target.value); saveSettings(); };
  settingVoiceRate.oninput = (e) => { userSettings.voiceRate = parseFloat(e.target.value); saveSettings(); };

  btnExportChats.onclick = async () => {
    const { savedSessions = [] } = await chrome.storage.local.get(["savedSessions"]);
    const blob = new Blob([JSON.stringify(savedSessions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bundlex_chats_${Date.now()}.json`;
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
          alert(`Imported ${imported.length} chat sessions!`);
          renderHistory();
        }
      } catch (err) { alert("Invalid backup: " + err.message); }
    };
    reader.readAsText(file);
  };

  btnResetSettings.onclick = () => {
    if (confirm("Reset settings to default?")) {
      userSettings = { streamResponses: true, soundNotifications: true, enterToSend: true, resumeChat: true, accentColor: "#38bdf8", fontSize: "12px", voicePitch: 1.0, voiceRate: 1.0 };
      saveSettings();
      syncSettingsUI();
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
        kbDocuments.unshift({
          id: "kb_file_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
          title: file.name,
          category: file.name.split('.').pop().toUpperCase() + " File",
          content: typeof textContent === 'string' ? textContent.slice(0, 10000) : "Parsed document",
          created: new Date().toLocaleDateString()
        });
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
        kbDocTitle.value = `${appName} Stream`;
        kbDocContent.placeholder = `Provide access link or data for ${appName}...`;
        kbDocTitle.focus();
      };
    });
  }

  btnOpenAddKB.onclick = () => { addKBForm.style.display = "block"; kbDocTitle.focus(); };
  btnCancelAddKB.onclick = () => { addKBForm.style.display = "none"; };

  btnSaveKBDoc.onclick = async () => {
    const title = kbDocTitle.value.trim();
    const category = kbDocCategory.value.trim() || "Connected App";
    const content = kbDocContent.value.trim();
    if (!title || !content) return alert("Provide both Title and Content.");
    const { kbDocuments = [] } = await chrome.storage.local.get(["kbDocuments"]);
    kbDocuments.unshift({ id: "kb_" + Date.now(), title, category, content, created: new Date().toLocaleDateString() });
    await chrome.storage.local.set({ kbDocuments });
    kbDocTitle.value = ""; kbDocCategory.value = ""; kbDocContent.value = "";
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
      kbContainer.innerHTML = `<div style="font-size:11px; color:#94a3b8; text-align:center; padding:15px;">Knowledge Base ready. Upload files or connect an app above.</div>`;
      return;
    }

    filtered.forEach(doc => {
      const card = document.createElement("div");
      card.className = "prompt-card";
      card.innerHTML = `
        <div class="prompt-top">
          <div><div class="prompt-title" style="color:var(--primary);">📄 ${doc.title}</div><span class="prompt-cat">${doc.category}</span></div>
          <button class="mini-btn btn-del-kb" style="background:#b91c1c; color:#fff;">🗑️ Delete</button>
        </div>
        <div class="prompt-desc">${doc.content}</div>
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
      terms.forEach(t => { if (text.includes(t)) score += 1; });
      if (score > 0 || kbDocuments.length <= 4) matches.push(`[DOC: ${doc.title}]\n${doc.content.slice(0, 1500)}`);
    });
    return matches.length > 0 ? `\n\n[KNOWLEDGE BASE]:\n` + matches.slice(0, 4).join("\n\n") : "";
  }

  // Artifacts runner
  function enhanceAssistantCardWithRunner(cardContentEl, fullText) {
    const codeBlockRegex = /```html\s*([\s\S]*?)```/i;
    const match = fullText.match(codeBlockRegex);
    if (match && match[1]) {
      const rawCode = match[1];
      if (cardContentEl.querySelector(".bundlex-run-code-btn")) return;
      const runBtn = document.createElement("button");
      runBtn.className = "bundlex-run-code-btn";
      runBtn.innerHTML = "▶️ Run Live App / Game";
      runBtn.style.cssText = "margin-top:12px; background:#10b981; color:#0f172a; border:none; padding:8px 16px; border-radius:6px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;";
      runBtn.onclick = () => {
        const modal = document.getElementById("canvasModal");
        const iframe = document.getElementById("canvasFrame");
        if (modal && iframe) {
          iframe.srcdoc = rawCode;
          modal.style.display = "flex";
        }
      };
      cardContentEl.appendChild(document.createElement("br"));
      cardContentEl.appendChild(runBtn);
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

  btnOpenCreateAgent.onclick = () => { createAgentForm.style.display = "block"; btnOpenCreateAgent.style.display = "none"; };
  btnCancelCreateAgent.onclick = () => { createAgentForm.style.display = "none"; btnOpenCreateAgent.style.display = "inline-block"; };

  btnSaveNewAgent.onclick = async () => {
    const name = newAgentName.value.trim();
    const instructions = newAgentInstructions.value.trim();
    if (!name || !instructions) return alert("Provide both name and instructions.");
    const { customAgents = [] } = await chrome.storage.local.get(["customAgents"]);
    customAgents.unshift({
      id: "agent_" + Date.now(),
      name,
      icon: newAgentIcon.value.trim() || "🤖",
      category: newAgentCategory.value.trim() || "Custom",
      desc: instructions.slice(0, 75) + "...",
      instructions,
      assignedTool: newAgentAssignedTool.value
    });
    await chrome.storage.local.set({ customAgents });
    btnCancelCreateAgent.click();
    renderAgents();
  };

  async function renderAgents() {
    if (!agentsContainer) return;
    agentsContainer.innerHTML = "";
    const { customAgents = [] } = await chrome.storage.local.get(["customAgents"]);
    const allAgents = [...customAgents, ...DEFAULT_AGENTS];
    const q = agentSearchInput.value.toLowerCase().trim();
    const filtered = allAgents.filter(a => !q || a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));

    filtered.forEach(agent => {
      const isSelected = currentActiveAgent && currentActiveAgent.id === agent.id;
      const card = document.createElement("div");
      card.className = "prompt-card";
      card.innerHTML = `
        <div class="prompt-top">
          <div style="display:flex; align-items:center; gap:8px;"><span>${agent.icon}</span><strong>${agent.name}</strong></div>
          <button class="mini-btn select-agent-btn">${isSelected ? "✓ Active" : "Select"}</button>
        </div>
        <div class="prompt-desc">${agent.desc}</div>
      `;
      card.querySelector(".select-agent-btn").onclick = () => {
        currentActiveAgent = agent;
        chrome.storage.local.set({ activeAgent: agent });
        updateActiveAgentBanner();
        drawerAgents.style.display = "none";
      };
      agentsContainer.appendChild(card);
    });
  }

  agentSearchInput.oninput = renderAgents;

  // Plugins & Tools
  function updatePluginBadge() {
    const count = BUNDLEX_PLUGINS.filter(p => p.enabled).length;
    activePluginsBadge.textContent = `${count} Active`;
  }

  function renderPlugins() {
    if (!pluginsContainer) return;
    pluginsContainer.innerHTML = "";
    BUNDLEX_PLUGINS.forEach(p => {
      const card = document.createElement("div");
      card.className = "prompt-card";
      card.innerHTML = `
        <div class="prompt-top">
          <div style="display:flex; align-items:center; gap:8px;"><span>${p.icon}</span><strong>${p.name}</strong></div>
          <button class="mini-btn toggle-plugin-btn">${p.enabled ? "✓ Enabled" : "+ Enable"}</button>
        </div>
        <div class="prompt-desc">${p.desc}</div>
      `;
      card.querySelector(".toggle-plugin-btn").onclick = () => {
        p.enabled = !p.enabled;
        updatePluginBadge();
        renderPlugins();
      };
      pluginsContainer.appendChild(card);
    });
  }

  pluginSearchInput.oninput = renderPlugins;

  async function applyActivePlugins(raw) {
    let augmented = raw;
    if (currentActiveAgent && currentActiveAgent.instructions) {
      augmented = `[SYSTEM PERSONA - ${currentActiveAgent.name}]: ${currentActiveAgent.instructions}\n\n[USER INQUIRY]: ` + augmented;
    }
    if (isThinkingMode) {
      augmented += `\n\n[Thinking Mode: Effort = ${reasoningEffort.toUpperCase()}]`;
    }
    if (isKnowledgeBase) {
      const kb = await queryKnowledgeBase(raw);
      if (kb) augmented += kb;
    }
    return augmented;
  }

  // Prompt Library
  function renderPrompts() {
    promptsList.innerHTML = "";
    const q = promptSearchInput.value.toLowerCase().trim();
    const filtered = BUNDLEX_PROMPTS.filter(p => (activeCat === "all" || p.cat === activeCat) && (!q || p.title.toLowerCase().includes(q) || p.text.toLowerCase().includes(q)));

    filtered.forEach(p => {
      const card = document.createElement("div");
      card.className = "prompt-card";
      card.innerHTML = `
        <div class="prompt-top"><span class="prompt-title">${p.title}</span><span class="prompt-cat">${p.cat}</span></div>
        <div class="prompt-desc">${p.text}</div>
        <div class="prompt-actions"><button class="mini-btn btn-use">⚡ Use Prompt</button></div>
      `;
      card.querySelector(".btn-use").onclick = () => {
        promptInput.value = p.text;
        drawerPrompts.style.display = "none";
        promptInput.focus();
      };
      promptsList.appendChild(card);
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
    const preview = firstMsg ? (firstMsg.getAttribute("data-raw") || firstMsg.textContent).slice(0, 35) : "Chat";
    const { savedSessions = [] } = await chrome.storage.local.get(["savedSessions"]);
    savedSessions.unshift({ id: Date.now(), title: preview, html: chatHtml, date: new Date().toLocaleDateString() });
    await chrome.storage.local.set({ savedSessions: savedSessions.slice(0, 50) });
  }

  btnNewChat.onclick = async () => {
    await archiveCurrentSession();
    chatViewport.innerHTML = "";
    chrome.storage.local.remove("chatBackup");
    promptInput.value = "";
    promptInput.focus();
  };

  btnClearHistory.onclick = () => {
    if (confirm("Delete all chat sessions?")) {
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
      historyBackupContainer.innerHTML = `<div style="font-size:11px; color:#94a3b8; text-align:center; padding:20px;">No saved conversations yet.</div>`;
      return;
    }
    savedSessions.forEach(session => {
      const card = document.createElement("div");
      card.className = "prompt-card";
      card.innerHTML = `
        <div class="prompt-top"><span class="prompt-title">${session.title}...</span><span>${session.date}</span></div>
        <div class="prompt-actions"><button class="mini-btn btn-open">📂 Open</button></div>
      `;
      card.querySelector(".btn-open").onclick = () => {
        chatViewport.innerHTML = session.html;
        drawerHistory.style.display = "none";
      };
      historyBackupContainer.appendChild(card);
    });
  }

  // Load Saved Keys
  chrome.storage.local.get([...Object.keys(keyInputsMap), ...Object.keys(advInputsMap), "chatBackup"]).then((data) => {
    Object.keys(keyInputsMap).forEach(k => {
      if (data[k] && keyInputsMap[k]) keyInputsMap[k].value = data[k];
    });
    Object.keys(advInputsMap).forEach(k => {
      if (data[k] && advInputsMap[k]) advInputsMap[k].value = data[k];
    });
    if (data.chatBackup && userSettings.resumeChat) {
      chatViewport.innerHTML = data.chatBackup;
      scrollToBottom(false);
    }
  });

  btnSaveKeys.onclick = () => {
    const dataToSave = {};
    Object.keys(keyInputsMap).forEach(k => { if (keyInputsMap[k]) dataToSave[k] = keyInputsMap[k].value.trim(); });
    Object.keys(advInputsMap).forEach(k => { if (advInputsMap[k]) dataToSave[k] = advInputsMap[k].value.trim(); });
    chrome.storage.local.set(dataToSave).then(() => {
      alert("✅ All API keys and settings saved in your browser!");
      drawerKeys.style.display = "none";
    });
  };

  function saveChat() { chrome.storage.local.set({ chatBackup: chatViewport.innerHTML }); }

  btnAttachFile.onclick = () => filePicker.click();
  filePicker.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      currentFile = { name: file.name, type: file.type || "application/octet-stream", base64: reader.result.split(",")[1] };
      attachmentFileName.textContent = file.name;
      attachmentBadge.style.display = "flex";
    };
    reader.readAsDataURL(file);
  };

  btnDropFile.onclick = () => { currentFile = null; attachmentBadge.style.display = "none"; };

  btnGrabTab.onclick = async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.url) {
        promptInput.value = (promptInput.value + `\n[Tab URL: ${tabs[0].url}]`).trim();
        promptInput.focus();
      }
    } catch (e) {}
  };

  // Populate models with NVIDIA NIM included
  function populateModels(list) {
    const cur = modelPicker.value;
    modelPicker.innerHTML = `
      <option value="bundlex_free" selected>⚡ Bundlex Free AI (No Key Needed)</option>
      <option value="nvidia_nim">🟢 NVIDIA NIM (Llama 3.3 / Nemotron)</option>
      <option value="gemini_direct">Google Gemini (Direct)</option>
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

  async function fetchModels() {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models");
      const json = await res.json();
      if (json && json.data) {
        openRouterCatalog = json.data;
        populateModels(openRouterCatalog);
      }
    } catch (e) { populateModels([]); }
  }

  modelSearch.oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = openRouterCatalog.filter(m => (m.name && m.name.toLowerCase().includes(q)) || m.id.toLowerCase().includes(q));
    populateModels(filtered);
    if (filtered.length > 0) modelPicker.value = filtered[0].id;
  };

  function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      if (btn) { const old = btn.textContent; btn.textContent = "✅ Copied"; setTimeout(() => { btn.textContent = old; }, 1500); }
    });
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
  });

  async function streamRenderText(element, fullText, signal) {
    if (!userSettings.streamResponses) {
      element.textContent = fullText;
      enhanceAssistantCardWithRunner(element, fullText);
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
    enhanceAssistantCardWithRunner(element, fullText);
  }

  // --- API ENGINES ---

  // 1. Official NVIDIA NIM Engine (DGX Cloud)
  async function callNvidiaNIM(prompt, key, bodyEl, signal) {
    if (!key) {
      bodyEl.textContent = "⚠️ Missing NVIDIA Key. Open '🔑 Keys' at top, enter your nvapi-... key from build.nvidia.com, and click Save.";
      return;
    }
    bodyEl.textContent = "⚡ Running on NVIDIA DGX Cloud...";
    scrollToBottom(true);

    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key.trim()}`
        },
        body: JSON.stringify({
          model: "meta/llama-3.3-70b-instruct",
          messages: [
            { role: "system", content: "You are an AI assistant running on NVIDIA NIM. Current year is 2026. Deliver concise, verified facts. Wrap playable code inside ```html ... ```." },
            { role: "user", content: prompt }
          ],
          temperature: 0.5,
          max_tokens: 1024
        }),
        signal
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || `❌ NVIDIA Error: ${data.detail || "Check API key."}`;
      await streamRenderText(bodyEl, reply, signal);
      playNotificationChime();
    } catch (err) {
      bodyEl.textContent = err.name === "AbortError" ? "🛑 Stopped." : `❌ Network Error: ${err.message}`;
    }
    saveChat();
    scrollToBottom(true);
  }

  // 2. Bundlex Free AI Fallback
  async function callFreeAI(prompt, bodyEl, signal) {
    const cleanUserPrompt = prompt.replace(/\[.*?\]/gs, "").trim();

    // Image Generator
    const imgRegex = /^(?:generate|draw|create|make|paint|render)?\s*(?:an?\s+)?(?:image|photo|picture|graphic|illustration|art)\s+(?:of\s+)?|^(?:draw|paint|sketch)\s+/i;
    if (imgRegex.test(cleanUserPrompt)) {
      bodyEl.textContent = "🎨 Generating visual...";
      scrollToBottom(true);
      const cleanSubject = cleanUserPrompt.replace(imgRegex, '').trim();
      const seed = Math.floor(Math.random() * 100000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanSubject)}?width=1024&height=1024&seed=${seed}&nologo=true`;
      bodyEl.innerHTML = `
        <div style="margin-bottom:8px; font-weight:600; color:var(--primary);">🎨 Generated Visual: "${cleanSubject}"</div>
        <img src="${imageUrl}" style="max-width:100%; border-radius:8px; display:block; margin:8px 0; box-shadow:0 4px 14px rgba(0,0,0,0.4);" />
        <a href="${imageUrl}" target="_blank" style="color:var(--primary); font-size:11px; text-decoration:underline;">Open Full Resolution ↗</a>
      `;
      playNotificationChime();
      saveChat();
      scrollToBottom(true);
      return;
    }

    // Dynamic Live Web Grounding
    const now = new Date();
    const currentDateStr = now.toISOString().split("T")[0];
    let webContext = "";
    if (/^(who|what|when|where|why|how|latest|news|price|score|winner|won|vs|match|current|today)\b/i.test(cleanUserPrompt) || cleanUserPrompt.includes("?")) {
      bodyEl.textContent = "🌐 Searching across live web sources...";
      webContext = await fetchLiveWebContext(cleanUserPrompt);
    }

    const systemPrompt = 
      "You are Bundlex Free AI. " +
      `Current Date: ${currentDateStr}. Current Year is 2026. Deliver concise, verified facts. ` +
      "Verified Facts: Paris Saint-Germain (PSG) won the 2025 UEFA Champions League (5-0 against Inter Milan). Real Madrid won in 2024 (15th title). " +
      (webContext ? "Use this verified search data: " + webContext + " " : "") +
      "If runnable code is requested, wrap it inside ```html ... ``` blocks.";

    const promptWithWeb = webContext ? `${prompt}\n${webContext}` : prompt;
    bodyEl.textContent = "⚡ Generating response with Bundlex Free AI...";
    scrollToBottom(true);

    let finalResponse = null;
    try {
      const res = await fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: promptWithWeb }],
          model: "openai",
          seed: Math.floor(Math.random() * 9999)
        }),
        signal
      });
      if (res.ok) finalResponse = await res.text();
    } catch (err) {}

    if (!finalResponse) {
      try {
        const fallbackRes = await fetch(`https://text.pollinations.ai/${encodeURIComponent(systemPrompt + "\n\n" + promptWithWeb)}?model=mistral`, { signal });
        if (fallbackRes.ok) finalResponse = await fallbackRes.text();
      } catch (fallbackErr) {}
    }

    if (finalResponse) {
      await streamRenderText(bodyEl, finalResponse, signal);
      playNotificationChime();
    } else {
      bodyEl.textContent = "⚠️ Free server busy. Try again or switch to NVIDIA NIM / Gemini.";
    }
    saveChat();
    scrollToBottom(true);
  }

  // 3. Google Gemini Direct
  async function callGemini(prompt, fileData, key, bodyEl, signal) {
    if (!key) {
      bodyEl.textContent = "⚠️ Missing Gemini Key. Open '🔑 Keys' at top, paste your key from aistudio.google.com, and click Save.";
      return;
    }
    bodyEl.textContent = "⚡ Searching web & generating response...";
    scrollToBottom(true);

    const parts = [];
    if (fileData && fileData.base64) parts.push({ inline_data: { mime_type: fileData.type, data: fileData.base64 } });
    parts.push({ text: prompt });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key.trim())}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] }),
        signal
      });
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || `❌ Gemini Error: ${data.error?.message || "Invalid Key"}`;
      await streamRenderText(bodyEl, reply, signal);
      playNotificationChime();
    } catch (err) {
      bodyEl.textContent = err.name === "AbortError" ? "🛑 Stopped." : `❌ Error: ${err.message}`;
    }
    saveChat();
    scrollToBottom(true);
  }

  // 4. OpenAI Direct
  async function callOpenAI(prompt, fileData, key, bodyEl, signal) {
    if (!key) return (bodyEl.textContent = "⚠️ Missing OpenAI Key. Open '🔑 Keys' at top.");
    bodyEl.textContent = "⚡ Calling OpenAI...";
    scrollToBottom(true);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key.trim()}` },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] }),
        signal
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || `❌ OpenAI Error: ${data.error?.message || "Check Key"}`;
      await streamRenderText(bodyEl, reply, signal);
      playNotificationChime();
    } catch (err) {
      bodyEl.textContent = err.name === "AbortError" ? "🛑 Stopped." : `❌ Error: ${err.message}`;
    }
    saveChat();
    scrollToBottom(true);
  }

  // 5. Claude Direct
  async function callClaude(prompt, fileData, key, bodyEl, signal) {
    if (!key) return (bodyEl.textContent = "⚠️ Missing Claude Key. Open '🔑 Keys' at top.");
    bodyEl.textContent = "⚡ Calling Claude...";
    scrollToBottom(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({ model: "claude-3-5-sonnet-20241022", max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
        signal
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || `❌ Claude Error: ${data.error?.message || "Check Key"}`;
      await streamRenderText(bodyEl, reply, signal);
      playNotificationChime();
    } catch (err) {
      bodyEl.textContent = err.name === "AbortError" ? "🛑 Stopped." : `❌ Error: ${err.message}`;
    }
    saveChat();
    scrollToBottom(true);
  }

  // 6. OpenRouter
  async function callOpenRouter(prompt, modelId, key, bodyEl, signal) {
    if (!key) return (bodyEl.textContent = "⚠️ Missing OpenRouter Key. Open '🔑 Keys' at top.");
    bodyEl.textContent = "⚡ Calling OpenRouter...";
    scrollToBottom(true);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key.trim()}` },
        body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: prompt }] }),
        signal
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || `❌ OpenRouter Error: ${data.error?.message || "Check Key"}`;
      await streamRenderText(bodyEl, reply, signal);
      playNotificationChime();
    } catch (err) {
      bodyEl.textContent = err.name === "AbortError" ? "🛑 Stopped." : `❌ Error: ${err.message}`;
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
          <button class="card-speak-btn">🔊 Listen</button>
          <button class="card-copy-btn">📋 Copy</button>
        </div>
      </div>
      <div class="card-content">⚡ Thinking...</div>
    `;
    return { card, bodyEl: card.querySelector(".card-content") };
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

  // --- SEND CONTROLLER WITH LOGIN GATE FOR KEYED / NVIDIA MODELS ---
  async function handleSend() {
    if (isGenerating) return;

    const rawText = promptInput.value.trim();
    if (!rawText && !currentFile) return;

    const mode = modelPicker.value;

    // GATING CHECK: Free mode is 100% open without login; custom API keys & NVIDIA models require login
    if (mode !== "bundlex_free" && !currentUser) {
      setAuthMode("signin");
      authTitle.textContent = "Login Required for Custom Models";
      authSubtitle.textContent = "Please sign in or create an account to use custom API keys and NVIDIA NIM. Free Mode requires no login.";
      authOverlay.style.display = "flex";
      return;
    }

    let queryText = rawText || (currentFile ? `Please analyze this attached file: ${currentFile.name}` : "");
    queryText = await applyActivePlugins(queryText);

    const attachedFileBackup = currentFile ? { ...currentFile } : null;

    promptInput.value = "";
    promptInput.style.height = "44px";
    btnDropFile.click();

    const userContainer = document.createElement("div");
    userContainer.className = "msg-user-container";
    userContainer.innerHTML = `<div class="msg-bubble-user" data-raw="${encodeURIComponent(rawText)}">${rawText.replace(/</g, "&lt;")}</div>`;
    chatViewport.appendChild(userContainer);
    scrollToBottom(true);

    const storedKeys = await chrome.storage.local.get(["nvidiaKey", "geminiKey", "openaiKey", "claudeKey", "openrouterKey"]);

    const grid = document.createElement("div");
    grid.className = "arena-grid";

    activeAbortController = new AbortController();
    const signal = activeAbortController.signal;
    setGenerating(true);

    try {
      if (mode === "bundlex_free") {
        const title = currentActiveAgent ? `${currentActiveAgent.icon} ${currentActiveAgent.name} (Bundlex Free)` : "⚡ Bundlex Free AI";
        const card = makeCard(title);
        grid.appendChild(card.card);
        chatViewport.appendChild(grid);
        scrollToBottom(true);
        await callFreeAI(queryText, card.bodyEl, signal);
      } else if (mode === "nvidia_nim") {
        const card = makeCard("🟢 NVIDIA NIM (Llama 3.3 70B)");
        grid.appendChild(card.card);
        chatViewport.appendChild(grid);
        scrollToBottom(true);
        await callNvidiaNIM(queryText, storedKeys.nvidiaKey, card.bodyEl, signal);
      } else if (mode === "gemini_direct") {
        const title = currentActiveAgent ? `${currentActiveAgent.icon} ${currentActiveAgent.name} (Gemini)` : "Google Gemini";
        const card = makeCard(title);
        grid.appendChild(card.card);
        chatViewport.appendChild(grid);
        scrollToBottom(true);
        await callGemini(queryText, attachedFileBackup, storedKeys.geminiKey, card.bodyEl, signal);
      } else if (mode === "compare_all") {
        const nvidiaCard = makeCard("NVIDIA NIM");
        const geminiCard = makeCard("Google Gemini");
        const openaiCard = makeCard("ChatGPT (OpenAI)");

        grid.appendChild(nvidiaCard.card);
        grid.appendChild(geminiCard.card);
        grid.appendChild(openaiCard.card);
        chatViewport.appendChild(grid);
        scrollToBottom(true);

        await Promise.all([
          callNvidiaNIM(queryText, storedKeys.nvidiaKey, nvidiaCard.bodyEl, signal),
          callGemini(queryText, attachedFileBackup, storedKeys.geminiKey, geminiCard.bodyEl, signal),
          callOpenAI(queryText, attachedFileBackup, storedKeys.openaiKey, openaiCard.bodyEl, signal)
        ]);
      } else if (mode === "openai_direct") {
        const card = makeCard("ChatGPT (OpenAI)");
        grid.appendChild(card.card);
        chatViewport.appendChild(grid);
        scrollToBottom(true);
        await callOpenAI(queryText, attachedFileBackup, storedKeys.openaiKey, card.bodyEl, signal);
      } else if (mode === "claude_direct") {
        const card = makeCard("Claude 3.5 Sonnet");
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

  await refreshUserSession();
  fetchModels();
});
