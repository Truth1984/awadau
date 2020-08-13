var u = require("./index");
var tl2 = require("tl2");
var t = new tl2();

let reject = (location) => {
  throw new Error(location);
};

t.add("contain", async () => {
  let r = () => reject("contain");
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

t.add("equal", async () => {
  let r = () => reject("equal");
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

u.log(t.runAuto().then(() => "all test passed"));
