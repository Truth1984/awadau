const fetch = require("isomorphic-fetch"),
  serialize = require("serialize-javascript"),
  floatFormat = require("float-format"),
  jStringify = require("json-stringify-safe");

var u = {};

u._global = {};
u.ex = {};

/**
 * @param {"TRACE"|"DEBUG"|"INFO"|"WARN"|"ERROR"|"FATAL"} severityThen
 * @param {"TRACE"|"DEBUG"|"INFO"|"WARN"|"ERROR"|"FATAL"} severityCatch
 */
u.log = async (message, extra = {}, _section, severityThen = "INFO", severityCatch = "ERROR") => {
  let plain = { date: new Date().toLocaleString("en-US", { hour12: false }) };
  let segment = u.mapMerge(
    _section ? { _section } : {},
    { ...extra },
    u.typeCheck(message, "promise") ? { _promise: true } : {}
  );
  return Promise.resolve(message)
    .then((data) => {
      return u.mapMerge(plain, { message: data, severity: severityThen, ...segment });
    })
    .catch((e) => {
      return u.mapMerge(plain, { message: u.errorHandle(e), severity: severityCatch, ...segment, error: true });
    })
    .then((result) => console.log(u.jsonToString(result, "")));
};

u.contains = (origin, item) => {
  if (origin === undefined || item === undefined) return false;
  let simpleCheck = (obj) => {
    if (u.typeCheck(obj, "object")) {
      if (u.typeCheck(obj, "map")) return "map";
      if (u.typeCheck(obj, "array")) return "array";
      return "object";
    }
    return typeof obj;
  };
  // number, string, map, array, object, boolean
  let originType = simpleCheck(origin);
  let itemType = simpleCheck(item);
  if (["number", "string", "map", "array"].indexOf(originType) == -1) originType = originType.toString();
  if (["number", "string", "map", "array"].indexOf(itemType) == -1) itemType = itemType.toString();

  if (originType == "number") {
    if (itemType == "map" || itemType == "array") {
      let itemValue = u.mapValues(item);
      return itemValue.filter((value) => origin.toString().indexOf(value) !== -1).length == itemValue.length;
    }
    // item : number | string
    return origin.toString().indexOf(item) !== -1;
  }

  if (originType == "array") {
    if (itemType == "map") {
      return origin.filter((i) => u.equal(i, item)).length > 0;
    }

    if (itemType == "array") {
      return item.filter((i) => u.contains(origin, i)).length == item.length;
    }
    //item : number | string
    return origin.indexOf(item) !== -1;
  }

  if (originType == "map") {
    if (itemType == "map") {
      for (let i of u.mapKeys(item)) if (!u.contains(origin[i], item[i])) return false;
      return true;
    }
    if (itemType == "array") return u.contains(u.mapKeys(origin), item) || u.contains(u.mapValues(origin), item);
    //item : number | string
    return u.mapKeys(origin).indexOf(item) !== -1 || u.mapValues(origin).indexOf(item) !== -1;
  }

  if (itemType == "map" || itemType == "array") {
    let itemValue = u.mapValues(item);
    return itemValue.filter((value) => origin.toString().indexOf(value) !== -1).length == itemValue.length;
  }
  // item : number | string
  return origin.toString().indexOf(item) !== -1;
};

u.equal = (item1, item2) => {
  if (item1 === item2) return true;
  if (u.typeCheck(item1) !== u.typeCheck(item2)) return false;
  if (u.typeCheck(item1, "arr")) return item1.every((ele, index) => u.equal(ele, item2[index]));
  if (u.typeCheck(item1, "string") || u.typeCheck(item1, "regex")) return String(item1) === String(item2);
  if (u.typeCheck(item1, "promise"))
    return u.promiseAllCompleteSafe(item1, item2).then((data) => {
      return u.equal(data[0], data[1]);
    });
  return JSON.stringify(item1) === JSON.stringify(item2);
};

/**
 * @param {"null" | "udf" | "nan" | "str" | "num" | "bool" | "arr" | "obj" | "map" | "func" | "asyncfunc" | "obj" | "date" | "promise" | "regex" | "class" | "err" } type
 */
u.typeCheck = (obj = undefined, type = undefined) => {
  if (type === undefined) return typeof obj;
  if (Number.isNaN(type)) type = "nan";
  if (typeof type === "string") type = type.toLowerCase();
  switch (type) {
    case null:
    case "null":
      return obj === null;
    case "undefined":
    case "udf":
      return obj === undefined;
    case "nan":
      return isNaN(obj);
    case String:
    case "str":
    case "string":
    case "":
      return typeof obj === "string";
    case Number:
    case "num":
    case "number":
      return typeof obj === "number";
    case Boolean:
    case "bool":
    case "boolean":
      return typeof obj === "boolean";
    case Array:
    case "arr":
    case "array":
      return Array.isArray(obj);
    case Object:
    case "obj":
    case "object":
      return obj instanceof Object;
    case Map:
    case "map":
    case "dictionary":
    case "dict":
      return obj && obj.constructor == {}.constructor;
    case Function:
    case "func":
    case "function":
      return obj instanceof Function;
    case "asyncfunc":
    case "async":
      return obj instanceof Function && obj.constructor.name === "AsyncFunction";
    case Promise:
    case "promise":
      return obj && obj.then instanceof Function;
    case Date:
    case "date":
      return obj instanceof Date;
    case RegExp:
    case "regex":
    case "regexp":
      return obj instanceof RegExp;
    case "err":
    case "error":
      return obj instanceof Error;
    case "class":
      return typeof obj === "function" && /^\s*class\s+/.test(obj.toString());
    default:
      return;
  }
};

