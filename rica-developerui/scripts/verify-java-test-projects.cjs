const { spawnSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const testProjectsRoot = path.resolve(repoRoot, '..', 'test-projects');

const projects = [
  { name: 'rica-clean', goal: 'test' },
  { name: 'rica-violations-heavy', goal: 'test' },
  { name: 'rica-structural', goal: 'test' },
];

let failed = false;

for (const project of projects) {
  const pom = path.join(testProjectsRoot, project.name, 'pom.xml');
  const mvnCommand = process.platform === 'win32' ? 'cmd.exe' : 'mvn';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'mvn', '-f', pom, project.goal]
    : ['-f', pom, project.goal];
  console.log(`\n=== Maven check: ${project.name} ===`);
  console.log(`mvn -f "${pom}" ${project.goal}`);

  const result = spawnSync(mvnCommand, args, {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    failed = true;
    console.error(`[verify-java-test-projects] ${project.name} failed with exit code ${result.status}.`);
  } else {
    console.log(`[verify-java-test-projects] ${project.name} passed.`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('\nAll Java test projects compile successfully.');
