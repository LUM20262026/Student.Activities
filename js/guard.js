/* Anti-clickjacking: hide the page if it is loaded inside a frame */
if (window.top !== window.self) {
  document.documentElement.style.display = "none";
  try { window.top.location = window.self.location; } catch (e) { /* cross-origin */ }
}
