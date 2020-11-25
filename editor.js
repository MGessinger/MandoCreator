/* MandoCreator */
"use strict";
var variants = {};

function find (st) {
	return document.getElementById(st);
}

function loadSVG (name, onload, args) {
	var vault = find("vault");
	var local = vault.querySelector("#" + name);
	if (local) {
		var copy = local.cloneNode(true);
		return onload(copy, args);
	}
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "images/" + name + ".svg");
	xhr.setRequestHeader("Cache-Control", "max-age=10800, public");
	xhr.onload = function () {
		if (this.status !== 200)
			return;
		var svg = this.responseXML.documentElement;
		svg.setAttribute("id", name);

		/* Assign classes based on ID components */
		var options = svg.querySelectorAll("[id*=Option]");
		for (var i = 0; i < options.length; i++)
			options[i].setAttribute("class", "option");

		var options = svg.querySelectorAll("[id*=Toggle]");
		for (var i = 0; i < options.length; i++) {
			options[i].setAttribute("class", "toggle");
			if (options[i].id.includes("Off"))
				options[i].style.display = "none";
		}

		/* Store it in the Vault for later use */
		vault.appendChild(svg);
		var copy = svg.cloneNode(true);
		onload(copy, args);
	};
	xhr.send();
}

function listName (str) {
	var clean = str.replace(/\W/g,"");
	var components = clean.split("_");
	return components[0];
}

function buttonName (str) {
	var clean = str.replace(/\W/g,"");
	return neutralize(clean);
}

function prettify (str) {
	var components = str.split("_");
	var shortName = components[0];
	return shortName.replace(/-/g, " ");
}

function neutralize (str) {
	return str.replace(/(_(M|F|Toggle(Off)?|Option))+($|_)/,"$4");
}

function isEmptyLayer (SVGNode) {
	return SVGNode.tagName === "g" && SVGNode.children.length === 0;
}

function DOMNode (type, props, parent) {
	var n = document.createElement(type);
	for (var p in props)
		n.setAttribute(p, props[p]);
	if (parent)
		parent.appendChild(n);
	return n;
}

function redirectClickTo(target) {
	return function () {
		target.click();
	}
}

function ColorPicker (affectedObject, parent) {
	var wrapper = DOMNode("div", {class: "color_wrapper"}, parent);

	var buttonID = buttonName(affectedObject.id) + "Color";
	var b = DOMNode("button", {class: "color_picker", id: buttonID}, wrapper);

	var label = DOMNode("label", {class: "color_label hidden", for: buttonID}, wrapper);
	var p = DOMNode("p", {class: "name"}, label);
	p.innerText = prettify(affectedObject.id);
	var c = DOMNode("p", {class: "color"}, label);

	Picker.attach(b, c, affectedObject);
	return b;
}

function toggleSlide (slide) {
	slide.classList.toggle("selected");
	var folder = slide.parentNode.parentNode;
	folder.classList.toggle("overview");
}

function toggleSubslide (subslide, SVGNode) {
	var varName = neutralize(SVGNode.id);
	return function () {
		if (this.checked) {
			subslide.style.display = "";
			SVGNode.style.display = "";
		} else {
			subslide.style.display = "none";
			SVGNode.style.display = "none";
		}
		variants[varName] = this.checked || false;
	}
}

function prepareParent (SVGNode, parent) {
	var name = listName(SVGNode.id);
	var globalList = find(name + "Colors");
	if (globalList) {
		parent = globalList;
		parent.innerHTML = "";
		parent.style.display = "";
		var p = DOMNode("p", {class: "option_name hidden"}, globalList);
		p.innerText = prettify(SVGNode.id) + " Options:";
	}
	if (SVGNode.getAttribute("class") === "toggle") {
		if (!parent)
			return;
		if (parent.children.length > 1) // 1 for option-name built before
			DOMNode("p", {class: "separator"}, parent);

		var p = DOMNode("label", {class: "pseudo_checkbox hidden"}, parent);
		var labelText = DOMNode("span", {class: "pseudo_label"}, p);
		labelText.innerText = prettify(SVGNode.id);
		var check = DOMNode("input", {type: "checkbox"}, p);
		DOMNode("span", {class: "slider"}, p);
		parent = DOMNode("div", {style: "display:none", class: "subslide"}, parent);

		var defaultOn = (SVGNode.style.display !== "none");
		var varName = neutralize(SVGNode.id);
		if (varName in variants)
			defaultOn = variants[varName];
		var toggle = toggleSubslide(parent, SVGNode);
		check.checked = defaultOn;
		toggle.bind({checked: defaultOn})();
		check.addEventListener("change", toggle);
	}
	return parent;
}

