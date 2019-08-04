const fs = require("fs");
const path = require("path");
const d = require("dayjs");
const { readdir, mkdir, access, copyFile, rename, stat } = fs.promises;

const inputDir = path.resolve("input/");
const outputDir = path.resolve("output/");
const copyMode = true;

let filesSkipped = 0;
let filesMoved = 0;

console.log(inputDir, outputDir);

readdir(inputDir)
  .then(sortFiles)
  .then(moveFiles)
  .then(statusReport)

function statusReport() {
  console.log(`Finished. Moved ${filesMoved} file(s). Skipped ${filesSkipped} file(s).`);
}

function moveFiles(files) {
  return Promise.all(files.map(file => {
    return createDirectory(file.out)
      .then(moveFile.bind(null, file))
      .then(() => {
        if(file.skip) {
          console.log(`Skipping ${file.name}`);
          filesSkipped++;
        } else {
          filesMoved++;
        }
      })
  }));
}

function moveFile(file) {
  const oldPath = path.resolve(file.in, file.name);
  const newPath = path.resolve(file.out, file.name);

  return access(newPath).then(() => {
    file.skip = true;
  }, () => {
    if(copyMode) {
      return copyFile(oldPath, newPath, fs.constants.COPYFILE_EXCL);
    } else {
      return rename(oldPath, newPath);
    }
  });
}

function createDirectory(dir) {
  return mkdir(dir, { recursive: true });
}

function sortFiles(files) {
  return Promise.all(files.map(fileInfo));
}

function fileInfo(file) {
  return stat(path.resolve(inputDir, file)).then(stats => {
    const time = Math.min(stats.ctimeMs, stats.mtimeMs, stats.atimeMs);
    const date = d(time);
    const year = date.format("YYYY");
    const month = date.format("MM");
    const target = path.resolve(outputDir, year, month);

    return { name: file, in: inputDir, out: target };
  });
}
