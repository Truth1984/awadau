const serialize = require("serialize-javascript"),
  floatFormat = require("float-format"),
  jStringify = require("json-stringify-safe");

var u = {};

u._global = {};
u.ex = {};

/**
 * @param {"TRACE"|"DEBUG"|"INFO"|"WARN"|"ERROR"|"FATAL"} severityThen
 * @param {"TRACE"|"DEBUG"|"INFO"|"WARN"|"ERROR"|"FATAL"} severityCatch
 */
u.log = (message, extra = {}, _section, severityThen = "INFO", severityCatch = "ERROR") => {
  const plain = { date: new Date().toLocaleString("en-US", { hour12: false }) };
  const segment = { ...(_section && { _section }), ...extra };
  const isPromise = message instanceof Promise;

  const buildLog = (msg, severity, error = false) => {
    const log = { ...plain, message: msg, severity, ...segment };
    if (isPromise) log._promise = true;
    if (error) log.error = true;
    console.log(u.jsonToString(log, ""));
    return msg;
  };

  if (!isPromise) {
    buildLog(message, severityThen);
    return Promise.resolve(message);
  }

  return message
    .then((data) => buildLog(data, severityThen))
    .catch((e) => {
      const errorMsg = e instanceof Error ? { message: e.message, stack: e.stack } : e;
      return buildLog(errorMsg, severityCatch, true);
    });
};

u.contains = (origin, item) => {
  if (origin === undefined || item === undefined) return false;

  const getType = (obj) => {
    if (u.typeCheck(obj, "map")) return "map";
    if (u.typeCheck(obj, "array")) return "array";
    return typeof obj;
  };

  const originType = getType(origin);
  const itemType = getType(item);

  // Array checks
  if (originType === "array") {
    if (itemType === "array") {
      return item.every((i) => u.contains(origin, i));
    }
    if (itemType === "map") {
      return origin.some((i) => u.equal(i, item));
    }
    return origin.some((i) => u.equal(i, item));
  }

  // Map checks
  if (originType === "map") {
    if (itemType === "map") {
      return Object.keys(item).every((key) => u.contains(origin[key], item[key]));
    }
    if (itemType === "array") {
      return item.every(
        (val) => Object.keys(origin).some((k) => u.equal(k, val)) || Object.values(origin).some((v) => u.equal(v, val))
      );
    }
    return Object.keys(origin).some((k) => u.equal(k, item)) || Object.values(origin).some((v) => u.equal(v, item));
  }

  // Primitive checks
  if (itemType === "array" || itemType === "map") {
    const itemValues = Object.values(item);
    return itemValues.every((val) => origin.toString().includes(val.toString()));
  }

  return origin.toString().includes(item.toString());
};

u.equal = (item1, item2) => {
  if (item1 === item2) return true;

  if (u.typeCheck(item1, "arr") && u.typeCheck(item2, "arr")) {
    if (item1.length !== item2.length) return false;
    return item1.every((ele, index) => u.equal(ele, item2[index]));
  }

  if (u.typeCheck(item1, "string") && u.typeCheck(item2, "string")) return item1 === item2;

  if (u.typeCheck(item1, "regex") && u.typeCheck(item2, "regex"))
    return item1.source === item2.source && item1.flags === item2.flags;

  if (u.typeCheck(item1, "promise") && u.typeCheck(item2, "promise"))
    return Promise.all([item1, item2]).then(([v1, v2]) => u.equal(v1, v2));

  if (u.typeCheck(item1, "object") && u.typeCheck(item2, "object")) {
    const keys1 = Object.keys(item1);
    const keys2 = Object.keys(item2);
    if (keys1.length !== keys2.length) return false;
    return keys1.every((key) => key in item2 && u.equal(item1[key], item2[key]));
  }

  return JSON.stringify(item1) === JSON.stringify(item2);
};

/**
 * @param {"null" | "undefined" | "udf" | "nan" | "str" | "string" | "num" | "number" | "bool" | "boolean" | "arr" | "array" | "obj" | "object" | "map" | "dict" | "func" | "function" | "syncfunc" | "async" | "asyncfunc" | "promise" | "date" | "regex" | "regexp" | "error" | "err" | "class" | "symbol"} type
 */
