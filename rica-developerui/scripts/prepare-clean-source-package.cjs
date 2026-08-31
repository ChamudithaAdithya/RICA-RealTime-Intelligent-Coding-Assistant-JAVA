const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const extensionRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(extensionRoot, "..");
const outputRoot = path.join(
  extensionRoot,
  "outputs",
  "final-submission",
  "RICA_Final_Submission_11553",
  "03_Source_Code"
);
const packageRoot = path.join(outputRoot, "RICA_Source_Code_Clean");
const zipPath = path.join(outputRoot, "RICA_Source_Code_Clean.zip");

const skipDirs = new Set([
  ".git",
  ".gradle",
  ".idea",
  ".rica",
  ".vscode-test",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "outputs",
  "target",
]);

const skipExts = new Set([
  ".class",
  ".jar",
  ".war",
  ".zip",
  ".vsix",
  ".docx",
  ".pptx",
  ".pdf",
  ".tmp",
]);

const skipFiles = new Set([".DS_Store", "Thumbs.db"]);

function shouldSkip(entryName, absolutePath) {
  if (skipDirs.has(entryName)) {
    return true;
  }

  if (skipFiles.has(entryName) || entryName.startsWith("~$") || entryName.startsWith("~WRL")) {
    return true;
  }

  if (skipExts.has(path.extname(entryName).toLowerCase())) {
    return true;
  }

  return absolutePath.startsWith(outputRoot);
}

function copyTree(source, destination) {
  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);

    if (shouldSkip(entry.name, from)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyTree(from, to);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
}

function writeReadme() {
  const readme = [
    "RICA Clean Source Code Package",
    "================================",
    "",
    "This package contains the RICA source code and controlled Java test projects.",
    "",
    "Excluded generated artifacts:",
    "- Java build output folders: target/",
    "- Compiled Java files: *.class",
    "- Node dependencies: node_modules/",
    "- Extension packages: *.vsix",
    "- Generated output/report packages",
    "",
    "Why these files are excluded:",
    "Generated class files and dependency folders are recreated by build/test commands.",
    "Keeping them out of the source ZIP prevents Windows path-length extraction errors.",
    "",
    "Useful commands:",
    "1. cd rica-developerui",
    "2. npm install",
    "3. npm run compile",
    "4. npm test",
    "5. npm run test:projects",
    "",
  ].join("\r\n");

  fs.writeFileSync(path.join(outputRoot, "README_SOURCE_PACKAGE.txt"), readme);
}

function zipPackage() {
  if (fs.existsSync(zipPath)) {
    fs.rmSync(zipPath, { force: true });
  }

  const command = [
    "Compress-Archive",
    "-LiteralPath",
    `'${packageRoot.replace(/'/g, "''")}'`,
    "-DestinationPath",
    `'${zipPath.replace(/'/g, "''")}'`,
    "-Force",
  ].join(" ");

  execFileSync("powershell.exe", ["-NoProfile", "-Command", command], { stdio: "inherit" });
}

function verifyPackage() {
  const files = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  walk(packageRoot);

  const forbidden = files.filter((file) => {
    const normalized = file.split(path.sep).join("/");
    return normalized.includes("/target/") || file.endsWith(".class") || normalized.includes("/node_modules/");
  });

  const longestPath = files.reduce((longest, file) => (file.length > longest.length ? file : longest), "");

  if (forbidden.length > 0) {
    throw new Error(`Forbidden generated artifacts found:\n${forbidden.slice(0, 10).join("\n")}`);
  }

  return {
    files: files.length,
    longestPathLength: longestPath.length,
    longestPath,
  };
}

fs.rmSync(packageRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });
copyTree(repoRoot, packageRoot);
writeReadme();
zipPackage();

const result = verifyPackage();
console.log(`[clean-source] Wrote ${zipPath}`);
console.log(`[clean-source] Files: ${result.files}`);
console.log(`[clean-source] Longest copied path length: ${result.longestPathLength}`);
console.log(`[clean-source] Longest copied path: ${result.longestPath}`);
