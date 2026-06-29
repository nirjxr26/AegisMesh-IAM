const { cleanFilePath } = require('./utils');

const SAFE_IPS = new Set([
  '127.0.0.1',
  '0.0.0.0',
  '8.8.8.8', // NOSONAR — Google Public DNS
  '1.1.1.1', // NOSONAR — Cloudflare DNS
  '255.255.255.255'
]);

function checkJsLine(trimmed, lineNum, filePath, findings) {
  if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

  if (/\bconsole\.log\(/.test(trimmed)) {
    findings.push({
      ruleId: 'jsS2228',
      severity: 'MINOR',
      type: 'CODE_SMELL',
      line: lineNum,
      message: 'Avoid leaving console.log in production code.'
    });
  }

  if (/\bwindow\.(sessionStorage|localStorage|location)\b/.test(trimmed)) {
    findings.push({
      ruleId: 'jsS7764',
      severity: 'MINOR',
      type: 'CODE_SMELL',
      line: lineNum,
      message: 'Prefer using globalThis over window.'
    });
  }

  const lineWithoutRegex = trimmed.replace(/\/[^/]*?\//g, '');
  const ternaryCount = (lineWithoutRegex.match(/(?<!\?)\?(?![.?])/g) || []).length;
  if (ternaryCount > 1) {
    findings.push({
      ruleId: 'javascript:S3358',
      severity: 'MAJOR',
      type: 'CODE_SMELL',
      line: lineNum,
      message: 'Extract this nested ternary operation into an independent statement.'
    });
  }

  const isTestFile = filePath.includes('test') || filePath.includes('fixture') || filePath.includes('seed');
  for (const ip of trimmed.matchAll(IP_REGEX)) {
    const ipVal = ip[0];
    const isSafeIp = SAFE_IPS.has(ipVal);
    const isUserAgent = trimmed.includes('Chrome/') || trimmed.includes('Mozilla/') || trimmed.includes('AppleWebKit/');
    const isIpBlock = ipVal.endsWith('.0.0.0') || ipVal.endsWith('.0.0');
    if (!isSafeIp && !isTestFile && !isUserAgent && !isIpBlock) {
      findings.push({
        ruleId: 'javascript:S1313',
        severity: 'MINOR',
        type: 'CODE_SMELL',
        line: lineNum,
        message: `Make sure using a hardcoded IP address ${ipVal} is safe here.`
      });
    }
  }

  const httpRegex = /http:\/\/[a-zA-Z0-9.\-_]+(?::\d+)?(?:\/[a-zA-Z0-9.\-_/]+)?/g;
  let httpMatch;
  while ((httpMatch = httpRegex.exec(trimmed)) !== null) {
    const url = httpMatch[0];
    const isExcluded = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('w3.org') || url.includes('xml') || url.includes('soap');
    if (!isExcluded) {
      findings.push({
        ruleId: 'javascript:S5332',
        severity: 'LOW',
        type: 'SECURITY_HOTSPOT',
        line: lineNum,
        message: `Using http protocol is insecure. Use https instead for: ${url}`
      });
    }
  }

  if (/\[0-9]/.test(trimmed)) {
    findings.push({
      ruleId: 'javascript:S6324',
      severity: 'MAJOR',
      type: 'CODE_SMELL',
      line: lineNum,
      message: 'Replace character class range [0-9] with digital shorthand \\d.'
    });
  }
}

const IP_REGEX = /(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?/g;
const JS_FUNC_REGEX = /(?:(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(|([a-zA-Z0-9_$]+(?:\.[a-zA-Z0-9_$]+)*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>\s*\{)/g;

function checkJsFunctionComplexity(content, findings) {
  let match;
  while ((match = JS_FUNC_REGEX.exec(content)) !== null) {
    const name = match[1] || match[2];
    const startIndex = match.index;
    let braceIndex = content.indexOf('{', startIndex);
    if (braceIndex === -1) continue;

    let braceCount = 1;
    let currentIndex = braceIndex + 1;
    while (braceCount > 0 && currentIndex < content.length) {
      if (content[currentIndex] === '{') braceCount++;
      else if (content[currentIndex] === '}') braceCount--;
      currentIndex++;
    }
    const body = content.substring(braceIndex, currentIndex);
    const lineNum = content.substring(0, startIndex).split('\n').length;

    const bodyWithoutRegex = body.replace(/\/[^/]*?\//g, '');
    const conditionals = (bodyWithoutRegex.match(/\bif\b|\bfor\b|\bwhile\b|\bcatch\b|\bswitch\b/g) || []).length;
    const operators = (bodyWithoutRegex.match(/&&|\|\|/g) || []).length;
    const ternaries = (bodyWithoutRegex.match(/(?<!\?)\?(?![.?])/g) || []).length;

    let nestingScore = 0;
    const bodyLines = body.split('\n');
    let currentDepth = 0;
    bodyLines.forEach(bl => {
      const openBraces = (bl.match(/\{/g) || []).length;
      const closeBraces = (bl.match(/\}/g) || []).length;
      currentDepth += openBraces - closeBraces;
      if (currentDepth > 2 && /\b(if|for|while|catch)\b/.test(bl)) {
        nestingScore += (currentDepth - 2);
      }
    });

    const complexity = conditionals + operators + ternaries + nestingScore;
    if (complexity > 15) {
      findings.push({
        ruleId: 'javascript:S3776',
        severity: 'MAJOR',
        type: 'CODE_SMELL',
        line: lineNum,
        message: `Refactor this function "${name}" to reduce its Cognitive Complexity from ${complexity} to the 15 allowed.`
      });
    }
  }
}

function checkPythonLine(trimmed, lineNum, findings) {
  if (trimmed.startsWith('#')) return;

  if (/(?:host|bind)\s*=\s*['"]0\.0\.0\.0['"]/.test(trimmed)) {
    findings.push({
      ruleId: 'python:S8392',
      severity: 'BLOCKER',
      type: 'VULNERABILITY',
      line: lineNum,
      message: 'Avoid binding the application to all network interfaces (0.0.0.0).'
    });
  }

  if (/except\s*:\s*$/.test(trimmed) || /except\s*:\s*#/.test(trimmed)) {
    findings.push({
      ruleId: 'python:S5754',
      severity: 'MAJOR',
      type: 'CODE_SMELL',
      line: lineNum,
      message: 'Avoid using bare except clauses; specify a concrete exception class.'
    });
  }

  if (/http:\/\/[a-zA-Z0-9.\-_]+/g.test(trimmed)) {
    findings.push({
      ruleId: 'python:S5332',
      severity: 'LOW',
      type: 'SECURITY_HOTSPOT',
      line: lineNum,
      message: 'Using http protocol is insecure. Use https instead.'
    });
  }
}

function checkPythonFunctionComplexity(lines, findings) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\s*)def\s+([a-zA-Z0-9_$]+)\s*\(/);
    if (!match) continue;

    const indent = match[1].length;
    const name = match[2];
    const funcLines = [];
    let j = i + 1;
    while (j < lines.length) {
      const nextLine = lines[j];
      if (nextLine.trim() !== '') {
        const nextIndent = nextLine.match(/^(\s*)/)[1].length;
        if (nextIndent <= indent) break;
      }
      funcLines.push(nextLine);
      j++;
    }
    const body = funcLines.join('\n');

    const conditionals = (body.match(/\bif\b|\bfor\b|\bwhile\b|\btry\b|\bexcept\b/g) || []).length;
    const operators = (body.match(/\band\b|\bor\b/g) || []).length;
    let nestingScore = 0;
    funcLines.forEach(fl => {
      if (fl.trim() === '') return;
      const flIndent = fl.match(/^(\s*)/)[0].length;
      const depth = Math.floor(flIndent / 4);
      if (depth > 2 && /\b(if|for|while|except)\b/.test(fl)) {
        nestingScore += (depth - 2);
      }
    });

    const complexity = conditionals + operators + nestingScore;
    if (complexity > 15) {
      findings.push({
        ruleId: 'python:S3776',
        severity: 'MAJOR',
        type: 'CODE_SMELL',
        line: i + 1,
        message: `Refactor this function "${name}" to reduce its Cognitive Complexity from ${complexity} to the 15 allowed.`
      });
    }
  }
}

function checkShellLine(trimmed, lineNum, findings, state) {
  if (trimmed.startsWith('#')) return;

  if (/\bif\s+\[\s/.test(trimmed) || /\belif\s+\[\s/.test(trimmed)) {
    findings.push({
      ruleId: 'shell:S7688',
      severity: 'MAJOR',
      type: 'CODE_SMELL',
      line: lineNum,
      message: "Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich."
    });
  }

  if (trimmed.startsWith('case ') && trimmed.endsWith(' in')) {
    state.inCase = true;
    state.hasDefaultCase = false;
    state.caseLine = lineNum;
  }

  if (state.inCase) {
    if (trimmed.startsWith('*)')) state.hasDefaultCase = true;
    if (trimmed === 'esac') {
      if (!state.hasDefaultCase && state.caseLine > 0) {
        findings.push({
          ruleId: 'shell:S131',
          severity: 'CRITICAL',
          type: 'CODE_SMELL',
          line: state.caseLine,
          message: 'Add a default case (*) to handle unexpected values in case statements.'
        });
      }
      state.inCase = false;
    }
  }
}

function checkK8sContainerLine(trimmed, lineNum, state, findings) {
  if (trimmed.startsWith('- name:')) {
    if (state.inContainer && !state.hasResources && state.containerLine > 0) {
      findings.push({
        ruleId: 'kubernetes:S6864',
        severity: 'MAJOR',
        type: 'VULNERABILITY',
        line: state.containerLine,
        message: 'Specify memory/CPU request and limit limits for this container.'
      });
    }
    state.inContainer = true;
    state.hasResources = false;
    state.containerLine = lineNum;
  }

  if (state.inContainer) {
    if (trimmed.startsWith('resources:')) state.hasResources = true;
    if (trimmed.startsWith('image:')) {
      const img = trimmed.split('image:')[1].trim();
      if (img.endsWith(':latest') || !img.includes(':')) {
        findings.push({
          ruleId: 'kubernetes:S6596',
          severity: 'MAJOR',
          type: 'CODE_SMELL',
          line: lineNum,
          message: 'Use a specific version tag for the image instead of "latest".'
        });
      }
    }
  }
}

function checkDockerLine(trimmed, lineNum, findings, state) {
  if (trimmed.startsWith('#')) return;

  if (trimmed.startsWith('USER ')) {
    const user = trimmed.split('USER ')[1].trim();
    state.hasUser = user !== 'root';
    state.lastUserLine = lineNum;
  }

  if (trimmed.startsWith('COPY . .') || trimmed.startsWith('ADD . .')) {
    findings.push({
      ruleId: 'docker:S6470',
      severity: 'MEDIUM',
      type: 'SECURITY_HOTSPOT',
      line: lineNum,
      message: 'Copying recursively might inadvertently add sensitive data to the container. Make sure it is safe here.'
    });
  }

  if (trimmed.startsWith('RUN ')) {
    state.consecutiveRunCount++;
    if (state.consecutiveRunCount > 1) {
      findings.push({
        ruleId: 'docker:LayerCount',
        severity: 'MINOR',
        type: 'CODE_SMELL',
        line: lineNum,
        message: 'Consolidate consecutive RUN instructions to optimize image build times and reduce layer counts.'
      });
    }
  } else if (trimmed !== '' && !trimmed.endsWith('\\')) {
    state.consecutiveRunCount = 0;
  }
}

const checkers = {
  js: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    check(content, filePath) {
      const findings = [];
      const lines = content.split(/\r?\n/);
      lines.forEach((line, index) => checkJsLine(line.trim(), index + 1, filePath, findings));
      checkJsFunctionComplexity(content, findings);
      return findings;
    }
  },

  python: {
    extensions: ['.py'],
    check(content, filePath) {
      const findings = [];
      const lines = content.split(/\r?\n/);
      lines.forEach((line, index) => checkPythonLine(line.trim(), index + 1, findings));
      checkPythonFunctionComplexity(lines, findings);
      return findings;
    }
  },

  shell: {
    extensions: ['.sh'],
    check(content, filePath) {
      const findings = [];
      const lines = content.split(/\r?\n/);
      const state = { inCase: false, hasDefaultCase: false, caseLine: 0 };
      lines.forEach((line, index) => checkShellLine(line.trim(), index + 1, findings, state));
      return findings;
    }
  },

  k8s: {
    extensions: ['.yaml', '.yml'],
    check(content, filePath) {
      const cleanPath = cleanFilePath(filePath);
      if (!cleanPath.includes('k8s/') && !cleanPath.includes('manifests/')) return [];

      const lines = content.split(/\r?\n/);
      const isK8sKind = lines.some(line => /^apiVersion:|^kind:/.test(line));
      if (!isK8sKind) return [];

      const findings = [];
      const containerState = { inContainer: false, hasResources: false, containerLine: 0 };

      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();
        checkK8sContainerLine(trimmed, lineNum, containerState, findings);

        if (trimmed.startsWith('automountServiceAccountToken:')) {
          const val = trimmed.split('automountServiceAccountToken:')[1].trim();
          if (val !== 'false') {
            findings.push({
              ruleId: 'kubernetes:S6865',
              severity: 'MAJOR',
              type: 'VULNERABILITY',
              line: lineNum,
              message: 'Bind this resource\'s automounted service account to RBAC or disable automounting.'
            });
          }
        }
      });

      if (containerState.inContainer && !containerState.hasResources && containerState.containerLine > 0) {
        findings.push({
          ruleId: 'kubernetes:S6864',
          severity: 'MAJOR',
          type: 'VULNERABILITY',
          line: containerState.containerLine,
          message: 'Specify memory/CPU request and limit limits for this container.'
        });
      }

      return findings;
    }
  },

  docker: {
    filenames: ['Dockerfile'],
    check(content, filePath) {
      const findings = [];
      const lines = content.split(/\r?\n/);
      const state = { hasUser: false, lastUserLine: 0, consecutiveRunCount: 0 };

      lines.forEach((line, index) => checkDockerLine(line.trim(), index + 1, findings, state));

      if (!state.hasUser) {
        findings.push({
          ruleId: 'docker:S6471',
          severity: 'MEDIUM',
          type: 'SECURITY_HOTSPOT',
          line: state.lastUserLine || 1,
          message: 'The Docker image runs with "root" as the default user. Make sure it is safe here.'
        });
      }

      return findings;
    }
  }
};

module.exports = { checkers };