/**
 * @return {null | object}
 */
u._parseJsonCheck = (string) => {
  let result = null;
  try {
    result = JSON.parse(string);
  } catch (e) {
    return result;
  }
  return result;
};

u.stringCheckType = (string = "", type = "*") => {
  if (typeof type === "string") type = type.toLowerCase();
  switch (type) {
    case "*":
      return true;
    case Number:
    case "num":
    case "number":
      return !u.isBad(Number(string), NaN);
    case Array:
    case "arr":
    case "array":
      return Array.isArray(u._parseJsonCheck(string));
    case Map:
    case "map":
    case Object:
    case "obj":
    case "object":
      return u._parseJsonCheck(string) instanceof Object;
    case Boolean:
    case "boolean":
    case "bool":
      return string.toString().toLowerCase() === "true" || string.toString().toLowerCase() === "false";
    case Date:
    case "date":
      return new Date(string) != "Invalid Date";

    default:
      if (u.typeCheck(type, "regex")) return type.test(string);
      if (u.typeCheck(type, Function)) return type(string) || false;
      if (u.isBad(u.reCommon(type))) return false;
      return u.reCommon(type).test(string);
  }
};

u.stringConvertType = (string = "") => {
  if (u._parseJsonCheck(string)) return u.stringToJson(string);
  if (u.stringCheckType(string, "bool")) return string.toString().toLowerCase() === "true";
  if (u.stringCheckType(string, "date")) return new Date(string);
  if (!isNaN(u.float(string))) return u.float(string);
  return string;
};

u.repeatValues = (value, times) => {
  let result = value;
  while (times > 1) {
    result += value;
    times -= 1;
  }
  return result;
};

/**
 * @return -1 if item is bad / float
 */
u.len = (item) => {
  if (item instanceof Object) return Object.keys(item).length;
  if (item && item.length) return item.length;
  if (Number.isInteger(item)) return item.toString().length;
  return -1;
};

u.isBad = (item, badType = [null, undefined]) => {
  badType = Array.isArray(badType) ? badType : [badType];
  for (let i of badType) {
    let result = u.typeCheck(item, i + "");
    if (u.typeCheck(result, "undefined") && item === i) return true;
    if (result) return true;
  }
  return false;
};

u.isBadAssign = (item, elseValue, badType = [null, undefined]) => {
  return u.isBad(item, badType) ? elseValue : item;
};

/**
 * @return {"" | string} if obj is undefined / null / NaN
 */
u.toStr = (obj) => {
  if (u.typeCheck(obj) === "object" || u.typeCheck(obj, Promise)) return u.jsonToString(obj);
  // bad
  if (u.isBad(obj, [undefined, null, NaN])) return "";
  //boolean class function
  return obj + "";
};

/**
 * @return {{message:?string, stack:?string}}
 */
u.errorHandle = (error) => {
  if (u.typeCheck(error, "err")) return { message: error.message, stack: error.stack };
  return error;
};

u.int = (number) => Number.parseInt(number);

u.hex = (number, base = 16, fix = 1) => {
  let result = Number(number).toString(base).toUpperCase();
  if (u.len(result) < fix) result = u.repeatValues("0", fix - u.len(result)) + result;
  return result;
};

u.hexToInt = (number, base = 16) => parseInt(number, base);

u.numberToPrecision = (number, percision = 2) => number.toFixed(percision);

u.numberPrecision = (number) => {
  let temp = number.toString().split(".");
  return temp.length > 1 ? temp[1].length : 0;
};

u.numberShorten = (num, tofix = 2, languageEn = true) => {
  let unitLarge = languageEn
    ? [
        { value: 1, symbol: "" },
        { value: 1e3, symbol: "k" },
        { value: 1e6, symbol: "M" },
        { value: 1e9, symbol: "G" },
        { value: 1e12, symbol: "T" },
        { value: 1e15, symbol: "P" },
        { value: 1e18, symbol: "E" },
        { value: 1e21, symbol: "Z" },
        { value: 1e24, symbol: "Y" },
      ]
    : [
        { value: 1, symbol: "" },
        { value: 1e4, symbol: "万" },
        { value: 1e8, symbol: "亿" },
        { value: 1e12, symbol: "兆" },
        { value: 1e16, symbol: "京" },
        { value: 1e20, symbol: "垓" },
        { value: 1e24, symbol: "秭" },
      ];
  let unitSmall = [
    { value: 1, symbol: "" },
    { value: 1e-3, symbol: "m" },
    { value: 1e-6, symbol: "µ" },
    { value: 1e-9, symbol: "n" },
    { value: 1e-12, symbol: "p" },
    { value: 1e-15, symbol: "f" },
    { value: 1e-18, symbol: "a" },
    { value: 1e-21, symbol: "z" },
    { value: 1e-24, symbol: "y" },
  ];
  let regex = /\.0+$|(\.[0-9]*[1-9])0+$/;
  let i;
  if (num === 0) return 0;
  if (1 > num && num > -1) {
    for (i = 0; i < unitSmall.length; i++) {
      if (Math.abs(num) >= unitSmall[i].value) break;
    }
    return (num / unitSmall[i].value).toFixed(tofix).replace(regex, "$1") + unitSmall[i].symbol;
  } else {
    for (i = unitLarge.length - 1; i > 0; i--) {
      if (Math.abs(num) >= unitLarge[i].value) break;
    }
    return (num / unitLarge[i].value).toFixed(tofix).replace(regex, "$1") + unitLarge[i].symbol;
  }
};