function buildIOSettings (SVGNode, category, parent) {
	if (!SVGNode.id)
		return;
	var p = ColorPicker(SVGNode, parent);
	var redirectToPicker = redirectClickTo(p);

	var radio = find(category + "Settings");
	var redirectToRadio = redirectClickTo(radio);
	if (radio.checked)
		redirectToRadio();

	var folder = find(category + "Options");
	var folder_content = folder.getElementsByClassName("folder_content")[0];
	var slides = folder.getElementsByClassName("slide");
	SVGNode.addEventListener("click", function() {
		redirectToRadio();
		for (var i = 0; i < slides.length; i++) {
			if (slides[i].contains(p)) {
				var but = slides[i].firstElementChild;
				redirectClickTo(but)();
			}
		}
		redirectToPicker();
	});
}

function buildAddonSelect (options, category, parent, SVGName) {
	var wrapper = DOMNode("div", {class: "select_wrapper hidden"}, parent);
	var select = DOMNode("select", {class: "component_select"}, wrapper);
	var colors = [];
	var last = options.length-1;
	var useDefault = true;
	for (var i = last; i >= 0; i--) {
		var fullName = options[i].id;
		var name = prettify(fullName);
		options[i].setAttribute("class", "option");

		/* Create an option in the select, and a hidable color list */
		var opt = DOMNode("option", {class: "component_option", label: name, value: fullName}, select);
		opt.innerText = name;

		var san = listName(fullName);
		var col = DOMNode("div", {id: san + "SubColors"}, parent);
		colors.push(col);
		if (variants[SVGName] == neutralize(fullName)) {
			options[i].style.visibility = "visible";
			useDefault = false;
			select.value = fullName;
		} else if (options[i].style.visibility == "visible") {
			useDefault = false;
			select.value = fullName;
			variants[SVGName] = neutralize(fullName);
		} else {
			options[i].style.visibility = "";
			col.style.display = "none";
		}
		buildAllSettings(options[i], category, col);
	}
	if (useDefault) {
		options[last].style.visibility = "visible";
		colors[0].style.display = "";
	}

	select.addEventListener("change", function() {
		variants[SVGName] = neutralize(this.value);
		for (var i = 0; i < options.length; i++) {
			if (options[i].id === this.value)
				options[i].style.visibility = "visible";
			else
				options[i].style.visibility = "";
		}

		var id = listName(this.value) + "SubColors"
		for (var i = 0; i < colors.length; i++) {
			if (colors[i].id === id)
				colors[i].style.display = "";
			else
				colors[i].style.display = "none";
		}
	});
	return select;
}

function buildAllSettings (SVGNode, category, parent) {
	parent = prepareParent(SVGNode, parent);
	var ch = SVGNode.children;
	var hasUnnamedChild = !ch.length;
	for (var i = 0; i < ch.length; i++)
		hasUnnamedChild |= !ch[i].id;
	if (hasUnnamedChild) {
		if (isEmptyLayer(SVGNode))
			return;
		return buildIOSettings(SVGNode, category, parent);
	}
	var options = [];
	var toggle = [];
	for (var i = ch.length-1; i >= 0; i--) {
		var className = ch[i].getAttribute("class");
		if (className == "option")
			options.unshift(ch[i]);
		else if (className == "toggle")
			toggle.unshift(ch[i]);
		else
			buildAllSettings(ch[i], category, parent);
	}
	var SVGName = neutralize(SVGNode.id) + "_Option";
	if (options.length > 0)
		buildAddonSelect(options, category, parent, SVGName);
	/* defer toggles to the very last */
	for (var i = 0; i < toggle.length; i++) 
		buildAllSettings(toggle[i], category, parent, SVGName);
}

