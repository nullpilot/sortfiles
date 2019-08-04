const fs = require("fs");
const path = require("path");
const d = require("dayjs");
const { readdir, mkdir, access, copyFile, rename, stat } = fs.promises;

const argv = require("./args");

let inputDir;
let outputDir;

let filesSkipped = 0;
let filesMoved = 0;

setConfig()
  .then(() => readdir(inputDir))
  .then(sortFiles)
  .then(moveFiles)
  .then(statusReport)
  .catch(err => {
    console.error(err.message || err);
  })

function setConfig() {
  switch(argv._.length) {
    case 0:
      inputDir = path.resolve("./");
      outputDir = path.resolve("./");
      break;
    case 1:
      inputDir = path.resolve("./");
      outputDir = path.resolve(argv._[0]);
      break;
    case 2:
      inputDir = path.resolve(argv._[0]);
      outputDir = path.resolve(argv._[1]);
      break;
    default:
      return Promise.reject(new Error("Too many arguments."));
  }

  return Promise.resolve();
}

function sortFiles(files) {
  return Promise.all(files.map(fileInfo));
}

function moveFiles(files) {
  return Promise.all(files.map(file => {
    return createDirectory(file.out)
      .then(moveFile.bind(null, file))
      .then(() => {
        if(file.skip) {
          // TODO: Put behind -v flag
          // console.log(`Skipping ${file.name}`);
          filesSkipped++;
        } else {
          filesMoved++;
        }
      })
  }));
}

function moveFile(file) {
  const oldPath = path.resolve(file.in, file.name);
  const newPath = path.resolve(file.out, file.outFile);

  return access(newPath).then(() => {
    file.skip = true;
  }, () => {
    if(argv.dry) {
      const mode = argv.copy ? "COPY" : "MOVE";
      console.log(mode, oldPath, "TO", newPath);
      return Promise.resolve();
    } else if(argv.copy) {
      return copyFile(oldPath, newPath, fs.constants.COPYFILE_EXCL);
    } else {
      return rename(oldPath, newPath);
    }
  });
}

function createDirectory(dir) {
  if(argv.dry) {
    return Promise.resolve();
  }

  return mkdir(dir, { recursive: true });
}

function fileInfo(file) {
  return stat(path.resolve(inputDir, file)).then(stats => {
    const time = Math.min(stats.ctimeMs, stats.mtimeMs, stats.atimeMs);
    const date = d(time);
    const tree = argv.tree.map(format => date.format(format));

    tree.unshift(outputDir);
    const target = path.resolve.apply(null, tree);
    let outFile;

    if(argv.prefix.length > 0) {
      outFile = `${date.format(argv.prefix)}${file}`;
    } else {
      outFile = file;
    }

    return { name: file, in: inputDir, out: target, outFile: outFile};
  });
}

function statusReport() {
  const action = argv.copy ? "Copied" : "Moved"
  console.log(`Finished. ${action} ${filesMoved} file(s). Skipped ${filesSkipped} file(s).`);
}
