const attachedTabs = new Set();
const TIMEOUT_MS = 30000;

let result = {};
let progress = {
  current: "",
  completed: 0,
  total: 0,
  passed: 0,
  failed: 0
};

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "START_SEQUENCE") {
    runSequence(msg.urls, msg.tabId);
  }
});

async function runSequence(urls, tabId) {
  progress.total = urls.length;

  for (const url of urls) {
    progress.current = url;
    sendProgress();

    const domain = getBaseDomain(url);
    result[domain] ||= { passed: [], failed: [] };

    const ok = await validateUrl(url);
    if (!ok) {
      result[domain].failed.push({ url, reason: "timeout / fetch failed" });
      progress.failed++;
      progress.completed++;
      sendProgress();
      continue;
    }

    try {
      await updateTab(tabId, url);
      await waitForLoad(tabId);
      await delay(1500);
      const hasPopup = await detectDomPopup(tabId);
      const path = await capture(tabId, domain, url);
      result[domain].passed.push({ url, path, popup: hasPopup });

      progress.passed++;
    } catch (e) {
      result[domain].failed.push({ url, reason: e.message });
      progress.failed++;
    }

    progress.completed++;
    sendProgress();
  }

  downloadJSON();
}

/* ---------- URL VALIDATION ---------- */

async function validateUrl(url) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal, mode: "no-cors" });
    clearTimeout(id);
    return true;
  } catch {
    return false;
  }
}

/* ---------- SCREENSHOT ---------- */

async function capture(tabId, domain, url) {
  await attachDebugger(tabId);
  await sendCommand(tabId, "Page.enable");

  const { data } = await sendCommand(tabId, "Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true
  });

  const filename = sanitize(url) + ".png";
  const path = `screenshots/${domain}/${filename}`;

  await chrome.downloads.download({
    url: `data:image/png;base64,${data}`,
    filename: path,
    saveAs: false
  });

  await detachDebugger(tabId);
  return path;
}

/* ---------- HELPERS ---------- */

function getBaseDomain(url) {
  return new URL(url).hostname.replace(/^www\./, "");
}

function sanitize(url) {
  return url.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

function sendProgress() {
  chrome.runtime.sendMessage({ type: "PROGRESS", progress });
}

function downloadJSON() {
  const json = JSON.stringify(result, null, 2);
  const base64 = btoa(unescape(encodeURIComponent(json)));

  chrome.downloads.download({
    url: `data:application/json;base64,${base64}`,
    filename: "output.json",
    saveAs: false
  });
}

async function detectDomPopup(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const candidates = [...document.body.querySelectorAll("*")];

      return candidates.some(el => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        return (
          (style.position === "fixed" || style.position === "absolute") &&
          parseInt(style.zIndex || "0") > 100 &&
          rect.width > window.innerWidth * 0.4 &&
          rect.height > window.innerHeight * 0.3 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      });
    }
  });

  return result;
}



/* ---------- TAB + DEBUGGER ---------- */

function updateTab(tabId, url) {
  return chrome.tabs.update(tabId, { url });
}

function waitForLoad(tabId) {
  return new Promise(resolve => {
    const listener = (id, info) => {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

const delay = ms => new Promise(r => setTimeout(r, ms));

function attachDebugger(tabId) {
  return chrome.debugger.attach({ tabId }, "1.3");
}

function sendCommand(tabId, method, params = {}) {
  return chrome.debugger.sendCommand({ tabId }, method, params);
}

function detachDebugger(tabId) {
  return chrome.debugger.detach({ tabId });
}