u.float = (number) => floatFormat(number);

u.floatCompare = (f1, f2, precision) => floatFormat.compare(f1, f2, precision);

u.productList = (...lists) => {
  lists.forEach((value, index, arr) => {
    arr[index] = u.typeCheck(value, Array) ? value : [value];
  });
  return lists.reduce(
    (accumulator, value) => {
      let temp = [];
      accumulator.forEach((a0) => {
        value.forEach((a1) => {
          temp.push(a0.concat(a1));
        });
      });
      return temp;
    },
    [[]]
  );
};

u.arrayGet = (arr, ...index) =>
  index.reduce((hook, item) => {
    hook.push(arr[item]);
    return hook;
  }, []);

u.arrayAdd = (...arr) => [].concat(...arr);

u.arrayMerge = (...arr) => Array.from(new Set(u.arrayAdd(...arr)));

u.arrayExtract = (arr, start, end = arr.length) => arr.slice(start, end);

u.arrayRemove = (arr, items = []) => {
  let result = [];
  if (!u.typeCheck(items, "arr")) items = [items];
  for (let i of arr) if (!u.contains(items, i)) result.push(i);
  return result;
};

u.arrayPopEnd = (arr) => arr.pop();

u.arrayPopStart = (arr) => arr.shift();

u.arrayToString = (arr, sep = ",") => arr.join(sep);

u.arrayToMap = (arr1, arr2) => {
  let result = {};
  for (let i in arr1) result[arr1[i]] = arr2[i];
  return result;
};

u.arrayReplace = (arr, name, ...items) => {
  let index = 0;
  let result = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === name) {
      result = result.concat(arr.slice(index, i), ...items);
      index = i + 1;
    }
  }
  result = result.concat(arr.slice(index, arr.length));
  return result;
};

/** discard if no primary present */
u.arrayofMapMergeSelf = (aom, primaryKey) => {
  let result = {};
  for (let i of aom) {
    let ipk = i[primaryKey];
    if (ipk == undefined) continue;
    result[ipk] = u.mapMerge(result[ipk], i);
  }
  return u.mapValues(result);
};

/** display pre-discard and pre-merged result */
u.arrayofMapMergeSelfLeftOver = (aom, primaryKey) => {
  let result = { undefined: [] };
  let tmpresult = {};
  for (let i of aom) {
    let ipk = i[primaryKey];
    if (ipk == undefined) {
      result[undefined].push(i);
      continue;
    }
    if (tmpresult[ipk] == undefined) tmpresult[ipk] = i;
    else if (result[ipk] == undefined) result[ipk] = [tmpresult[ipk], i];
    else result[ipk].push(i);
  }
  return result;
};

/**
 * 1 : a - b - ( a U b )
 *
 * call arrayofMapMergeSelf to merge duplicated result in aom1 and aom2
 *
 * exmaple:
 *
 * u.arrayOfMapLeftOuterJoin([{b:33,o:18},{c:12,b:15},{c:55,k:333}],[{ba:33,d:12},{c:15,g:32}],"b","ba")
 *
 * [{c: 12, b: 15}, {c: 55, k: 333}]
 */
u.arrayOfMapLeftOuterJoin = (aom1, aom2, pkey1, pkey2) => {
  if (pkey2 == undefined) pkey2 = pkey1;
  let rightResult = {}; // key:[value]
  for (let i of aom2) {
    let ipk = i[pkey2];
    if (ipk == undefined) continue;
    if (rightResult[ipk] == undefined) rightResult[ipk] = [];
    rightResult[ipk].push(i);
  }
  let result = [];
  for (let i of aom1) {
    let ipk = i[pkey1];
    if (rightResult[ipk] == undefined) result.push(i);
  }
  return result;
};

/**
 * 1 + 2 : a - b + ( a U b )
 *
 * call arrayofMapMergeSelf to merge duplicated result in aom1 and aom2
 *
 * exmaple:
 *
 * u.arrayOfMapLeftJoin([{b:33,o:18},{c:12,b:15},{c:55,k:333}],[{ba:33,d:12},{c:15,g:32}],"b","ba")
 *
 * [{b: 33, o: 18, d: 12}, {c: 12, b: 15}, {c: 55, k: 333}]
 */
u.arrayOfMapLeftJoin = (aom1, aom2, pkey1, pkey2) => {
  if (pkey2 == undefined) pkey2 = pkey1;
  let rightResult = {}; // key:[value]
  for (let i of aom2) {
    let ipk = i[pkey2];
    if (ipk == undefined) continue;
    if (rightResult[ipk] == undefined) rightResult[ipk] = [];
    rightResult[ipk].push(i);
  }
  let result = [];
  for (let i of aom1) {
    let ipk = i[pkey1];
    if (rightResult[ipk] == undefined) {
      result.push(i);
      continue;
    }
    for (let j of rightResult[ipk]) result.push(u.mapMerge(i, u.mapGetExcept(j, pkey2)));
  }
  return result;
};