u.typeCheck = (obj, type) => {
  if (type === undefined) return typeof obj;
  if (Number.isNaN(type)) type = "nan";
  if (typeof type === "string") type = type.toLowerCase();

  const isAsync = (fn) => {
    try {
      return fn instanceof Function && fn.constructor.name === "AsyncFunction";
    } catch {
      return false;
    }
  };

  const isClass = (fn) => {
    try {
      return typeof fn === "function" && /^class\s/.test(fn.toString());
    } catch {
      return false;
    }
  };

  const checks = {
    null: () => obj === null,
    undefined: () => obj === undefined,
    udf: () => obj === undefined,
    nan: () => Number.isNaN(obj),
    str: () => typeof obj === "string",
    string: () => typeof obj === "string",
    num: () => typeof obj === "number",
    number: () => typeof obj === "number",
    bool: () => typeof obj === "boolean",
    boolean: () => typeof obj === "boolean",
    arr: () => Array.isArray(obj),
    array: () => Array.isArray(obj),
    obj: () => obj !== null && typeof obj === "object",
    object: () => obj !== null && typeof obj === "object",
    map: () =>
      obj !== null && typeof obj === "object" && Object.getPrototypeOf(obj) === Object.prototype && !Array.isArray(obj),
    dict: () =>
      obj !== null && typeof obj === "object" && Object.getPrototypeOf(obj) === Object.prototype && !Array.isArray(obj),
    func: () => obj instanceof Function && !isClass(obj),
    function: () => obj instanceof Function && !isClass(obj),
    syncfunc: () => obj instanceof Function && !isAsync(obj) && !isClass(obj),
    async: () => isAsync(obj),
    asyncfunc: () => isAsync(obj),
    promise: () => obj instanceof Promise,
    date: () => obj instanceof Date,
    regex: () => obj instanceof RegExp,
    regexp: () => obj instanceof RegExp,
    error: () => obj instanceof Error,
    err: () => obj instanceof Error,
    class: () => isClass(obj),
    symbol: () => typeof obj === "symbol",
  };

  return checks[type]?.() ?? undefined;
};

u.stringCheckType = (string = "", type = "*") => {
  string = String(string).trim();
  if (typeof type === "string") type = type.toLowerCase();

  switch (type) {
    case "*":
      return true;

    case Number:
    case "num":
    case "number":
      if (string === "") return false;
      return !isNaN(Number(string)) && isFinite(Number(string));

    case Array:
    case "arr":
    case "array":
      if (string === "") return false;
      try {
        const parsed = JSON.parse(string);
        return Array.isArray(parsed);
      } catch {
        return false;
      }

    case Map:
    case "map":
    case Object:
    case "obj":
    case "object":
      if (string === "" || string === "null") return false;
      try {
        const parsed = JSON.parse(string);
        return typeof parsed === "object" && parsed !== null;
      } catch {
        return false;
      }

    case Boolean:
    case "boolean":
    case "bool":
      return string === "true" || string === "false" || string === "1" || string === "0";

    case Date:
    case "date":
      if (string === "") return false;
      return !isNaN(new Date(string).getTime());

    default:
      if (u.typeCheck(type, "regex")) return type.test(string);
      if (u.typeCheck(type, "function")) return !!type(string);
      return false;
  }
};

/**
 * @return -1 if item is bad / float
 */
u.len = (item) => {
  if (item == null) return -1;
  if (typeof item.size === "number") return item.size;
  if (typeof item.length === "number") return item.length;
  if (typeof item === "object") return Object.keys(item).length;
  if (Number.isInteger(item)) return String(Math.abs(item)).length;
  return -1;
};

u.int = (number) => Number.parseInt(number);

u.hex = (number, base = 16, fix = 1) => number.toString(base).toUpperCase().padStart(fix, "0");

u.hexToInt = (number, base = 16) => parseInt(number, base);

