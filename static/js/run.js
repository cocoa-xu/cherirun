$(function () {
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

  var socket = io("wss://cloudshell.cheri.run");
  term.write('connecting to server...');
  term.onResize((evt) => {
    socket.emit("resize", { 
      cols: evt.cols,
      rows: evt.rows
    });
  });
  fitAddon.fit();
  const connectingHint = setInterval(() => {
    if (socket.connected) {
      clearInterval(connectingHint);
      return;
    }
    term.write('.');
  }, 1000);
  let sizeUpdated = false;
  const term_resize_ob = new ResizeObserver(() => {
    try {
      fitAddon && fitAddon.fit();
    } catch (err) {
      console.log(err);
    }
  });
  term_resize_ob.observe(document.getElementById("terminal"));
  socket.on("connect", () => {
    term.writeln("Connected to cheri.run server!");
  });
  socket.on('not-ready', () => {
    term.writeln("The host server is still starting. Please try again later.");
  });
  socket.on('exit', (evt) => {
    term.write("Process exited with code " + evt.exitCode);
    sizeUpdated = false;
    socket.disconnect();
  });
  socket.on("disconnect", () => {
    document.getElementById("session_time").innerHTML += "<br>Disconnected from server.";
    term.write("\r\n-- Disconnected from server --\r\n");
    socket.disconnect();
  });
  socket.on("data", (data) => {
    if (!sizeUpdated) {
      socket.emit('resize', {
        cols: term.cols,
        rows: term.rows
      })
      sizeUpdated = true
    }
    term.write(data);
  });
  term.onData((data) => {
    if (socket.connected) {
      socket.emit("data", data);
    }
  });

  // set up drag to upload
  const elem = document.getElementById("terminal")
  elem.addEventListener('dragenter', (e) => {
    if (!elem.classList.contains('dropzone-active'))
      elem.classList.add('dropzone-active')
  })

  elem.addEventListener('dragleave', (e) => {
    e.preventDefault()
    if (elem.classList.contains('dropzone-active'))
      elem.classList.remove('dropzone-active')
  })

  elem.addEventListener('dragover', (e) => {
    e.preventDefault()
  })

  elem.addEventListener('drop', (e) => {
    e.preventDefault()
    elem.classList.remove('dropzone-active')
    const file = e.dataTransfer.files[0]
    const fileName = file.name
    if (file.size > 5 * 1024 * 1024) {
      this.alert("File too large. Max upload size is 5MB, your file is " + (file.size / 1024 / 1024).toFixed(2) + "MB")
      return
    }
    uploadSpinner.style.visibility = 'visible'
    socket.emit('upload', { file, fileName: file.name }, (result) => {
      uploadSpinner.style.visibility = 'hidden'
      console.log("upload result", result)
      if (result == 0) {
        this.alert(`${fileName} was uploaded to your home directory`)
      } else {
        if (result.err) {
          this.alert(result.err)
        }
      }
    })
  })

  sWindowUI();
  var zIndex = 1,
    fullHeight = $(window).height(),
    fullWidth = $(window).width();

  $(window).resize(function () {
    fullWidth = $(window).width();
    fullHeight = $(window).height();

    $(".window").draggable({
      containment: [
        -1 * $(".desktop").width(),
        22,
        $(".desktop").width(),
        $(".desktop").height(),
      ],
    });
  });

  // Set window active when mousedown
  $(".desktop").mousedown(function (e) {
    sWindowUI();
    if ($(e.target).parents(".window").length) {
      sWindowActive($(e.target).parents(".window"));
    }
  });

  $(".window__actions a").click(function (e) {
    e.preventDefault();
  });

  function sWindowUI() {
    // Makes sure every window is draggable
    $(".desktop .window:not(.ui-draggable)").draggable({
      containment: [
        -1 * $(".desktop").width(),
        22,
        $(".desktop").width(),
        $(window).height(),
      ],
      handle: ".window__handler",
      start: function (event, ui) {
        sWindowActive($(this));
        $(".context").fadeOut(50);
      },
      stop: function () {
        var initialHeight = $(this).height(),
          initialWidth = $(this).width(),
          initialTop = $(this).position().top,
          initialLeft = $(this).position().left;
      },
    });
    // Makes sure every window is resizable
    $(".desktop .window:not(.ui-resizable)").resizable({
      handles: "all",
      stop: function () {
        var initialHeight = $(this).height(),
          initialWidth = $(this).width(),
          initialTop = $(this).position().top,
          initialLeft = $(this).position().left;
      },
    });
  }

  function sWindowActive(window) {
    $(".window").removeClass("window--active");
    var appName = window.data("window");
    var targetWindow = $('.window[data-window="' + appName + '"]');
    window.addClass("window--active");
    window.css({ "z-index": zIndex++ });
    $(".taskbar__item[data-window]").removeClass("taskbar__item--active");
    $('.taskbar__item[data-window="' + appName + '"]')
      .addClass("taskbar__item--active")
      .addClass("taskbar__item--open");
  }

  if ($(this).hasClass("window--maximized")) {
    $(this).removeClass("window--maximized");

    $(this).css({
      height: initialHeight,
      width: initialWidth,
      top: 0,
      left: 50,
    });
  }

  $(".window__controls").each(function () {
    var parentWindow = $(this).closest(".window");
    var appName = $(parentWindow).data("window");

    $(this)
      .find("a")
      .click(function (e) {
        e.preventDefault();
      });

    $(this)
      .find(".window__close")
      .click(function (e) {
        $(parentWindow)
          .addClass("window--closed")
          .css({ "pointer-events": "none", opacity: 0 });
        //.addClass("window--closing")

        setTimeout(function () {
          //$(parentWindow).removeClass("window--closing");
          $(parentWindow).removeClass("window--active");
          if (parentWindow.hasClass("tmp")) {
            parentWindow.remove();
          }
        }, 1000);

        setTimeout(function () {
          $('.taskbarApp[data-window="' + appName + '"]').removeClass("open");
          $('.taskbar__item[data-window="' + appName + '"]').removeClass(
            "taskbar__item--open taskbar__item--active"
          );
        }, 1);
      });

    $(this)
      .find(".window__maximize")
      .click(function (e) {
        $(parentWindow).toggleClass("window--maximized");

        if (!$(parentWindow).hasClass("window--maximized")) {
          $(parentWindow).css({
            height: initialHeight,
            width: initialWidth,
            top: initialTop,
            left: initialLeft,
          });
        } else {
          initialHeight = $(parentWindow).height();
          initialWidth = $(parentWindow).width();
          initialTop = $(parentWindow).position().top;
          initialLeft = $(parentWindow).position().left;

          $(parentWindow).css({
            height: fullHeight - 34,
            width: fullWidth,
            top: 0,
            left: 0,
          });
        }
      });
  });
});