/**
 * 2 : ( a U b )
 *
 * call arrayofMapMergeSelf to merge duplicated result in aom1 and aom2
 *
 * exmaple:
 *
 * u.arrayOfMapInnerJoin([{b:33,o:18},{c:12,b:15},{c:55,k:333}],[{ba:33,d:12},{c:15,g:32}],"b","ba")
 *
 * [{b: 33, o: 18, d: 12}]
 */
u.arrayOfMapInnerJoin = (aom1, aom2, pkey1, pkey2) => {
  if (pkey2 == undefined) pkey2 = pkey1;
  let rightResult = {}; // key:[value]
  for (let i of aom2) {
    let ipk = i[pkey2];
    if (ipk == undefined) continue;
    if (rightResult[ipk] == undefined) rightResult[ipk] = [];
    rightResult[ipk].push(i);
  }
  let result = [];
  for (let i of aom1) {
    let ipk = i[pkey1];
    if (rightResult[ipk] == undefined) continue;
    for (let j of rightResult[ipk]) result.push(u.mapMerge(i, u.mapGetExcept(j, pkey2)));
  }
  return result;
};

u.arrayOfMapSelectKeys = (arr, ...keys) => {
  return u.deepCopy(arr).map((i) => u.mapGetExist(i, ...keys));
};

u.arrayOfMapSearch = (arr, containedPairs = {}) => {
  return arr.filter((item) => u.contains(item, containedPairs));
};

u.arrayOfMapSet = (arr, matchedPairs, modify = {}) => {
  let darr = u.deepCopy(arr);
  for (let i of darr) if (u.contains(i, matchedPairs)) i = u.mapMergeDeep(i, modify);
  return darr;
};

u.arrayOfMapFindPerform = async (arr, matchedPairs = {}, action = () => {}) => {
  let darr = u.deepCopy(arr);
  for (let i of darr) if (u.contains(i, matchedPairs)) i = await action(i);
  return darr;
};

u.arrayOfMapSort = (arr, target, asc = true) => {
  // file deepcode ignore NoZeroReturnedInSort: <less or equal>
  if (asc) return arr.sort((a, b) => (a[target] <= b[target] ? -1 : 1));
  return arr.sort((a, b) => (a[target] <= b[target] ? 1 : -1));
};

u.arrayOfMapToMap = (aom = [], keyTarget, valueTarget) => {
  let result = {};
  if (valueTarget == undefined) for (let i of aom) result[i[keyTarget]] = u.mapGetExcept(i, keyTarget);
  else for (let i of aom) result[i[keyTarget]] = i[valueTarget];

  return result;
};

u.arrayFlatten = (arr, level = Infinity) => arr.flat(level);

u.arrayPerform = (arr, callback = () => {}) => {
  let array = Array.from(arr);
  for (let i in array) array[i] = callback(array[i]);
  return array;
};

u.arrayPerformPromise = async (arr, callback = async () => {}) => {
  let darr = u.deepCopy(arr);
  for (let i of darr) i = await callback(i);
};

u.mapMerge = (...maps) => maps.reduce((hook, item) => Object.assign(hook, item), {});

u._mapMergeDeepHelper = (target, source) => {
  let result = target;
  if (Array.isArray(target) && Array.isArray(source)) return source;
  for (let i of u.mapKeys(source)) {
    if (source[i] instanceof Object && !(source[i] instanceof RegExp) && !(source[i] instanceof Function)) {
      if (!(i in target)) {
        result = u.mapMerge(result, { [i]: source[i] });
      } else {
        result[i] = u._mapMergeDeepHelper(target[i], source[i]);
      }
    } else {
      result = u.mapMerge(result, { [i]: source[i] });
    }
  }
  return result;
};

u.mapMergeDeep = (...sets) => {
  let result = {};
  for (let i of sets) result = u._mapMergeDeepHelper(result, i);
  return result;
};

u.mapEntries = (aSet) => Object.entries(aSet);

u.mapKeys = (aSet) => Object.keys(aSet);

u.mapValues = (aSet) => Object.values(aSet);

u.mapGet = (aSet, ...keys) => keys.reduce((hook, item) => Object.assign(hook, { [item]: aSet[item] }), {});

u.mapGetPath = (aSet, path = [], fallbackData = {}) => {
  let last = path.pop();
  for (let i of path)
    if (u.typeCheck(aSet[i], "obj")) aSet = aSet[i];
    else return fallbackData;
  return aSet[last] === undefined ? fallbackData : aSet[last];
};

u.mapGetExist = (aSet, ...keys) =>
  keys.reduce((hook, item) => (aSet[item] == undefined ? hook : Object.assign(hook, { [item]: aSet[item] })), {});

u.mapGetExcept = (aSet, ...keys) =>
  u.mapKeys(aSet).reduce((hook, key) => (u.contains(keys, key) ? hook : Object.assign(hook, { [key]: aSet[key] })), {});

u.mapRemove = (aSet = {}, ...path) => {
  let result = u.deepCopy(aSet);
  if (u.len(path) < 2) {
    delete result[[...path]];
    return result;
  }
  let temp = result;
  for (let i = 0; i < path.length - 1; i++) {
    temp = temp[path[i]];
    if (temp === undefined) return aSet;
  }
  delete temp[path[path.length - 1]];
  return result;
};

u.mapValuesPerform = (aSet = {}, callback = () => {}) => {
  for (let i of u.mapKeys(aSet)) aSet[i] = callback(aSet[i]);
  return aSet;
};