function buildVariableSettings (category, pieceName, variantName) {
	var fullyQualifiedName = pieceName + "_" + variantName;
	var identifier = listName(pieceName);
	var wrapper = find(identifier + "_Current");
	var ref = find(fullyQualifiedName);
	var n = ref.cloneNode(true);
	wrapper.appendChild(n);

	var parent = prepareParent(n);
	var SVGName = neutralize(fullyQualifiedName) + "_Option";
	buildAddonSelect(n.children, category, parent, SVGName);
}

function onload () {
	var female = false;
	if (localStorage)
		female = (localStorage.getItem("female_sex") == "true");
	setSex(female);
	find("female").checked = female;
	var useDarkMode = localStorage.getItem("dark_mode");
	if (useDarkMode !== null)
		useDarkMode = (useDarkMode == "true");
	else
		useDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
		
	setColorScheme(useDarkMode);
	find("color_scheme_picker").checked = useDarkMode;

	if (window.innerWidth < 786) {
		var settings = find("settings");
		settings.classList.add("settings_collapsed");
	}

	window.addEventListener("beforeunload", function (event) {
		var message = "You should save your work. Do or do not, there is not try!";
		event.preventDefault();
		event.returnValue = message;
		return message;
	});
}

function openArmorFolder (category) {
	var now = find(category + "Options");
	var components = document.getElementsByClassName("folder");
	for (var i = 0; i < components.length; i++)
		components[i].classList.remove("selected");
	now.classList.add("selected");
	var slides = now.getElementsByClassName("slide");
	for (var i = 0; i < slides.length; i++)
		slides[i].classList.remove("selected");
	if (slides.length)
		now.classList.add("overview");
}

function switchToArmorVariant (category, pieceName, variantName, button) {
	var parent = find(category + "Options");
	var old_button = parent.getElementsByClassName("current_variant")[0];
	if (old_button)
		old_button.classList.remove("current_variant");

	variants[category] = neutralize(variantName);

	if (!button)
		button = find(category + "_Variant_" + variantName);
	if (button)
		button.classList.add("current_variant");

	var logos = parent.getElementsByClassName("sponsor_link");
	for (var i = 0; i < logos.length; i++)
		logos[i].style.display = "none";

	var old = find(pieceName + "_Current");
	var SVGparent = old.parentNode;
	var n = find(pieceName + "_" + variantName);
	n = n.cloneNode(true);
	n.id = pieceName + "_Current";
	n.setAttribute("class", variantName);
	SVGparent.replaceChild(n, old);

	var old_lists = parent.getElementsByClassName("replace");
	for (var i = 0; i < old_lists.length; i++) {
		old_lists[i].style.display = "none";
		old_lists[i].innerHTML = "";
	}

	buildAllSettings(n, category);
}

function setSponsor (sponsor, link) {
	var logo = find(sponsor);
	logo.style.display = "";
	logo.setAttribute("href", link);
}

function toggleOptions () {
	find("settings").classList.toggle("settings_collapsed");
}

function prepareForExport (svg) {
	svg.style.transform = "";
	var options = svg.getElementsByClassName("option");
	var i = 0;
	while (i < options.length) {
		if (options[i].style.visibility == "visible") {
			i++;
			continue;
		}
		var parent = options[i].parentNode;
		parent.removeChild(options[i]);
	}
	var toggles = svg.getElementsByClassName("toggle");
	i = 0;
	while (i < toggles.length) {
		if (toggles[i].style.display !== "none") {
			i++;
			continue;
		}
		var parent = toggles[i].parentNode;
		parent.removeChild(toggles[i]);
	}
	return svg;
}

