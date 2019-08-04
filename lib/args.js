const yargs = require("yargs")
const yaml = require("js-yaml");
const fs = require("fs");
 
// Get document, or throw exception on error

const argv = yargs
  .example("sortfiles --tree YYYY MM --copy --prefix \"YYYYMMDD-hhmmss\" input/ output/")
  .option("tree", {
    description: "date formatted directory tree to create",
    default: ["YYYY", "MM"]
  })
  .array("tree")
  .option("dry", {
    description: "output changes instead of making them",
    default: false
  })
  .boolean("dry")
  .option("copy", {
    description: "copy files instead of moving them",
    alias: "c",
    default: true
  })
  .boolean("copy")
  .option("prefix", {
    description: "date formatted prefix for file names",
    default: "",
    type: "string"
  })
  .config("config", "Path to YAML config file", loadConfig)
  .argv

module.exports = argv;

function loadConfig(file) {
  try {
    const data = fs.readFileSync("config.yml", "utf8");
    return yaml.safeLoad(data);
  } catch (e) {
    return e;
  }
}