u.mapValuesPerformDeep = (aSet = {}, callback = () => {}) => {
  for (let i of u.mapKeys(aSet)) {
    aSet[i] = u.typeCheck(aSet[i], Object) ? u.mapValuesPerformDeep(aSet[i], callback) : callback(aSet[i]);
  }
  return aSet;
};

u.mapValuesPerformPromise = async (aSet = {}, callback = async () => {}) => {
  return u.arrayPerformPromise(u.mapValues(aSet), callback).then((data) => {
    return u.arrayToMap(u.mapKeys(aSet), data);
  });
};

u.mapReplaceKey = (aSet = {}, keyMaps = {}) => {
  for (let i in keyMaps)
    if (i in aSet) {
      aSet[keyMaps[i]] = aSet[i];
      delete aSet[i];
    }
  return aSet;
};

u.mapSortByKey = (amap = {}) => {
  let result = {};
  Object.keys(amap)
    .sort()
    .map((i) => (result[i] = amap[i]));
  return result;
};

/**
 *
 * @param {(value?,key?)=>{}} func
 */
u.mapFilter = (map, func) => {
  return u.mapGetExist(map, ...u.mapKeys(map).filter((key) => func(map[key], key)));
};

/**
 * @returns {{path:string[],value:any}[]}
 */
u.mapDevGet = (map, keyPattern, _prev = []) => {
  let result = [];
  let pattern = u.stringToRegex(keyPattern);
  for (let i of u.mapKeys(map)) {
    if (pattern.test(i)) result.push({ path: u.arrayAdd(_prev, i), value: map[i] });
    if (u.typeCheck(map[i], "map")) result = u.arrayAdd(result, u.mapDevGet(map[i], keyPattern, u.arrayAdd(_prev, i)));
  }
  return result;
};

u.stringToArray = (line, sep = ",") => line.split(sep);

u.stringToRegex = (string) =>
  new RegExp(u.typeCheck(string, "regex") ? string : string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

u.date = (value) => {
  if (!Number.isNaN(Number(value))) return new Date(Number(value));
  return new Date(value);
};

u.genDate = (
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1,
  day = new Date().getDate(),
  hour = new Date().getHours(),
  minute = new Date().getMinutes(),
  second = new Date().getSeconds()
) => new Date(year, month - 1, day, hour, minute, second);

u.genRandom = (start, endIn, float = false) => {
  if (start === undefined) return Math.random();
  if (float) return Math.random() * (endIn - start + 1) + start;
  return Math.floor(Math.random() * (endIn - start + 1)) + start;
};

u.randomizeList = (aList) => {
  let length = aList.length;
  let result = Array.from(aList);
  for (let i = 0; i < length; i++) {
    let rand = i + Math.floor(Math.random() * (length - i));
    let value = result[rand];
    result[rand] = result[i];
    result[i] = value;
  }
  return result;
};

u.randomChoose = (aList, itemNum = 1) => u.randomizeList(aList).slice(aList.length - itemNum);

u.randomPassword = (num = 8, strong = false, symbol = false) => {
  let base = "zxcvbnmasdfghjklqwertyuiop1234567890";
  if (strong) base += "ZXCBVNMASDFGHJKLQWERTYUIOP";
  if (symbol) base += ",./;'[]-=<>?:|}{+_!@#$%^&*()\\\"";
  let result = "";
  for (let i = 0; i < num; i++) {
    result += base[u.genRandom(0, base.length - 1)];
  }
  return result;
};

u.dateCurrent = (returnType = {}, dobj = new Date()) => {
  let year = dobj.getFullYear();
  let month = dobj.getMonth() + 1;
  let day = dobj.getDate();
  let hour = dobj.getHours();
  let minute = dobj.getMinutes();
  let second = dobj.getSeconds();

  if (Array.isArray(returnType)) {
    return [year, month, day, hour, minute, second];
  }
  return { year, month, day, hour, minute, second };
};

u.dateCurrentParse = (currentObj) => {
  if (Array.isArray(currentObj)) return u.genDate(...currentObj);

  return u.genDate(
    currentObj.year,
    currentObj.month,
    currentObj.day,
    currentObj.hour,
    currentObj.minute,
    currentObj.second
  );
};

u.dateLong = (date = new Date()) => date.getTime();

u.dateLongToDate = (dateLong) => new Date(Number(dateLong));

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
 * "datetime0":"2020-04-08 16:00:00",
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
  let dobj = new Date(dateObject);
  key = key.toLowerCase();
  let date = {
    date: dobj.toDateString(),
    iso: dobj.toISOString(),
    json: u.dateCurrent({}, dobj),
    localedate: dobj.toLocaleDateString(),
    localetime: dobj.toLocaleTimeString(),
    locale: dobj.toLocaleString(),
    locale24: dobj.toLocaleString("en-US", { hour12: false }),
    datetime: u.stringReplace(dateObject.toISOString(), {
      T: " ",
      "\\.\\d+Z": "",
    }),
    datetime0: u.stringReplace(new Date(dobj.toLocaleDateString()).toISOString(), {
      T: " ",
      "\\.\\d+Z": "",
    }),
    string: dobj.toString(),
    time: dobj.toTimeString(),
    utc: dobj.toUTCString(),
    plain: u.arrayToString(u.dateCurrent([]), "_"),
    long: dobj.getTime(),
  };

  return key === "*" ? date : date[key];
};

