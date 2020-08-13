import qrcode from "qrcode";
import u from "../index";

let w = {};

w.windowOk = () => typeof window != "undefined";

w._config = (name) => {
  switch (name) {
    case "jquery":
      return "https://ajax.aspnetcdn.com/ajax/jQuery/jquery-3.3.1.min.js";
    case "script":
      return {
        bootstrapCSS: "https://maxcdn.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css",
        bootstrap: "https://ajax.aspnetcdn.com/ajax/bootstrap/4.1.1/bootstrap.min.js",
        chart: "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.2/Chart.min.js",
      };
    case "icon":
      return {
        fontAwesome: "https://use.fontawesome.com/releases/v5.3.1/css/all.css",
        // https://fontawesome.com/icons?d=gallery&m=free
        ioniconsCSS: "https://unpkg.com/ionicons@4.4.2/dist/css/ionicons.min.css",
        // https://ionicons.com/
        Material:
          "https://cdnjs.cloudflare.com/ajax/libs/material-design-iconic-font/2.2.0/css/material-design-iconic-font.min.css",
        // http://zavoloklom.github.io/material-design-iconic-font/icons.html
      };
    default:
      return w._config("jquery");
  }
};

w._addHeadElement = (location, attriMap = {}) => {
  if (location.endsWith(".css"))
    return [
      "<link/>",
      u.mapMerge(
        {
          rel: "stylesheet",
          type: "text/css",
          href: location,
        },
        attriMap,
        1
      ),
    ];
  if (location.endsWith(".js"))
    return [
      "<script/>",
      u.mapMerge(
        {
          type: "text/javascript",
          src: location,
        },
        attriMap,
        1
      ),
    ];
};

w.addCSSExternal = (path, integrity, crossorigin) => {
  let imported = document.createElement("link");
  imported.href = path;
  imported.rel = "stylesheet";
  imported.type = "text/css";
  if (integrity !== undefined) imported.integrity = integrity;
  if (crossorigin !== undefined) imported.crossorigin = crossorigin;
  document.head.appendChild(imported);
};

w.addScriptExternal = (path, integrity, crossorigin) => {
  let imported = document.createElement("script");
  imported.src = path;
  imported.type = "text/javascript";
  if (integrity !== undefined) imported.integrity = integrity;
  if (crossorigin !== undefined) imported.crossorigin = crossorigin;
  document.head.appendChild(imported);
};

w.storageSetLocal = (pairs = {}) => {
  for (let [i, j] of u.mapEntries(pairs)) localStorage.setItem(i, u.jsonToString(j));
};

w.storageSetSession = (pairs = {}) => {
  for (let [i, j] of u.mapEntries(pairs)) sessionStorage.setItem(i, u.jsonToString(j));
};

w.storageGetLocal = (...keys) => {
  let result = {};
  for (let i of keys) {
    result[i] = u.stringToJson(localStorage.getItem(i));
  }
  return result;
};

w.storageGetSession = (...keys) => {
  let result = {};
  for (let i of keys) {
    result[i] = u.stringToJson(sessionStorage.getItem(i));
  }
  return result;
};

w.storageDeleteLocal = (...keys) => {
  for (let i of keys) localStorage.removeItem(i);
};

w.storageDeleteSession = (...keys) => {
  for (let i of keys) sessionStorage.removeItem(i);
};

w.storeClear = (local) => {
  if (local === undefined) {
    localStorage.clear();
    sessionStorage.clear();
  } else {
    local ? localStorage.clear() : sessionStorage.clear();
  }
};

w.storeDisplayItems = () => {
  return { local: localStorage, session: sessionStorage };
};

w.urlGetParam = (decode = true) => {
  let result = {};
  window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, (line, key, value) => {
    result[key] = decode ? u.decodeURL(value) : value;
  });
  return result;
};

w.urlGoto = (loc, newtab = false, history = true) => {
  newtab ? window.open(loc) : history ? window.location.assign(loc) : window.location.replace(loc);
};

w.urlBack = () => window.history.back();

w.urlForward = () => window.history.forward();

w.urlCurrent = (url = window.location["href"]) => {
  return u.url(url);
};

w.urlToHttps = () => {
  if (window.location.protocol !== "https:")
    window.location.href = "https:" + window.location.href.substring(window.location.protocol.length);
};

w.webReadyState = () => document.readyState === "complete";

w.webReload = () => window.location.reload();

w.webInfo = () => window.Navigator;

w.alert = (line) => window.alert(line);

w.alertBoolean = (line) => window.confirm(line);

w.alertForm = (line, defaultValue) => {
  return window.prompt(line, defaultValue);
};

w.screenSize = () => {
  return [window.screen.availWidth, window.screen.availHeight, window.screen.width, window.screen.height];
};

w.qrcode = (text, canvasid) => {
  return qrcode.toCanvas(window.document.getElementById(canvasid), text, { errorCorrectionLevel: "H" });
};

export default { ...u, ...w };