u.numberToPrecision = (number, percision = 2) => number.toFixed(percision);

u.float = (number) => floatFormat(number);

u.floatCompare = (f1, f2, precision) => floatFormat.compare(f1, f2, precision);

u.arrayGet = (arr, ...idx) => {
  const out = new Array(idx.length);
  for (let i = 0; i < idx.length; i++) out[i] = arr[idx[i]];
  return out;
};

u.arrayAdd = (...arr) => arr.flat();

u.arraySets = (...arr) => [...new Set(arr.flat())];

u.arrayExtract = (arr, start, end = arr.length) => arr.slice(start, end);

u.arrayPopEnd = (arr) => arr.pop();

u.arrayPopStart = (arr) => arr.shift();

u.arrayToString = (arr, sep = ",", front = "", back = "") => front + arr.join(sep) + back;

u.arrayToMap = (arr1, arr2) => {
  let result = {};
  for (let i = 0; i < arr1.length; i++) result[arr1[i]] = arr2[i];
  return result;
};

u.arrayOfMapSearch = (arr, pair = {}) => arr.filter((item) => u.contains(item, pair));

u.arrayOfMapSort = (arr, target, asc = true) => {
  return arr.sort((a, b) => {
    const diff = a[target] < b[target] ? -1 : a[target] > b[target] ? 1 : 0;
    return asc ? diff : -diff;
  });
};

u.arrayFlatten = (arr, level = Infinity) => arr.flat(level);

u.mapMerge = (...maps) => Object.assign({}, ...maps);

