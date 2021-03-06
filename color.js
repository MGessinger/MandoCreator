'use strict';

var settings;
function resetSettings () {
	settings = {
		undefined: "#FFFFFF",
		"Bucket_BudgetBucketColor":	"#F74416",
		"Visor_BudgetBucketColor":	"#000000",
		"Rage_Gauntlet_RightColor":	"#08CB33",
		"Rage_Gauntlet_LeftColor":	"#08CB33"
	};
}
resetSettings();

var showPicker = true;
var Picker = new function() {
	var latestChange = {};
	var changes = [];
	var redos = [];

	function on(elem, event, func) {
		elem.addEventListener(event, func);
	}

	function _init(o, done) {
		function clamp(n, min, max) {
			if (n > max)
				return max;
			else if (n < min)
				return min;
			return n;
		}

		function touch(event) {
			if (event.touches && 1 === event.touches.length)
				event = event.touches[0];
			else if (1 !== event.buttons)
				return;
			var dimensions = o.getBoundingClientRect();
			var width = dimensions.width;
			var height = dimensions.height;
			var s = clamp(event.clientX - dimensions.left, 0, width);
			var l = clamp(event.clientY - dimensions.top, 0, height);
			done(s / width, l / height);
		}

		on(o, "mousedown", touch);
		on(o, "touchstart", touch);
		on(o, "mousemove", touch);
		on(o, "touchmove", touch);
	}

	function Color () {
		function hexToHsv(hex) {
			var shorthandRegex = /^#([a-f\d])([a-f\d])([a-f\d])$/i;
			_hex = hex = hex.replace(shorthandRegex, "#$1$1$2$2$3$3");
			var result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
			if (!result)
				return undefined;
			var y = result.slice(1).map(function(r) {return parseInt(r,16)/255;});
			var r = y[0], g = y[1], b = y[2];
			var max = Math.max(r, g, b), min = Math.min(r, g, b);
			var h, d = max - min;

			switch(max) {
				case min:
					h = 0; break;
				case r:
					h = (g - b) / d; break;
				case g:
					h = (b - r) / d + 2; break;
				case b:
					h = (r - g) / d + 4; break;
			}
			var s = max === 0 ? 0 : d/max;
			h /= 6;
			if (h < 0)
				h++;
			return [h, s, max];
		}

		var ctx = find("canvas").getContext("2d");
		function nameToHex (e) {
			ctx.fillStyle = e;
			var f = ctx.fillStyle;
			if (f === "#000000" && e != "black")
				f = undefined;
			return f;
		}

		function hsvToHex(f) {
			var h = f[0]*6, s = f[1], v = f[2];
			var f = h - Math.floor(h);

			var	p = v*(1-s),
				q = v*(1-s*f),
				t = v*(1-s*(1-f));
			var rgb;
			switch(Math.floor(h)) {
				case 1:
					rgb = [q,v,p]; break;
				case 2:
					rgb = [p,v,t]; break;
				case 3:
					rgb = [p,q,v]; break;
				case 4:
					rgb = [t,p,v]; break;
				case 5:
					rgb = [v,p,q]; break;
				default:
					rgb = [v,t,p]; break;
			}
			return "#" + rgb.map(function(x) {
				var e = Math.round(x*255);
				var p = e.toString(16);
				if (e < 16)
					return "0" + p;
				return p;
			}).join("");
		}

		var _hsv, _hex;
		return {
			get hsv () {
				return _hsv;
			},
			set hsv (value) {
				if (value == undefined)
					return;
				_hsv = value;
				_hex = hsvToHex(value).toUpperCase();
			},
			get hex () {
				return _hex;
			},
			set hex (value) {
				if (value == undefined)
					return;
				if (!/^#([\da-f]{3}){1,2}$/.test(value))
					return;
				_hex = value.toUpperCase();
				_hsv = hexToHsv(_hex);
			},
			update: function(value) {
				if (Array.isArray(value))
					return this.hsv = value;
				var string = value.toLowerCase();
				var validHex = /^[a-f\d]{3}|[a-f\d]{6}$/i;
				if (string[0] == '#') {
					this.hex = string;
				} else if (validHex.test(string)) {
					this.hex = '#' + string;
				} else if (string.startsWith("rgb")) {
					var p = string.match(/\d{1,3}/g);
					if (!p || p.length < 3)
						return;
					this.hex = "#" + p.slice(0,3).map(function(e, l) {
						var n = parseInt(e);
						var p = n.toString(16);
						if (n < 16)
							return "0" + p;
						return p;
					}).join("");
				} else {
					this.hex = nameToHex(string);
				}
			}
		}
	}

	function DOMNode (type, props, parent) {
		var n = document.createElement(type);
		for (var p in props)
			n.setAttribute(p, props[p]);
		if (parent)
			parent.appendChild(n);
		return n;
	}

	function PickerDOM() {
		var wrapper = find("picker");
		on(wrapper, "click", function(event){event.stopPropagation();});
		var ch = wrapper.children;
		var colors = ["#F00", "#0085FF", "#FFD600", "#08CB33", "#8B572A", "#A3A3A3", "#000", "#fff"]
		var timer;
		for (var i = 0; i < colors.length; i++) {
			var pal = DOMNode("button", {
					class: "palette_icon",
					style: "background:" + colors[i],
					title: "Right-click to save the current color"
				}, ch[1]);
			on(pal, "click", function() { _setColor(this.style.background); });
			on(pal, "contextmenu", function(event) { event.preventDefault(); this.style.background = color.hex; });
			on(pal, "touchstart", function() {
				var that = this;
				timer = setTimeout(function() {
					that.style.background = color.hex;
					timer = 0;
				}, 500);
			});
			on(pal, "touchend", function() {
				if (timer) {
					clearTimeout(timer);
					_setColor(this.style.background);
					timer = 0;
				}
			});
		}

		var ch1 = ch[2].children;
		var hue = ch1[0], spectrum = ch1[1];
		var hueSelector = hue.firstElementChild;
		var colorSelector = spectrum.firstElementChild;

		var bottom = ch[3].children;
		var editor = bottom[0];
		on(editor, "input", function() { _setColor(this.value, true); });
		var Okay = bottom[1];
		on(Okay, "click", function() { DOM.parent = null; });

		_init(hue, function(hue) { var c = color.hsv; c[0] = hue; return _setColor(c); });
		_init(spectrum, function(s, v) { var c = color.hsv; c[1] = s; c[2] = 1-v; return _setColor(c)});

		on(window, "mousedown", function (event) {
			if (!(wrapper.contains(event.target)))
				DOM.parent = null;
		});
		on(window, "focusin", function (event) {
			var f = event.target;
			if (f == wrapper || wrapper.contains(f))
				return;
			DOM.parent = null;
		});

		function move(key, t, f) {
			t.style[key] = 100 * f + "%";
		}
		return {
			update: function (fromEditor) {
				var hsvColor = color.hsv;
				var colorName = "hsl(" + 360 * hsvColor[0] + ", 100%, 50%)";
				move("left",hueSelector, hsvColor[0]);
				move("left",colorSelector, hsvColor[1]);
				move("top",colorSelector, 1 - hsvColor[2]);
				spectrum.style.backgroundColor = hueSelector.style.background = colorName;
				colorSelector.style.background = color.hex;
				if (!fromEditor) {
					editor.value = color.hex;
				}
			},
			set parent (p) {
				if (!p) {
					onChange = null;
					wrapper.style = "visibility:hidden";
					if ( (latestChange.button != undefined) &&
					     (latestChange.newColor !== latestChange.oldColor) ) {
						redos = [];
						changes.push(latestChange);
					}
					latestChange = {};
				} else {
					if (wrapper.style.visibility != "hidden")
						return;
					wrapper.style.visibility = "";
					p.appendChild(wrapper);
					var rect = wrapper.getBoundingClientRect();
					if (rect.bottom > window.innerHeight)
						wrapper.style.bottom = "0px";
					if (rect.left < 0)
						wrapper.style.left = -rect.right + "px";
				}
			},
		}
	}

	function _setColor(value, fromEditor) {
		if (typeof value === "string")
			value = value.trim();
		if (!value)
			return;
		color.update(value);
		DOM.update(fromEditor);
		latestChange["newColor"] = color.hex;
		if (onChange)
			onChange(color.hex);
	}

	function getDefaultColor (SVGNode, id) {
		if (SVGNode.style.fill)
			return SVGNode.style.fill;
		else if (id in settings)
			return settings[id];
		return "#FFF";
	}

	var color = new Color();
	var DOM = new PickerDOM();
	var onChange = null;
	this.attach = function (button, colorText, SVGNode) {
		function input (hex) {
			button.style.background = hex;
			SVGNode.style.fill = hex;
			colorText.innerText = hex;
			settings[button.id] = hex;
		}
		on(button, "click", function(event) {
			onChange = input;
			_setColor(this.style.backgroundColor);
			if (!showPicker)
				return;
			DOM.parent = this;

			var oldColor = SVGNode.style.fill;
			if (!oldColor)
				return;
			latestChange = {"button": button.id, "oldColor": oldColor, "newColor": oldColor};
		});
		var def = getDefaultColor(SVGNode, button.id);
		_setColor(def);
		input(color.hex);
	}

	this.undo = function (n) {
		if (!n)
			return;
		var from, to, key;
		if (n > 0) {
			from = changes;
			to = redos;
			key = 'oldColor';
		} else {
			from = redos;
			to = changes;
			key = 'newColor';
			n = -n;
		}
		showPicker = false;
		var change, button;
		for (var i = 0; i < n; i++) {
			do {
				change = from.pop();
				if (!change) {
					showPicker = true;
					return;
				}
				button = find(change["button"]);
			} while (!button);
			button.style.background = change[key];
			button.click();
			to.push(change);
		}
		showPicker = true;
	}
}()