/**
 * @param {{year:number, month:number, day:number, hour:number, minute:number, second:number}} difference
 */
u.dateAdd = (difference = {}, date = new Date()) => {
  date = new Date(date);
  let json = {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };

  for (let i of u.mapKeys(difference)) json[i] = json[i] + Number.parseInt(difference[i]);

  return u.dateCurrentParse(json);
};

/**
 *
 * @param {{year?:number, month?:number,day?:number,hour?:number,minute?:number,second?:number } | number} mapOrNum
 */
u.genTime = (mapOrNum = {}) => {
  let calc = {
    year: 31536000000,
    month: 2592000000,
    day: 86400000,
    hour: 3600000,
    minute: 60000,
    second: 1000,
  };
  let result;
  if (u.typeCheck(mapOrNum, "num")) {
    result = {};
    for (let i in calc) {
      if (mapOrNum / calc[i] >= 1) {
        result[i] = u.int(mapOrNum / calc[i]);
        mapOrNum -= result[i] * calc[i];
      }
    }
  } else {
    result = 0;
    for (let i in mapOrNum) result += calc[i] * mapOrNum[i];
  }
  return result;
};

u.runCode = (string) => Promise.resolve(eval("(" + string + ")"));

u.urlEncode = (string) => encodeURIComponent(string);

u.urlDecode = (string) => decodeURIComponent(string);

u.reCommonFast = () => {
  return {
    hex: /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/,
    date: /^(?:(?!0000)[0-9]{4}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|2[0-8])|(?:0[13-9]|1[0-2])-(?:29|30)|(?:0[13578]|1[02])-31)|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:0[48]|[2468][048]|[13579][26])00)-02-29)$/,
    email: /^([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})$/,
    passwordcomplex: /(?=(.*[0-9]))(?=.*[!@#$%^&*()\\[\]{}\-_+=~`|:;"'<>,./?])(?=.*[a-z])(?=(.*[A-Z]))(?=(.*)).{8,}/,
    passwordmoderate: /(?=(.*[0-9]))((?=.*[A-Za-z0-9])(?=.*[A-Z])(?=.*[a-z]))^.{8,}$/,
    passwordsimple: /.{6,}/,
    username: /[-_a-zA-Z0-9]{6,}/,
    qq: /[1-9][0-9]{4,10}$/,
    wx: /^[a-zA-Z]([-_a-zA-Z0-9]{5,19})$/,
    zipcode: /[1-9]\d{5}$/,
    phone: /^1[3456789]\d{9}$/,
    id: /^[1-9]\d{5}(18|19|([23]\d))\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
    passport: /^(P\d{7}|G\d{7,8}|TH\d{7,8}|S\d{7,8}|A\d{7,8}|L\d{7,8}|\d{9}|D\d+|1[4,5]\d{7})$/,
    carPlate: /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z]{1}[A-Z0-9]{4}[A-Z0-9挂学警港澳]{1}$/,
    chinese: /[\u4E00-\u9FA5]/,
    ipv4: /\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/,
    iplocal: /(^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.)/,
  };
};

u.reCommon = (key = "") => {
  key = key.toLowerCase();
  let exp = u.reCommonFast();
  let help = {
    g: "global match; find all matches rather than stopping after the first match",
    i: "ignore case; if u flag is also enabled, use Unicode case folding",
    m:
      "multiline; treat beginning and end characters (^ and $) as working over multiple lines (i.e., match the beginning or end of each line (delimited by \n or \r), not only the very beginning or end of the whole input string)",
    u: "Unicode; treat pattern as a sequence of Unicode code points",
    y:
      "sticky; matches only from the index indicated by the lastIndex property of this regular expression in the target string (and does not attempt to match from any later indexes).",
  };
  return key === "" ? { expression: exp, help: help } : exp[key];
};

/**
 * @return {string | null}
 */
u.refind = (sentence, regex) => {
  let result = new RegExp(regex).exec(sentence);
  return result ? result[0] : null;
};

/**
 * @return {[string] | null}
 */
u.refindall = (sentence, regex) => sentence.match(new RegExp(regex, "g"));

u.reSub = (sentence, regex, replacement, ignoreCase = true) => {
  regex = new RegExp(regex, ignoreCase ? "gi" : "g");
  return sentence.replace(regex, replacement);
};

u.regexOnlyMatchNext = (start, next) => new RegExp(`${new RegExp(start).source}(?=${new RegExp(next).source})`);

u.regexNotMatchNext = (start, next) => new RegExp(`${new RegExp(start).source}(?!${new RegExp(next).source})`);

u.regexOnlyMatchNextGetNext = (start, next) => new RegExp(`(?<=${new RegExp(start).source})${new RegExp(next).source}`);

u.regexNotMatchNextGetNext = (start, next) => new RegExp(`(?<!${new RegExp(start).source})${new RegExp(next).source}`);

u.regexBetweenOut = (start, end) => new RegExp(`(?<=${new RegExp(start).source})(.*)(?=${new RegExp(end).source})`);

u.regexBetweenOutNonGreedy = (start, end) =>
  new RegExp(`(?<=${new RegExp(start).source})(.*?)(?=${new RegExp(end).source})`);

u.regexBetweenIn = (start, end) => new RegExp(`${new RegExp(start).source}.*${new RegExp(end).source}`);

u.regexBetweenInNonGreedy = (start, end) => new RegExp(`${new RegExp(start).source}(.*?)${new RegExp(end).source}`);