function encodeSVG (svg) {
	var san = svg.replace(/\s+/g," ").replace(/"/g,"'");
	return encodeURIComponent(san);
}

function setDownloader (bck) {
	var main = find("editor");
	var xml = new XMLSerializer();
	return function() {
		var background = bck.cloneNode(true);
		var svg = main.getElementsByTagName("svg")[0];
		var copy = svg.cloneNode(true);
		prepareForExport(copy);
		background.appendChild(copy);
		var str = xml.serializeToString(background);
		var data = "<?xml version='1.0' encoding='UTF-8'?>" + str;
		this.setAttribute("href",'data:image/svg+xml;charset=UTF-8,' + encodeSVG(data));
		var self = this;
		setTimeout(function() {self.setAttribute("href", "#");});
	};
}

function setupMando (svg, sexSuffix) {
	var main = find("editor");
	var old_svg = main.firstElementChild;
	if (old_svg)
		main.replaceChild(svg, old_svg);
	else
		main.appendChild(svg);
	var scale = find("zoom");
	zoom(scale.value/100);

	function findLocal(st) {
		return svg.getElementById(st);
	}
	var variant = variants["Helmet"] || "Classic";
	loadSVG("Helmets", function() { switchToArmorVariant("Helmet", "Helmet", variant); });

	loadSVG("Upper-Armor_" + sexSuffix, function(svg) {
		var variant = variants["Chest"] || "Classic";
		switchToArmorVariant("UpperArmor", "Chest", variant + "_" + sexSuffix)
		var subgroups = ["Shoulder","Biceps","Gauntlets"];
		for (var i = 0; i < subgroups.length; i++) {
			buildVariableSettings("UpperArmor", "Left-" + subgroups[i], sexSuffix);
			buildVariableSettings("UpperArmor", "Right-" + subgroups[i], sexSuffix);
		}
	});

	loadSVG("Lower-Armor_" + sexSuffix, function(svg) {
		switchToArmorVariant("LowerArmor", "Waist", sexSuffix);
		buildVariableSettings("LowerArmor", "Groin", sexSuffix);
		var subgroups = ["Thigh", "Knee", "Shin", "Ankle"];
		for (var i = 0; i < subgroups.length; i++) {
			buildVariableSettings("LowerArmor", "Left-" + subgroups[i], sexSuffix);
			buildVariableSettings("LowerArmor", "Right-" + subgroups[i], sexSuffix);
		}
	});
	buildAllSettings(findLocal("Back"), "Back");
	buildAllSettings(findLocal("Soft-Parts_" + sexSuffix), "FlightSuit");
}

function recreateMando (svg) {
	var main = find("editor");
	var old_svg = main.firstElementChild;
	main.replaceChild(svg, old_svg);
	var scale = find("zoom");
	zoom(scale.value/100);

	function findLocal(st) {
		return svg.getElementById(st);
	}
	var helmet = findLocal("Helmet_Current");
	buildAllSettings(helmet, "Helmet");
	variants["Helmet"] = helmet.getAttribute("class");

	/* Upper Body */
	var chest = findLocal("Chest_Current");
	buildAllSettings(chest, "UpperArmor");
	variants["Chest"] = chest.getAttribute("Chest");
	var subgroups = ["Shoulders","Biceps","Gauntlets"];
	for (var i = 0; i < subgroups.length; i++) {
		var cur = findLocal(subgroups[i] + "_Current");
		buildAllSettings(cur,"UpperArmor");
	}

	/* Lower Body */
	buildAllSettings(findLocal("Groin_Current"), "LowerArmor");
	buildAllSettings(findLocal("Waist_Current"), "LowerArmor");
	subgroups = ["Thighs", "Knees", "Shins", "Ankles"];
	for (var i = 0; i < subgroups.length; i++) {
		var cur = findLocal(subgroups[i] + "_Current");
		buildAllSettings(cur,"LowerArmor");
	}
	buildAllSettings(findLocal("Back"), "Back");
	var soft = findLocal("Soft-Parts_M") || findLocal("Soft-Parts_F");
	buildAllSettings(soft, "FlightSuit");
}

function setColorScheme (useDark) {
	var className = "light_mode";
	var bckName = "BackgroundLight";
	var logoName = "#titleLight";
	if (useDark) {
		className = "dark_mode";
		bckName = "BackgroundDark";
		logoName = "#titleDark";
	}
	document.body.className = className;
	var a = find("download");
	var main = find("editor");
	loadSVG(bckName, function(svg) {
		a.onclick = setDownloader(svg);
		var img = svg.getElementsByTagName("image")[0];
		var href = img.getAttribute("href");
		main.style.backgroundImage = "url(" + href + ")";
	});
	var use = find("title");
	use.setAttribute("href", logoName);
	var reset = find("reset_wrapper");
	reset.style.display = "none";
	localStorage.setItem("dark_mode", useDark.toString());
}

function setSex (female) {
	var body, sexSuffix;
	var settings = find("settings");
	if (female) {
		body = "Female-Body";
		sexSuffix = "F";
		settings.classList.remove("male");
		settings.classList.add("female");
	} else {
		body = "Male-Body";
		sexSuffix = "M";
		settings.classList.remove("female");
		settings.classList.add("male");
	}
	loadSVG(body, setupMando, sexSuffix);
	localStorage.setItem("female_sex", female.toString());
}

function loadImage (input) {
	var files = input.files;
	if (files.length == 0)
		return;
	var main = find("editor");
	var theme = document.body.className;

	var customBck;
	if (theme.includes("dark"))
		customBck = find("BackgroundDark").cloneNode(true);
	else
		customBck = find("BackgroundLight").cloneNode(true);
	customBck.id = "Custom";
	var img = customBck.getElementsByTagName("image")[0];

	var reader = new FileReader();
	if (files[0].type.includes("svg")) {
		reader.onload = function () {
			var svg = DOMNode("svg");
			svg.innerHTML = this.result;
			var newSVG = svg.firstElementChild;
			customBck.replaceChild(newSVG, img);
			find("download").onclick = setDownloader(customBck);

			var href = 'url("data:image/svg+xml,' + encodeSVG(this.result) + '")';
			main.style.backgroundImage = href
		}
		reader.readAsText(files[0]);
	}
	else {
		reader.onload = function() {
			var res = this.result;
			main.style.backgroundImage = "url(" + res + ")";
			img.setAttribute("href", res);
			find("download").onclick = setDownloader(customBck);
		}
		reader.readAsDataURL(files[0]);
	}

	var reset = find("reset_wrapper");
	reset.style.display = "";
}

function reupload (input) {
	var files = input.files;
	if (!files || !files.length)
		return;
	var main = find("editor");
	var download = find("download");

	var reader = new FileReader();
	reader.onload = function () {
		var svg = DOMNode("svg");
		svg.innerHTML = this.result;
		svg = svg.firstElementChild;
		var mando = svg.getElementsByTagName("svg")[0];
		var img = svg.getElementsByTagName("image")[0];
		if (!mando || !img)
			return;
		variants = {};
		settings = {};

		var female = false;
		if (mando.id === "Male-Body") {
			var sex_radio = find("male");
			sex_radio.checked = true;
			localStorage.setItem("female_sex", false);
		} else {
			female = true;
			var sex_radio = find("female");
			sex_radio.checked = true;
			localStorage.setItem("female_sex", true);
		}

		var theme = find("color_scheme_picker");
		var light_mode = !svg.getElementById("titleLight");
		theme.checked = light_mode;
		setColorScheme(light_mode);

		main.style.backgroundImage = "url(" + img.getAttribute("href") + ")";
		recreateMando(mando, img);
		setSex(female);
		download.onclick = setDownloader(svg);
	};
	reader.readAsText(files[0]);
}

function displayForm (show, form) {
	form = form || find("contact");
	form.style.display = show ? "" : "none";
}

function zoom (scale) {
	var main = find("editor");
	var svg = main.children[0];
	svg.style.transform = "";
	var rect = svg.getBoundingClientRect()
	var t = (rect.height*scale - window.innerHeight)/2 + rect.top;
	svg.style.transform = "translateY(" + t + "px) scale(" + scale + ")";
}
