// In antialiasing.js
export function getAntialias() {
  return localStorage.getItem("antialias") === "true";
}

export function setAntialias(value) {
  localStorage.setItem("antialias", value);
}
