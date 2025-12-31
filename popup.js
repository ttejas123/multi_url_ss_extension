const $ = id => document.getElementById(id);

$("submit").onclick = () => {
  const urls = $("urls").value
    .split("\n")
    .map(v => v.trim())
    .filter(Boolean);

  if (!urls.length) return;

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.runtime.sendMessage({
      type: "START_SEQUENCE",
      urls,
      tabId: tab.id
    });
  });
};

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type !== "PROGRESS") return;

  const p = msg.progress;

  $("current").textContent = truncate(p.current);
  $("count").textContent = `${p.completed} / ${p.total}`;
  $("passed").textContent = `Passed: ${p.passed}`;
  $("failed").textContent = `Failed: ${p.failed}`;

  const percent = p.total ? (p.completed / p.total) * 100 : 0;
  $("bar").style.width = `${percent}%`;
});

function truncate(url, len = 55) {
  if (!url) return "—";
  return url.length > len ? url.slice(0, len) + "…" : url;
}