u.mapMergeDeep = (...sets) => {
  const isPlainObject = (obj) =>
    obj instanceof Object && !(obj instanceof RegExp) && !(obj instanceof Function) && !Array.isArray(obj);

  const merge = (target, source) => {
    if (Array.isArray(source)) return source;

    for (const key in source) {
      if (isPlainObject(source[key]) && isPlainObject(target[key])) {
        target[key] = merge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  };

  return sets.reduce((acc, set) => merge(acc, set), {});
};

u.mapEntries = (aSet) => Object.entries(aSet);

u.mapKeys = (aSet) => Object.keys(aSet);

u.mapValues = (aSet) => Object.values(aSet);

u.mapGet = (aSet, ...keys) => {
  const r = {};
  for (let i = 0, n = keys.length; i < n; ++i) r[keys[i]] = aSet[keys[i]];
  return r;
};

u.mapGetExist = (aSet, ...keys) => {
  const r = {};
  for (let i = 0; i < keys.length; ++i) {
    const v = aSet[keys[i]];
    if (v !== undefined) r[keys[i]] = v;
  }
  return r;
};

u.mapGetExcept = (obj, ...exclude) => {
  const skip = new Set(exclude);
  const result = {};
  for (const key of Object.keys(obj)) {
    if (!skip.has(key)) result[key] = obj[key];
  }
  return result;
};

/**
 *
 * @param {(value?,key?)=>{}} func
 */
u.mapFilter = (map, func) => {
  const result = {};
  for (const key in map) {
    if (func(map[key], key)) {
      result[key] = map[key];
    }
  }
  return result;
};

u.stringToArray = (line, sep = ",") => line.split(sep);

u.stringToRegex = (input) => {
  if (input instanceof RegExp) return input;
  return new RegExp(String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
};

u.date = (value) => {
  let num = Number(value);
  if (!isNaN(num) && isFinite(num)) return new Date(num);
  return new Date(value);
};

u.genDate = (year, month, day, hour, minute, second) => {
  const now = new Date();
  return new Date(
    year ?? now.getFullYear(),
    (month ?? now.getMonth() + 1) - 1,
    day ?? now.getDate(),
    hour ?? now.getHours(),
    minute ?? now.getMinutes(),
    second ?? now.getSeconds()
  );
};

u.genRandom = (start, end, float = false) => {
  if (start === undefined) return Math.random();
  const range = end - start;
  const random = Math.random() * range + start;
  return float ? random : Math.floor(random);
};

u.randomChoose = (aList, itemNum = 1, duplicate = false) => {
  const length = aList.length;
  itemNum = Math.min(itemNum, length);

  if (duplicate) {
    const result = [];
    for (let i = 0; i < itemNum; i++) {
      result.push(aList[Math.floor(Math.random() * length)]);
    }
    return result;
  }

  const result = Array.from(aList);

  for (let i = 0; i < itemNum; i++) {
    const rand = i + Math.floor(Math.random() * (length - i));
    [result[rand], result[i]] = [result[i], result[rand]];
  }

  return result.slice(0, itemNum);
};

u.randomPassword = (num = 8, strong = false, symbol = false) => {
  const lower = "zxcvbnmasdfghjklqwertyuiop1234567890";
  const upper = "ZXCVBNMASDFGHJKLQWERTYUIOP";
  const symbols = ",./;'[]-=<>?:|}{+_!@#$%^&*()\\\"";

  const base = lower + (strong ? upper : "") + (symbol ? symbols : "");
  const chars = new Uint8Array(num);
  crypto.getRandomValues(chars);

  return Array.from(chars, (byte) => base[byte % base.length]).join("");
};

/**
 * @param {"date"|"iso"|"json"|"localedate"|"localetime"|"locale"|"locale24"|"datetime"|"datetime0"|"string"|"time"|"utc"|"plain"|"long"} key
 * "date":"Thu Apr 09 2020",
 *
 * "iso":"2020-04-09T06:05:45.290Z",
 *
 * "json":{"year":2020,"month":4,"day":9,"hour":14,"minute":5,"second":45},
 *
 * "localedate":"4/9/2020",
 *
 * "localetime":"2:05:45 PM",
 *
 * "locale":"4/9/2020, 2:05:45 PM",
 *
 * "locale24":"4/9/2020, 14:05:45",
 *
 * "datetime":"2020-04-09 06:05:45",
 *
 * "datetime0":"2020-04-08 16:00:00", beginning of the day
 *
 * "string":"Thu Apr 09 2020 14:05:45 GMT+0800 (China Standard Time)",
 *
 * "time":"14:05:45 GMT+0800 (China Standard Time)",
 *
 * "utc":"Thu, 09 Apr 2020 06:05:45 GMT",
 *
 * "plain":"2020_4_9_14_5_45",
 *
 * "long":1586412345290}
 */
u.dateFormat = (key = "*", dateObject = new Date()) => {
  const dobj = u.typeCheck(dateObject, "map")
    ? new Date(
        dateObject.year,
        dateObject.month - 1,
        dateObject.day,
        dateObject.hour,
        dateObject.minute,
        dateObject.second
      )
    : new Date(dateObject);
  key = key.toLowerCase();

  const formatters = {
    date: () => dobj.toDateString(),
    iso: () => dobj.toISOString(),
    json: () => ({
      year: dobj.getFullYear(),
      month: dobj.getMonth() + 1,
      day: dobj.getDate(),
      hour: dobj.getHours(),
      minute: dobj.getMinutes(),
      second: dobj.getSeconds(),
    }),
    localedate: () => dobj.toLocaleDateString(),
    localetime: () => dobj.toLocaleTimeString(),
    locale: () => dobj.toLocaleString(),
    locale24: () => dobj.toLocaleString("en-US", { hour12: false }),
    datetime: () =>
      dobj
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d+Z/, ""),
    datetime0: () =>
      new Date(dobj.toLocaleDateString())
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d+Z/, ""),
    string: () => dobj.toString(),
    time: () => dobj.toTimeString(),
    utc: () => dobj.toUTCString(),
    plain: () =>
      `${dobj.getFullYear()}_${
        dobj.getMonth() + 1
      }_${dobj.getDate()}_${dobj.getHours()}_${dobj.getMinutes()}_${dobj.getSeconds()}`,
    long: () => dobj.getTime(),
  };

  if (key === "*") {
    return Object.fromEntries(Object.entries(formatters).map(([k, fn]) => [k, fn()]));
  }

  return formatters[key]?.();
};

/**
 * @param {{year:number, month:number, day:number, hour:number, minute:number, second:number}} difference
 */
u.dateAdd = (difference = {}, date = new Date()) => {
  const MS_PER_UNIT = {
    year: 31536000000,
    month: 2592000000,
    day: 86400000,
    hour: 3600000,
    minute: 60000,
    second: 1000,
  };

  const totalMs = Object.entries(MS_PER_UNIT).reduce(
    (sum, [key, ms]) => sum + (difference[key] ?? 0) * ms,
    new Date(date).getTime()
  );

  return new Date(totalMs);
};

u.runCode = (string) => Promise.resolve(eval("(" + string + ")"));

u.urlEncode = (string) => encodeURIComponent(string);

u.urlDecode = (string) => decodeURIComponent(string);

/**
 * Extracts a specific component or query parameter from a URL string.
 *
 * @param {string} urlString - Complete URL string
 * @param {'href'|'protocol'|'host'|'hostname'|'port'|'pathname'|'search'|'origin'|string} key - Component or query param name
 * @returns {string} The requested value or empty string
 *
 * @example
 * // URL: "https://abc.com:8080/s?a=1"
 * // Available keys:
 * // {
 * //   href: "https://abc.com:8080/s?a=1",
 * //   protocol: "https:",
 * //   host: "abc.com:8080",
 * //   hostname: "abc.com",
 * //   port: "8080",
 * //   pathname: "/s",
 * //   search: "?a=1",
 * //   origin: "https://abc.com:8080",
 * //   a: "1"  (query param)
 * // }
 */
u.urlInfo = (urlString, key) => {
  const url = new URL(u.url(urlString));

  if (key in url) return url[key];

  if (!url.search) return "";

  const search = url.search.slice(1);
  const idx = search.indexOf(key + "=");

  if (idx === -1) return "";

  const start = idx + key.length + 1;
  const end = search.indexOf("&", start);

  return decodeURIComponent(end === -1 ? search.slice(start) : search.slice(start, end));
};

/**
 * @return {string | null}
 */
u.refind = (sentence, regex) => {
  let result = new RegExp(regex).exec(sentence);
  return result != null ? result[0] : null;
};

/**
 * @return {[string] | null}
 */
u.refindall = (sentence, regex) => sentence.match(new RegExp(regex, "g"));

u.reSub = (sentence, regex, replacement, ignoreCase = true) => {
  return sentence.replace(new RegExp(regex, ignoreCase ? "gi" : "g"), replacement);
};

/**
 * @example
 * // Match "2" only when followed by "3"
 * "123454321".match(/2(?=3)/) // Returns: [ "2" ] (the 2 in "123")
 * @example
 * // Match "2" only when followed by "4"
 * "123454321".match(/2(?=4)/) // Returns: null
 */
u.regexOnlyMatchNext = (start, next) => new RegExp(`${new RegExp(start).source}(?=${new RegExp(next).source})`);

/**
 * @example
 * // Match "2" only when NOT followed by "3"
 * "123454321".match(/2(?!3)/) // Returns: [ "2" ] (the 2 in "321")
 * @example
 * // Match "2" only when NOT followed by "4"
 * "123454321".match(/2(?!4)/) // Returns: [ "2", "2" ] (the 2 in "123" and "321")
 */
u.regexNotMatchNext = (start, next) => new RegExp(`${new RegExp(start).source}(?!${new RegExp(next).source})`);

/**
 * @example
 * // Match "3" only when preceded by "2"
 * "123454321".match(/(?<=2)3/) // Returns: [ "3" ] (the 3 in "123")
 * @example
 * // Match "4" only when preceded by "2"
 * "123454321".match(/(?<=2)4/) // Returns: null
 */
u.regexOnlyMatchNextGetNext = (start, next) => new RegExp(`(?<=${new RegExp(start).source})${new RegExp(next).source}`);

/**
 * @example
 * // Match "3" only when NOT preceded by "2"
 * "123454321".match(/(?<!2)3/) // Returns: [ "3" ] (the 3 in "321")
 * @example
 * // Match "4" only when NOT preceded by "2"
 * "123454321".match(/(?<!2)4/) // Returns: [ "4", "4" ] (the 4 in "454")
 */
u.regexNotMatchNextGetNext = (start, next) => new RegExp(`(?<!${new RegExp(start).source})${new RegExp(next).source}`);

/**
 * @example
 * // Match everything between "2" and "3"
 * "123454321".match(/(?<=2)(.*)(?=3)/) // Returns: [ "3454" ]
 * @example
 * // Match everything between "2" and "4"
 * "123454321".match(/(?<=2)(.*)(?=4)/) // Returns: [ "345" ]
 */
u.regexBetweenOut = (start, end) => new RegExp(`(?<=${new RegExp(start).source})(.*)(?=${new RegExp(end).source})`);

/**
 * @example
 * // Match everything between "2" and "3" (non-greedy)
 * "123454321".match(/(?<=2)(.*?)(?=3)/) // Returns: [ "" ]
 * @example
 * // Match everything between "2" and "4" (non-greedy)
 * "123454321".match(/(?<=2)(.*?)(?=4)/) // Returns: [ "3" ]
 */
u.regexBetweenOutNonGreedy = (start, end) =>
  new RegExp(`(?<=${new RegExp(start).source})(.*?)(?=${new RegExp(end).source})`);

/**
 * @example
 * // Match from "2" to "3" (greedy)
 * "123454321".match(/2.*3/) // Returns: [ "234543" ]
 * @example
 * // Match from "2" to "4" (greedy)
 * "123454321".match(/2.*4/) // Returns: [ "23454" ]
 */
u.regexBetweenIn = (start, end) => new RegExp(`${new RegExp(start).source}.*${new RegExp(end).source}`);

/**
 * @example
 * // Match from "2" to "3" (non-greedy)
 * "123454321".match(/2(.*?)3/) // Returns: [ "23" ]
 * @example
 * // Match from "2" to "4" (non-greedy)
 * "123454321".match(/2(.*?)4/) // Returns: [ "234" ]
 */
u.regexBetweenInNonGreedy = (start, end) => new RegExp(`${new RegExp(start).source}(.*?)${new RegExp(end).source}`);

u.stringReplace = (sentence, pairs = {}, recursive = true, all = true) => {
  const entries = Object.entries(pairs);
  if (entries.length === 0) return sentence;

  const flags = all ? "g" : "";
  const regexes = entries.map(([pattern, replacement]) => [new RegExp(pattern, flags), replacement]);

  const replaceSingle = (str) =>
    regexes.reduce((result, [regex, replacement]) => result.replace(regex, replacement), str);

  if (!recursive) return replaceSingle(sentence);

  let result = sentence;
  let previous;

  const MAX_ITERATIONS = 1000;
  let iterations = 0;

  do {
    previous = result;
    result = replaceSingle(result);
    iterations++;
    if (iterations > MAX_ITERATIONS) {
      throw new Error(`Replacement recursion exceeded ${MAX_ITERATIONS} iterations`);
    }
  } while (result !== previous);

  return result;
};

u.stringRemoveBefore = (sentence, segment, include = false) => {
  const index = sentence.indexOf(segment);
  if (index === -1) return sentence;
  return sentence.substring(include ? index : index + segment.length);
};

u.stringRemoveAfter = (sentence, segment, include = false) => {
  const index = sentence.lastIndexOf(segment);
  if (index === -1) return sentence;
  return sentence.substring(0, include ? index + segment.length : index);
};

u.stringToJson = (line) => {
  if (u.typeCheck(line, "obj")) return line;
  return line === null || line === undefined ? null : JSON.parse(line);
};

u.jsonToString = (map, space = "\t", circularCheck = false) => {
  if (map === null || map === undefined) return null;
  if (typeof map === "string") return map;

  return (circularCheck ? jStringify : JSON.stringify)(map, undefined, space);
};

u.fileExtension = (pathString) => u.refind(pathString, /(\.[^.]+)$/);

u.url = (url) => {
  if (/^localhost/.test(url)) return "http://" + url;
  if (url === "about:blank") return "about:blank";
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) return "http://" + url;
  if (/^http/.test(url)) return url;
  if (/^www/.test(url)) return "https://" + url;
  return "https://www." + url;
};