u.stringReplace = (sentence, pairs = {}, recursive = true, all = true) => {
  if (recursive) {
    let temp = sentence;
    for (let i in pairs) sentence = sentence.replace(new RegExp(i, "g"), pairs[i]);
    if (sentence != temp) sentence = u.stringReplace(sentence, pairs, recursive);
  } else if (all) for (let i in pairs) sentence = sentence.replace(new RegExp(i, "g"), pairs[i]);
  else for (let i in pairs) sentence = sentence.replace(new RegExp(i), pairs[i]);
  return sentence;
};

u.stringToJson = (line) => {
  if (u.typeCheck(line, Object)) return line;
  return u.isBad(line) ? null : JSON.parse(line);
};

u.stringSymbolNormalize = (chinese) => {
  let pairs = {
    "：": ":",
    "；": ";",
    "‘": "'",
    "’": "'",
    "“": '"',
    "”": '"',
    "，": ",",
    "？": "?",
    "【": "[",
    "】": "]",
    "～": "~",
    "！": "!",
    "…": "...",
    "（": "(",
    "）": ")",
  };
  return u.stringReplace(chinese, pairs, true);
};

u.jsonToString = (map, space = "\t", circularCheck = false) => {
  if (u.isBad(map)) return null;
  if (u.typeCheck(map, "str")) return map;
  if (circularCheck) return jStringify(map, undefined, space);
  return JSON.stringify(map, undefined, space);
};

u.jsonSearchKey = (obj, key) => {
  let list = [];
  if (!obj) return list;
  if (obj instanceof Array) {
    for (var i in obj) list = list.concat(u.jsonSearchKey(obj[i], key));
    return list;
  }
  if (obj[key]) list.push(obj[key]);

  if (typeof obj === "object" && obj !== null) {
    let children = Object.keys(obj);
    if (children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        list = list.concat(u.jsonSearchKey(obj[children[i]], key));
      }
    }
  }
  return list;
};

u.deepCopy = (obj) => (u.typeCheck(obj, "arr") ? Array.from(obj) : Object.assign({}, obj));

u.fileExtension = (pathString) => u.refind(pathString, /(\.[^.]+)$/);

u.url = (url) => {
  if (u.refind(url, /^localhost/)) return "http://" + url;
  if (url == "about:blank") return "about:blank";
  if (/^\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(url)) return "http://" + url;
  return u.refind(url, "^http") ? url : u.refind(url, "^www") ? "https://" + url : "https://www." + url;
};

u.join = {};

u.join.arr1 = (arr1, arr2) => {
  return arr1.filter((item) => !u.contains(arr2, item));
};

u.join.arr2 = (arr1, arr2) => {
  return arr1.filter((item) => u.contains(arr2, item));
};

u.join.arr13 = (arr1, arr2) => {
  let same = u.join.arr2(arr1, arr2);
  return u.arrayAdd(arr1, arr2).filter((item) => !u.contains(same, item));
};

u.join.map1 = (map1, map2) => {
  map1 = u.deepCopy(map1);
  u.mapKeys(map1).map((i) => {
    if (u.equal(map1[i], map2[i])) delete map1[i];
  });
  return map1;
};

u.join.map2 = (map1, map2) => {
  map1 = u.deepCopy(map1);
  u.mapKeys(map1).map((i) => {
    if (!u.equal(map1[i], map2[i])) delete map1[i];
  });
  return map1;
};

u.join.map13 = (map1, map2) => {
  let same = u.join.map2(map1, map2);
  return u.join.map1(u.mapMerge(map1, map2), same);
};

// eslint-disable-next-line no-unused-vars
u.forReverse = (obj, callback = (item, index) => {}) => {
  for (let i = u.len(obj) - 1; i > -1; i--) callback(obj[i], i);
  return obj;
};

// eslint-disable-next-line no-unused-vars
u.forReversePromise = async (obj, callback = async (item, index) => {}) => {
  for (let i = u.len(obj) - 1; i > -1; i--) await callback(obj[i], i);
  return obj;
};

u.timeout = (func, after = 0, end = after + 15) => {
  let target = setTimeout(func, after * 1000);
  if (end > 0) setTimeout(() => clearTimeout(target), end * 1000);
};

u.timeoutRepeat = (func, everyXSec = 1, endTime) => {
  let target = setInterval(func, everyXSec * 1000);
  if (endTime) setTimeout(() => clearInterval(target), endTime * 1000);
};

u.timeoutRepeatTotal = (func, everyXSec = 1, totalExec) => {
  let target = setInterval(func, everyXSec * 1000);
  if (totalExec) setTimeout(() => clearInterval(target), totalExec * everyXSec * 1000);
};

/**
 * function will continue anyway, thus separate large functions
 */
u.timeoutReject = async (func, seconds = 30, errorMsg = "timeout reached") => {
  return Promise.race([async () => func(), u.promiseTimeout(() => {}, seconds).then(() => Promise.reject(errorMsg))]);
};

u.promisify = async (func, ...args) => await func(...args);

u.promiseTimeout = async (funcOrPromise, waitSeconds = 0) => {
  return new Promise((resolve) => u.timeout(() => resolve(funcOrPromise()), waitSeconds, -1));
};

