const theme = {
  background: "#000000",
  foreground: "#ffffff",
  cursor: "#ffffff",
  cursorAccent: "#000000",
  selection: "rgba(255, 255, 255, 0.3)",
  black: "#000000",
  red: "#ff0000",
  green: "#00ff00",
  yellow: "#ffff00",
  blue: "#0000ff",
  magenta: "#ff00ff",
  cyan: "#00ffff",
  white: "#ffffff",
  brightBlack: "#808080",
  brightRed: "#ff0000",
  brightGreen: "#00ff00",
  brightYellow: "#ffff00",
  brightBlue: "#0000ff",
  brightMagenta: "#ff00ff",
  brightCyan: "#00ffff",
  brightWhite: "#ffffff",

  // Define styles for extended ANSI escape sequences (16-255)
  extendedAnsi: (() => {
    const extendedAnsi = {};

    for (let i = 16; i <= 255; i++) {
      // Calculate the corresponding RGB values for each index
      // This calculation is based on the xterm 256-color palette formula
      const colorIndex = i - 16;
      const r = Math.floor(colorIndex / 36) * 51;
      const g = Math.floor((colorIndex % 36) / 6) * 51;
      const b = (colorIndex % 6) * 51;

      const color = `#${r.toString(16).padStart(2, "0")}${g
        .toString(16)
        .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
      extendedAnsi[i.toString()] = { color };
    }

    return extendedAnsi;
  })(),
};
var socket = io();
var term = new Terminal({
  rows: 24,
  cols: 80,
  allowProposedApi: true,
  allowTransparency: true,
  theme: theme,
});
const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);
term.loadAddon(new WebLinksAddon.WebLinksAddon());
term.open(document.getElementById("terminal"));
term.loadAddon(new CanvasAddon.CanvasAddon());
term.onResize((evt) => {
  socket.emit("resize", { cols: evt.cols, rows: evt.rows });
});
fitAddon.fit();
const term_resize_ob = new ResizeObserver((entries) => {
  try {
    fitAddon && fitAddon.fit();
  } catch (err) {
    console.log(err);
  }
});
term_resize_ob.observe(document.getElementById("terminal"));
socket.on("connect", () => {
    socket.emit("request_start", conf);
});
socket.on("request_error", (data) => {
  term.write(data);
  socket.disconnect();
});
socket.on("disconnect", () => {
  term.write("\r\n-- Disconnected from server --\r\n");
});
socket.on("data", (data) => {
  term.write(data);
});
term.onData((data) => {
  socket.emit("data", data);
});