u.promiseTimeout = (seconds = 0) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

u.promiseTryTimes = async (func, tryTimes = 3, tryIntervalSec = 0, logError = false) => {
  let lastError;

  for (let attempt = 1; attempt <= tryTimes; attempt++) {
    try {
      return await func();
    } catch (error) {
      lastError = error;
      if (logError) console.error(`Attempt ${attempt}/${tryTimes} failed:`, error.message);

      if (attempt < tryTimes && tryIntervalSec > 0) {
        await u.promiseTimeout(tryIntervalSec);
      }
    }
  }

  throw lastError;
};

/**
 * function will continue anyway, thus separate large functions
 */
u.promiseTimeoutReject = async (func, seconds = 30, errorMsg = "timeout reached") => {
  return Promise.race([async () => func(), u.promiseTimeout(() => {}, seconds).then(() => Promise.reject(errorMsg))]);
};

/**
 * @typedef {{
    "Content-Type"?:"application/json; charset=utf-8" | "application/x-www-form-urlencoded"
  }} headers
 */

/**
  * @typedef {{
    method: "GET" | "POST" | "PUT" | "DELETE",
    mode?: "same-origin" | "cors" | "no-cors",
    cache?: "default" | "no-cache" | "reload" | "force-cache" | "only-if-cached",
    credentials?: "same-origin" | "include" | "omit",
    redirect?: "follow" | "manual" | "error",
    referrer?: "client" | "no-referrer"
  }} fetchOption
  */

