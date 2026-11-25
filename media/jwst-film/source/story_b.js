
// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  nasa: ["NASA's own 3D model", "#9fd4ff", "every panel and strut"], gold: ["Gold-coated beryllium", "#ffd166", "18 hexagons"], sec: ["Secondary mirror", "#cfd6dd", "bounces the light back"],
  ir: ["Infrared light", "#ff8a3d", "the faint heat of the first galaxies"], hot: ["Sun side", "#ff8a3d", "hot"], coldL: ["Telescope side", "#6fd0ff", "below 50 K"],
  layers: ["5 layers", "#c98fb0", "each ~0.1 mm thick"], fairL: ["Rocket fairing", "#6fd0ff", "Webb folded inside"], wings: ["Mirror wings", "#ffd166", "unfold last"],
  shieldL: ["Sunshield", "#c98fb0", "unfolds sideways"], earthL: ["Earth", "#9fd4ff", "~1.5 million km away"], nearby: ["Your area", green, "a rough area, not your exact spot"],
  others: ["Outside the area", "#ff7a6d", "doesn't get it"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
hudEl("mstats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("MIRROR", "6.5 m", "#ffd166")}${card("SEGMENTS", "18")}${card("COATING", "GOLD", "#ffd166")}</div>`, { left: "0px", top: "1440px" });
hudEl("temps", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("TELESCOPE", "< 50 K", "#6fd0ff")}${card("THAT IS", "−223 °C", "#6fd0ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("launch", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("LAUNCH", "25 DEC 2021")}${card("ROCKET", "ARIANE 5", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("count", `<div style="width:1080px;text-align:center"><div id="cN" style="font:900 190px/0.9 D;font-stretch:112%;color:#fff;text-shadow:0 12px 50px rgba(0,0,0,.6)">0</div><div id="cL" style="font:800 38px D;letter-spacing:.12em;color:#ff8a3d;margin-top:6px">STEPS WITH NO BACKUP</div></div>`, { left: "0px", top: "200px" });
hudEl("far", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("DISTANCE", "1.5 million km", "#9fd4ff")}${card("REPAIRS", "NONE POSSIBLE", "#ff7a6d")}</div>`, { left: "0px", top: "1440px" });
hudEl("nm", `<div style="width:1080px;text-align:center"><div style="font:900 170px/0.9 D;font-stretch:112%;color:#ffd166;text-shadow:0 12px 50px rgba(0,0,0,.6)">50 nm</div><div style="font:800 36px D;letter-spacing:.12em;color:#fff;margin-top:6px">SEGMENTS LINED UP TO</div></div>`, { left: "0px", top: "210px" });
hudEl("sec", `<div style="width:1080px;text-align:center"><div style="display:inline-block;padding:16px 30px;border-radius:24px;background:rgba(8,10,16,.82);border:2px solid ${green};font:900 54px D;color:#fff">≈ 1 SECOND</div></div>`, { left: "0px", top: "250px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["NEARBY", "ROUGH AREA ONLY", "NO ACCOUNT"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("diag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">DEPLOYMENT SIMPLIFIED · TOOK ~2 WEEKS</div>`, { left: "195px", top: "1110px" });
