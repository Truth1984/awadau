var u = require("./index");
var tl2 = require("tl2");
var t = new tl2();

let reject = (location) => {
  throw new Error(location);
};

let sadd = (name, cb) => {
  t.add(name, () => cb(() => reject(name)));
};

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
  if (u.contains({ ds: 12, bd: "wq" }, [12, "bd"])) return r();
});

sadd("equal", async (r) => {
  if (!u.equal(1, 1)) return r();
  if (!u.equal([1], [1])) return r();
  if (!u.equal({ 1: "a" }, { 1: "a" })) return r();
  if (u.equal({ b: 1, c: 3 }, { c: 3, b: 1 })) return r(); // use contains
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

u.log(t.runAuto().then(() => "all test passed"));