/**
 *
 * @param {headers} headers
 * @param {fetchOption} fetchSettings
 * @return {Promise<{status:number, headers:{}, body:{}, result:{} | string}>}
 */
u.promiseFetchRaw = async (url, method = "GET", headers = {}, fetchSettings = {}, retry = 1, interval = 1) => {
  if (!u.contains(url, "localhost") && url.toLowerCase() !== "about:blank") url = u.url(url);

  if (!u._global._httpDefaultOption)
    u._global._httpDefaultOption = {
      mode: "cors",
      cache: "default",
      credentials: "same-origin",
      redirect: "follow",
      referrer: "client",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
        "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        DNT: "1",
        Connection: "keep-alive",
      },
    };

  const param = u.mapMergeDeep(u._global._httpDefaultOption, { method, headers }, fetchSettings);

  try {
    const response = await fetch(url, param);
    const contentType = response.headers.get("content-type");
    const result = contentType?.includes("application/json") ? await response.json() : await response.text();

    if (response.status >= 400) throw { status: response.status, result };

    return { status: response.status, headers: response.headers, body: response.body, result };
  } catch (error) {
    if (retry > 0) {
      await u.promiseTimeout(interval);
      return u.promiseFetchRaw(url, method, headers, fetchSettings, retry - 1, interval);
    }
    throw error.status ? error : { status: 600, msg: "fetch error", error };
  }
};

/**
 *
 * @param {headers} headers
 * @param {fetchOption} fetchSettings
 */
u.promiseFetchGet = async (url, headers = {}, fetchSettings = {}, retry = 1, interval = 1) => {
  return u.promiseFetchRaw(url, "GET", headers, fetchSettings, retry, interval).then((data) => data.result);
};

/**
 *
 * @param {headers} headers
 * @param {fetchOption} fetchSettings
 */
u.promiseFetchPost = async (url, body = {}, headers = {}, fetchSettings = {}, retry = 1, interval = 1) => {
  return u
    .promiseFetchRaw(url, "POST", headers, { body: u.jsonToString(body), ...fetchSettings }, retry, interval)
    .then((data) => data.result);
};

u.serialize = (obj, unsafe = true, ignoreFunction = false) => serialize(obj, { unsafe, ignoreFunction, space: "\t" });

u.deserialize = (string) => eval("(" + string + ")");

module.exports = u;
