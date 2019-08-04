const fs = require("fs");
const path = require("path");
const d = require("dayjs");
const term = require( 'terminal-kit' ).terminal;
const { readdir, mkdir, access, copyFile, rename, stat } = fs.promises;

const argv = require("./args");

let inputDir;
let outputDir;

let filesSkipped = 0;
let filesMoved = 0;

setConfig()
  .then(confirmAction)
  .then(() => readdir(inputDir))
  .then(sortFiles)
  .then(moveFiles)
  .then(statusReport)
  .then(term.processExit.bind(term))
  .catch(err => {
    console.error(err.message || err);
    term.processExit();
  });

function setConfig() {
  if(argv._.length === 2) {
    inputDir = path.resolve(argv._[0]);
    outputDir = path.resolve(argv._[1]);
  } else {
    return Promise.reject(new Error("Exactly two arguments expected: sortfiles [source] [target]"));
  }

  return Promise.resolve();
}

function confirmAction() {
  const action = argv.copy ? "Copy" : "Move";

  term.on("key", (name , matches , data ) => {
    if (name === "CTRL_C") {
      term.processExit()
    }
  });

  console.log(`${action} files from ${inputDir} to ${outputDir}? [y|N]`);
  
  return term.yesOrNo({ yes: [ 'y', 'yes' ] , no: [ 'n', 'ENTER' ] }).promise.then(res => {
    if(res) {
      return Promise.resolve();
    } else {
      return Promise.reject(new Error("Aborted."));
    }
  });
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
    let times = [stats.ctime, stats.mtime, stats.atime];

    if(stats.birthtimeMs > 0) {
      times.push(stats.birthtime);
    }

    const time = times.reduce((oldest, current) => {
      return oldest < current ? oldest : current;
    });

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
