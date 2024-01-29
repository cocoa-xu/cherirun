$(function() {
	sWindowUI();
	$(".messages").animate({ scrollTop: $(".messages").prop("scrollHeight") }, 0);
	var zIndex = 1,
		fullHeight = $(window).height(),
		fullWidth = $(window).width();

	$(window).resize(function() {
		fullWidth = $(window).width();
		fullHeight = $(window).height();

		$(".window").draggable({
			containment: [
				-1 * $(".desktop").width(),
				22,
				$(".desktop").width(),
				$(".desktop").height()
			]
		});
	});
	
	// Set window active when mousedown
	$(".desktop").mousedown(function(e) {
		sWindowUI();
		if ($(e.target).parents(".window").length) {
			sWindowActive($(e.target).parents(".window"));
		}
	});

	$(".window__actions a").click(function(e) {
		e.preventDefault();
	});
	
	function sWindowUI() {
		// Makes sure every window is draggable
		$(".desktop .window:not(.ui-draggable)").draggable({
			containment: [
				-1 * $(".desktop").width(),
				22,
				$(".desktop").width(),
				$(window).height()
			],
			handle: ".window__handler",
			start: function(event, ui) {
				sWindowActive($(this));
				$(".context").fadeOut(50);
			},
			stop: function() {
				var initialHeight = $(this).height(),
					initialWidth = $(this).width(),
					initialTop = $(this).position().top,
					initialLeft = $(this).position().left;
			}
		});
		// Makes sure every window is resizable
		$(".desktop .window:not(.ui-resizable)").resizable({
			handles: "all",
			stop: function() {
				var initialHeight = $(this).height(),
					initialWidth = $(this).width(),
					initialTop = $(this).position().top,
					initialLeft = $(this).position().left;
			}
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

		$(this).css({ height: initialHeight, width: initialWidth, top: 0, left: 50 });
	}

	// Window controls

	$(".window__controls").each(function() {
		var parentWindow = $(this).closest(".window");
		var appName = $(parentWindow).data("window");

		$(this)
			.find("a")
			.click(function(e) {
				e.preventDefault();
			});

		$(this)
			.find(".window__close")
			.click(function(e) {
				$(parentWindow)
					.addClass("window--closed")
					.css({ "pointer-events": "none", opacity: 0 });
				//.addClass("window--closing")

				setTimeout(function() {
					//$(parentWindow).removeClass("window--closing");
					$(parentWindow).removeClass("window--active");
					if (parentWindow.hasClass("tmp")) {
						parentWindow.remove();
					}
				}, 1000);

				setTimeout(function() {
					$('.taskbarApp[data-window="' + appName + '"]').removeClass("open");
					$('.taskbar__item[data-window="' + appName + '"]').removeClass(
						"taskbar__item--open taskbar__item--active"
					);
				}, 1);
			});

		$(this)
			.find(".window__maximize")
			.click(function(e) {
				$(parentWindow).toggleClass("window--maximized");

				if (!$(parentWindow).hasClass("window--maximized")) {
					$(parentWindow).css({
						height: initialHeight,
						width: initialWidth,
						top: initialTop,
						left: initialLeft
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
						left: 0
					});
				}
			});
	});
});
