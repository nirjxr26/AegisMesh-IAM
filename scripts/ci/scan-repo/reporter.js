const { RED, YELLOW, CYAN, GREEN, BOLD, RESET } = require('./utils');

function printResults(findings, scannedFileCount, filterFile) {
  const total = findings.length;
  const pCounts = { P1: 0, P2: 0, P3: 0, P4: 0 };
  const typeCounts = {};
  const fileCounts = {};

  findings.forEach(f => {
    pCounts[f.priority]++;
    typeCounts[f.type] = (typeCounts[f.type] || 0) + 1;
    fileCounts[f.file] = (fileCounts[f.file] || 0) + 1;
  });

  console.log('='.repeat(70));
  console.log(`${BOLD}                 SCAN COMPLETED: LIVE REPO FINDINGS                 ${RESET}`);
  console.log('='.repeat(70));
  console.log(`Scanned Files Matching Filter: ${scannedFileCount}`);
  console.log(`Total Findings:              ${total}`);
  console.log(`P1 (Immediate Action/Block): ${pCounts.P1 > 0 ? RED : GREEN}${pCounts.P1}${RESET}`);
  console.log(`P2 (Current Sprint Fix):     ${pCounts.P2 > 0 ? YELLOW : GREEN}${pCounts.P2}${RESET}`);
  console.log(`P3 (Weekly Triage/Smells):   ${pCounts.P3}`);
  console.log(`P4 (Low Priority/Info):      ${pCounts.P4}`);
  console.log('-'.repeat(70));

  if (total === 0) {
    console.log(`\n${GREEN}✨ No issues found! Clean scan.${RESET}`);
    console.log('='.repeat(70));
    return;
  }

  console.log(`\n${BOLD}[Findings by Type]${RESET}`);
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(` - ${type.padEnd(20)}: ${count}`);
  });

  console.log(`\n${BOLD}[Files with Issues]${RESET}`);
  Object.entries(fileCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([file, count], i) => {
      console.log(` ${i + 1}. ${file} (${count} findings)`);
    });

  if (filterFile) {
    console.log(`\n${BOLD}[Detailed Findings for Filtered Files]${RESET}`);
    const sorted = [...findings].sort(
      (a, b) => a.priority.localeCompare(b.priority) || a.line - b.line
    );
    sorted.forEach((f, i) => {
      let color;
      if (f.priority === 'P1') {
        color = RED;
      } else if (f.priority === 'P2') {
        color = YELLOW;
      } else {
        color = RESET;
      }
      console.log(` ${i + 1}. [${f.priority}] [${f.ruleId}] ${CYAN}${f.file}:L${f.line}${RESET}`);
      console.log(`    Message: ${color}${f.message}${RESET}`);
    });
  } else {
    printP1Details(findings);
    printP2Details(findings);
  }

  printHotspots(findings);

  console.log('='.repeat(70));
}

function printP1Details(findings) {
  console.log(`\n${BOLD}[P1 - Critical & Blocker Findings Details]${RESET}`);
  const p1s = findings.filter(f => f.priority === 'P1');
  if (p1s.length === 0) {
    console.log(`${GREEN} Excellent! No P1 (Blocker/Critical) issues found in the current codebase.${RESET}`);
    return;
  }
  p1s.forEach((f, i) => {
    console.log(` ${i + 1}. [${f.ruleId}] [${f.type}] ${CYAN}${f.file}:L${f.line}${RESET}`);
    console.log(`    Message: ${RED}${f.message}${RESET}`);
  });
}

function printP2Details(findings) {
  console.log(`\n${BOLD}[P2 - Major Findings Details (Showing first 10)]${RESET}`);
  const p2s = findings.filter(f => f.priority === 'P2');
  if (p2s.length === 0) {
    console.log(`${GREEN} No P2 (Major) issues found in the current codebase.${RESET}`);
    return;
  }
  p2s.slice(0, 10).forEach((f, i) => {
    console.log(` ${i + 1}. [${f.ruleId}] ${CYAN}${f.file}:L${f.line}${RESET}`);
    console.log(`    Message: ${YELLOW}${f.message}${RESET}`);
  });
  if (p2s.length > 10) {
    console.log(` ... and ${p2s.length - 10} more P2 findings.`);
  }
}

function printHotspots(findings) {
  console.log(`\n${BOLD}[Security Hotspots requiring Review]${RESET}`);
  const hotspots = findings.filter(f => f.type === 'SECURITY_HOTSPOT');
  if (hotspots.length === 0) {
    console.log(`${GREEN} No Security Hotspots found.${RESET}`);
    return;
  }
  hotspots.forEach((f, i) => {
    console.log(` ${i + 1}. [${f.ruleId}] [Prob: ${f.severity}] ${CYAN}${f.file}:L${f.line}${RESET}`);
    console.log(`    Message: ${f.message}`);
  });

  console.log('='.repeat(70));
}

module.exports = { printResults };
