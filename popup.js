document.getElementById("submit").addEventListener("click", () => {
    const urls = document
      .getElementById("urls")
      .value
      .split("\n")
      .map(u => u.trim())
      .filter(Boolean);
  
    if (!urls.length) {
      alert("No URLs provided");
      return;
    }
  
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) return;
  
      // 🔥 FIRE AND FORGET — NO await, NO then()
      chrome.runtime.sendMessage({
        type: "START_SEQUENCE",
        urls,
        tabId: tab.id
      });
  
      // optional UX
      window.close();
    });
  });
  