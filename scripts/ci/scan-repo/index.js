#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { loadEnv, requestJson, walkDir, getPriority, cleanFilePath, CYAN, RED, BOLD, RESET, GREEN } = require('./utils');
const { checkers } = require('./fileScanner');
const { printResults } = require('./reporter');

async function fetchSonarQubeIssues() {
  loadEnv();

  const token = process.env.SONAR_TOKEN;
  const host = process.env.SONAR_HOST_URL || process.env.SONAR_URL || 'https://sonarcloud.io';
  const projectKey = process.env.SONAR_PROJECT_KEY || process.env.SONAR_PROJECT || 'nirjxr26_AegisMesh-IAM';

  if (!token) {
    console.error(`${RED}Error: SONAR_TOKEN environment variable is not defined in your .env file.${RESET}`);
    console.log(`Please add 'SONAR_TOKEN=your_token_here' to your .env file.\n`);
    process.exit(1);
  }

  console.log(`${BOLD}Fetching live reports from SonarQube Server...${RESET}`);
  console.log(` Host:        ${host}`);
  console.log(` Project Key: ${projectKey}\n`);

  const authHeader = 'Basic ' + Buffer.from(token + ':').toString('base64');
  const options = {
    method: 'GET',
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json'
    }
  };

  try {
    const issuesUrl = `${host}/api/issues/search?componentKeys=${projectKey}&statuses=OPEN&ps=500`;
    console.log(`Requesting issues from: ${issuesUrl}`);
    const issuesData = await requestJson(issuesUrl, options);

    const hotspotsUrl = `${host}/api/hotspots/search?projectKey=${projectKey}&status=TO_REVIEW&ps=500`;
    console.log(`Requesting hotspots from: ${hotspotsUrl}`);
    const hotspotsData = await requestJson(hotspotsUrl, options);

    const reportDir = path.join(process.cwd(), '.sonarqube_report');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(path.join(reportDir, 'issues.json'), JSON.stringify(issuesData, null, 2), 'utf8');
    fs.writeFileSync(path.join(reportDir, 'hotspots.json'), JSON.stringify(hotspotsData, null, 2), 'utf8');

    console.log(`\n${GREEN}✔ Successfully saved reports to .sonarqube_report/issues.json and hotspots.json${RESET}\n`);
  } catch (err) {
    console.error(`\n${RED}Failed to fetch reports from SonarQube server: ${err.message}${RESET}\n`);
    process.exit(1);
  }
}

function parseFilterFile(args) {
  let fileIndex = args.indexOf('--file');
  if (fileIndex === -1) fileIndex = args.indexOf('--only');

  if (fileIndex !== -1 && fileIndex < args.length - 1) {
    return args[fileIndex + 1].trim().toLowerCase();
  }

  const trailingArgs = args.filter(a => !a.startsWith('--'));
  if (trailingArgs.length > 0) {
    return trailingArgs[0].trim().toLowerCase();
  }

  return null;
}

function processScannedFile(filePath, allFindings, filterFile) {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath);
  const cleanPath = cleanFilePath(filePath);

  if (basename === 'scan-repo.js' || basename === 'sonar-report.js' || basename === 'verify-grafana.js') {
    return 0;
  }

  if (filterFile) {
    const lowerPath = cleanPath.toLowerCase();
    const lowerBase = basename.toLowerCase();
    if (!lowerPath.includes(filterFile) && !lowerBase.includes(filterFile)) {
      return 0;
    }
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Warning: Could not read file ${cleanPath}: ${err.message}`);
    return 0;
  }

  for (const [, checker] of Object.entries(checkers)) {
    const matchExt = checker.extensions?.includes(ext);
    const matchName = checker.filenames?.includes(basename);

    if (matchExt || matchName) {
      const fileFindings = checker.check(content, filePath);
      fileFindings.forEach(f => {
        allFindings.push({
          ...f,
          file: cleanPath,
          priority: getPriority(f.severity)
        });
      });
    }
  }

  return 1;
}

async function runScanner() {
  const args = process.argv.slice(2);

  if (args.includes('--fetch-sonar')) {
    await fetchSonarQubeIssues();
  }

  console.log(`${BOLD}AegisMesh Codebase Security & Quality Scanner (Live Repo)${RESET}`);

  const filterFile = parseFilterFile(args);

  if (filterFile) {
    console.log(`Filtering scan results for files containing: "${CYAN}${filterFile}${RESET}"`);
  }
  console.log(`Starting scan of working directory...\n`);

  const allFindings = [];
  let scannedFileCount = 0;

  walkDir(process.cwd(), (filePath) => {
    scannedFileCount += processScannedFile(filePath, allFindings, filterFile);
  });

  printResults(allFindings, scannedFileCount, filterFile);
}

/* global require */
(async () => {
  await runScanner();
})().catch(err => {
  console.error(`${RED}Scanner error: ${err.message}${RESET}`);
  process.exit(1);
});
