const toggle = document.getElementById("enabledToggle");
const depthSlider = document.getElementById("depthSlider");
const depthValue = document.getElementById("depthValue");

chrome.storage.local.get(["enabled", "depth"], (data) => {
  toggle.checked = !!data.enabled;
  const depth = data.depth || 14;
  depthSlider.value = depth;
  depthValue.textContent = depth;
});

toggle.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: toggle.checked });
});

depthSlider.addEventListener("input", () => {
  depthValue.textContent = depthSlider.value;
});

depthSlider.addEventListener("change", () => {
  chrome.storage.local.set({ depth: Number(depthSlider.value) });
});
