// marks for this film's recordings, and for the two films it plays inside (office, spaces)
const fs = require("fs"), path = require("path");
const read = (dir) => Object.fromEntries(fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, "marks.json"))).map((d) => [d, JSON.parse(fs.readFileSync(path.join(dir, d, "marks.json"), "utf8"))]));
module.exports = () => ({
  intro: read(path.join(__dirname, "cap")),
  office: read(path.join(__dirname, "../../office-film/source/cap")),
  spaces: read(path.join(__dirname, "../../spaces-film/source/cap")),
});
