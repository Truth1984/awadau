var u = require("./index");
var tl2 = require("tl2");
var t = new tl2();

let reject = (location) => {
  throw new Error(location);
};

let sadd = (name, cb) => {
  t.add(name, () => cb(() => reject(name)));
};

let sp = (name) => t.add(name, () => {});

sadd("contain", async (r) => {
  if (!u.contains([1], 1)) return r();
  if (!u.contains({ 2: 3, 5: 6 }, { 2: 3 })) return r();
  if (!u.contains("casd", "sd")) return r();
  if (!u.contains("pls32", 32)) return r();
  if (!u.contains("324", "32")) return r();
  if (u.contains([13, 53], "13")) return r();
  if (u.contains([13, 53], ["13"])) return r();
  if (!u.contains([13, 53], 13)) return r();
  if (!u.contains([13, 53], [13])) return r();
  if (!u.contains({ ds: 12, bd: "wq" }, ["ds", "bd"])) return r();
  if (!u.contains({ ds: 12, bd: "wq" }, [12, "wq"])) return r();
  if (!u.contains({ ds: 12, bd: "wq" }, [12, "bd"])) return r();
  if (u.contains({ ds: 12, bd: "wq" }, ["12", "bd"])) return r();
  if (u.contains({ ds: 12, bd: "wq" }, ["ab", "wq"])) return r();
  if (!u.contains({ ds: 12, bd: "wq" }, { ds: 12 })) return r();
  if (u.contains({ ds: 12, bd: "wq" }, { ds: "wq" })) return r();
});

sadd("equal", async (r) => {
  if (!u.equal(1, 1)) return r();
  if (!u.equal([1], [1])) return r();
  if (!u.equal({ 1: "a" }, { 1: "a" })) return r();
  if (!u.equal({ b: 1, c: 3 }, { c: 3, b: 1 })) return r();
  if (!u.equal({ a: { b: "c" } }, { a: { b: "c" } })) return r();
  if (u.equal({ a: { b: "c" } }, { a: { b: { c: "" } } })) return r();
  if (u.equal({ a: 12 }, { a: "12" })) return r();
  if (u.equal({ 1: 1 }, [1])) return r();
  if (u.equal("1", [1])) return r();
  if (u.equal([1], ["1"])) return r();
  if (u.equal(["1", null], ["1,null"])) return r();
});

sadd("typeCheck", async (r) => {
  if (!u.typeCheck(Promise.resolve(), "promise")) return r();
  if (!u.typeCheck(12, "num")) return r();
  if (!u.typeCheck("das", "str")) return r();
  if (!u.typeCheck(true, "bool")) return r();
  if (u.typeCheck(1, "bool")) return r();
  if (u.typeCheck("true", "bool")) return r();
  if (!u.typeCheck(u.date(), "date")) return r();
  if (u.typeCheck(u.date(), "map")) return r();
  if (!u.typeCheck([21], "arr")) return r();
  if (u.typeCheck("33,12", "arr")) return r();
  if (!u.typeCheck({ a: 12 }, "map")) return r();
  if (!u.typeCheck(() => {}, "func")) return r();
});

sadd("len", async (r) => {
  if (u.len({ 1: 3, 2: 4 }) != 2) return r();
  if (u.len([1, 5, 3]) != 3) return r();
  if (u.len("dqd") != 3) return r();
  if (u.len(3241) != 4) return r();
  if (u.len(2.3) != -1) return r();
});

sadd("mapMergeDeep", async (r) => {
  if (
    !u.equal(u.mapMergeDeep({}, { a: { c: 5 } }, { a: { b: 12, c: 15 }, d: 8 }, { a: { b: 10 } }), {
      a: { b: 10, c: 15 },
      d: 8,
    })
  )
    return r();

  if (!u.equal(u.mapMergeDeep({ c: [1, 2, 3] }, { c: [4] }), { c: [4] })) return r();
  if (!u.equal(u.mapMergeDeep({ c: { a: 2 } }, { c: { b: 3 } }), { c: { a: 2, b: 3 } })) return r();
});