u.promiseTryTimes = async (func, tryTimes = 3, tryIntervalSec = -1, logError = false) => {
  return new Promise((resolve) => resolve(func())).catch(async (error) => {
    if (logError) console.log(error);
    if (tryTimes === 0) return Promise.reject(error);
    await u.promiseTimeout(() => {}, tryIntervalSec);
    return u.promiseTryTimes(func, tryTimes - 1, tryIntervalSec);
  });
};

/**
 *
 * @param {(error,remain:number)=>{}} func
 */
u.promiseTryTimesInfo = async (func, tryTimes = 3, tryIntervalSec = -1, _error) => {
  return new Promise((resolve) => resolve(func(_error, tryTimes))).catch(async (error) => {
    if (tryTimes === 0) return Promise.reject(error);
    await u.promiseTimeout(() => {}, tryIntervalSec);
    return u.promiseTryTimesInfo(func, tryTimes - 1, tryIntervalSec, error);
  });
};

u.promiseInterval = async (innerFunc, catcher = () => {}, successWait = 3, errorWait = 5) => {
  return (async () => innerFunc())()
    .then(() => u.timeout(() => u.promiseInterval(innerFunc, catcher, successWait, errorWait), successWait))
    .catch(async (e) => {
      await catcher(e);
      return u.timeout(() => u.promiseInterval(innerFunc, catcher, successWait, errorWait), errorWait);
    });
};

u.promiseFastest = async (...promiseObjs) => {
  if (!u.isBad(promiseObjs) && u.typeCheck(promiseObjs, Promise)) promiseObjs = [promiseObjs];
  return Promise.race(promiseObjs);
};

u.promiseAllComplete = async (...promiseObjs) => {
  if (!u.isBad(promiseObjs) && u.typeCheck(promiseObjs, Promise)) promiseObjs = [promiseObjs];
  return Promise.all(promiseObjs);
};

u.promiseAllCompleteSafe = async (...promiseObjs) => {
  if (!u.isBad(promiseObjs) && u.typeCheck(promiseObjs, Promise)) promiseObjs = [promiseObjs];
  for (let i in promiseObjs) {
    promiseObjs[i] = promiseObjs[i].catch((error) => {
      console.log(`error_${i}`, error);
    });
  }
  return Promise.all(promiseObjs);
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
  if (!u.contains(url, "localhost") || url.toLowerCase() !== "about:blank") url = u.url(url);
  let param = {
    method,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 Safari/537.36",
    },
  };
  param.headers = u.mapMerge(param.headers, headers);
  param = u.mapMerge(param, fetchSettings);
  return fetch(url, param)
    .then(async (response) => {
      /** clone()/redirect()/arrayBuffer()/formData()/blob()/text()/json() **/
      let contentType = response.headers.get("content-type");
      let result =
        contentType && contentType.indexOf("application/json") !== -1 ? await response.json() : await response.text();
      if (response.status >= 400) return Promise.reject({ status: response.status, result });

      return {
        status: response.status,
        headers: response.headers,
        body: response.body,
        result,
      };
    })
    .catch(async (error) => {
      if (!error.status && !error.msg) {
        console.log(error);
        return Promise.reject({ status: 600, msg: "fetch error" });
      }
      if (retry > 0)
        return u.promiseTimeout(
          () => u.promiseFetchRaw(url, method, headers, fetchSettings, retry - 1, interval),
          interval
        );
      return Promise.reject(error);
    });
};

/**
 *
 * @param {headers} headers
 * @param {fetchOption} fetchSettings
 */
u.promiseFetchGet = async (url, headers = {}, fetchSettings = {}, retry = 1, interval = 1) => {
  return u.promiseFetchRaw(url, "GET", headers, fetchSettings, retry, interval).then((data) => data.result);
};

u._jsonToUri = (parameter = {}) => {
  if (u.typeCheck(parameter, "str")) return parameter;
  let result = "";
  for (let i in parameter) result += u.urlEncode(i) + "=" + u.urlEncode(parameter[i]) + "&";
  return result.slice(0, u.len(result) - 1);
};

/**
 *
 * @param {headers} headers
 * @param {fetchOption} fetchSettings
 */
u.promiseFetchPost = async (url, parameterURL = {}, headers = {}, fetchSettings = {}, retry = 1, interval = 1) => {
  fetchSettings = u.mapMerge(fetchSettings, { body: u.jsonToString(parameterURL) });
  return u.promiseFetchRaw(url, "POST", headers, fetchSettings, retry, interval).then((data) => data.result);
};

u.promiseFetchPostJson = async (url, parameter = {}) => {
  return u.promiseFetchPost(url, parameter, { "Content-Type": "application/json" });
};

u.promiseFetchPostXForm = async (url, parameter = {}) => {
  return u.promiseFetchPost(
    url,
    {},
    { "Content-Type": "application/x-www-form-urlencoded", body: u._jsonToUri(parameter) }
  );
};

u.promiseFetchPostFormMult = async (url, parameter = {}) => {
  return u.promiseFetchPost(url, parameter, { "Content-Type": "multipart/form-data" });
};

u.promiseFetchPostProbe = async (url, parameter = {}) => {
  return u.promiseAllCompleteSafe(
    u.promiseFetchPostJson(url, parameter),
    u.promiseFetchPostXForm(url, parameter),
    u.promiseFetchPostFormMult(url, parameter)
  );
};

u.serialize = (obj, unsafe = true, ignoreFunction = false) => serialize(obj, { unsafe, ignoreFunction, space: "\t" });

u.deserialize = (string) => eval("(" + string + ")");

module.exports = u;
