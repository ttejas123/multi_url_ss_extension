
const attachedTabs = new Set();

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "START_SEQUENCE") {
    runSequence(msg.urls, msg.tabId);
  }
});

  
  async function runSequence(urls, tabId) {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
  
      try {
        // 1️⃣ Navigate SAME TAB
        await updateTab(tabId, url);
  
        // 2️⃣ Wait for page load
        await waitForLoad(tabId);
  
        // 3️⃣ Let popup killer + rendering settle
        await delay(1500);
  
        // 4️⃣ Screenshot
        await captureTab(tabId, i);
  
      } catch (err) {
        console.error("Failed:", url, err);
      }
    }
  
    console.log("All screenshots completed");
  }
  
  /* ---------- helpers ---------- */
  
  function updateTab(tabId, url) {
    return new Promise(resolve => {
      chrome.tabs.update(tabId, { url }, resolve);
    });
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
  
  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  

/* ---------- Helpers ---------- */

function attachDebugger(tabId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.attach({ tabId }, "1.3", () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                attachedTabs.add(tabId);
                resolve();
            }
        });
    });
}

function sendCommand(tabId, method, params = {}) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand(
            { tabId },
            method,
            params,
            (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result);
                }
            }
        );
    });
}

function detachDebugger(tabId) {
    return new Promise((resolve) => {
        if (!attachedTabs.has(tabId)) return resolve();

        chrome.debugger.detach({ tabId }, () => {
            attachedTabs.delete(tabId);
            resolve();
        });
    });
}

/* ---------- Main Action ---------- */

chrome.action.onClicked.addListener(async (tab) => {
    const tabId = tab.id;
    if (!tabId) return;

    try {
        await attachDebugger(tabId);
        await sendCommand(tabId, "Page.enable");

        // Allow popup killer & layout to settle
        await new Promise((r) => setTimeout(r, 800));

        const result = await sendCommand(
            tabId,
            "Page.captureScreenshot",
            {
                format: "png",
                captureBeyondViewport: true,
                fromSurface: true
            }
        );

        const dataUrl = `data:image/png;base64,${result.data}`;

        chrome.downloads.download({
            url: dataUrl,
            filename: `fullpage-${Date.now()}.png`,
            saveAs: false
        });

    } catch (err) {
        console.error("Screenshot failed:", err);
    } finally {
        await detachDebugger(tabId);
    }
});


async function captureTab(tabId, index) {
    try {
      await attachDebugger(tabId);
      await sendCommand(tabId, "Page.enable");
  
      const result = await sendCommand(
        tabId,
        "Page.captureScreenshot",
        {
          format: "png",
          captureBeyondViewport: true,
          fromSurface: true
        }
      );
  
      const dataUrl = `data:image/png;base64,${result.data}`;
  
      chrome.downloads.download({
        url: dataUrl,
        filename: `sequence/${index + 1}.png`,
        saveAs: false
      });
  
    } finally {
      await detachDebugger(tabId);
    }
  }
  