sp("sct", () => {});

sadd("stringCheckType (num) edge", async (r) => {
  if (!u.stringCheckType("123", "num")) return r();
  if (!u.stringCheckType("-12.34", "num")) return r();
  if (!u.stringCheckType("1e3", "num")) return r();
  if (u.stringCheckType("", "num")) return r();
  if (u.stringCheckType(" ", "num")) return r();
  if (u.stringCheckType("abc", "num")) return r();
  if (u.stringCheckType("NaN", "num")) return r();
  if (u.stringCheckType("1,000", "num")) return r();
});

sadd("stringCheckType (arr) edge", async (r) => {
  if (!u.stringCheckType("[]", "arr")) return r();
  if (!u.stringCheckType("[1,2,3]", "arr")) return r();
  if (!u.stringCheckType('["a","b"]', "arr")) return r();
  if (u.stringCheckType("", "arr")) return r();
  if (u.stringCheckType(" ", "arr")) return r();
  if (u.stringCheckType("not json", "arr")) return r();
  if (u.stringCheckType("{}", "arr")) return r();
  if (u.stringCheckType("[1,2,", "arr")) return r();
});

sadd("stringCheckType (obj) edge", async (r) => {
  if (!u.stringCheckType("{}", "obj")) return r();
  if (!u.stringCheckType('{"a":1}', "obj")) return r();
  if (!u.stringCheckType('{"nested":{"x":[1,2]}}', "obj")) return r();
  if (u.stringCheckType("", "obj")) return r();
  if (u.stringCheckType("not json", "obj")) return r();
  if (u.stringCheckType("{a: 1}", "obj")) return r();
  if (u.stringCheckType('{"a":}', "obj")) return r();
});

sadd("stringCheckType (bool) edge", async (r) => {
  if (!u.stringCheckType("true", "bool")) return r();
  if (!u.stringCheckType("false", "bool")) return r();
  if (u.stringCheckType("", "bool")) return r();
  if (u.stringCheckType(" ", "bool")) return r();
});

sadd("stringCheckType (date) edge", async (r) => {
  if (!u.stringCheckType("2020-01-01", "date")) return r();
  if (!u.stringCheckType("2020-01-01T00:00:00.000Z", "date")) return r();
  if (!u.stringCheckType("2024-02-29", "date")) return r();
  if (u.stringCheckType("", "date")) return r();
  if (u.stringCheckType("not-a-date", "date")) return r();
  if (u.stringCheckType("2020-13-01", "date")) return r();
  if (u.stringCheckType("2020-00-10", "date")) return r();
});

sp("sr");

sadd("stringReplace (all + recursive) edge", async (r) => {
  if (u.stringReplace("foo", { foo: "bar" }) !== "bar") return r();
  if (u.stringReplace("foo foo foo", { foo: "bar" }, false, false) !== "bar foo foo") return r();
  if (u.stringReplace("foo foo foo", { foo: "bar" }, false, true) !== "bar bar bar") return r();
  if (u.stringReplace("foo foo foo", { foo: "bar" }, true, false) !== "bar bar bar") return r();
  if (u.stringReplace("hello", { world: "x" }) !== "hello") return r();
  if (u.stringReplace("abc", {}) !== "abc") return r();
});

sadd("stringReplace (recursive chaining) edge", async (r) => {
  if (u.stringReplace("cat", { cat: "dog", dog: "cow" }, true, true) !== "cow") return r();
  if (u.stringReplace("cat", { cat: "dog", dog: "cow" }, false, true) == "dog") return r();
});

sadd("stringReplace (cycle breaks) edge", async (r) => {
  let out = u.stringReplace("a", { a: "b", b: "a" }, true, true);
  if (out !== "a" && out !== "b") return r();
});

u.log(t.runAuto("sr").then(() => "all test passed"));
