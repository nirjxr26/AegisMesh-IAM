const { cleanFilePath } = require('./utils');

const checkers = {
  js: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    check(content, filePath) {
      const findings = [];
      const lines = content.split(/\r?\n/);

      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();

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

        const lineWithoutRegex = trimmed.replace(/\/.*?\//g, '');
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

        const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?:\/[0-9]{1,2})?\b/g;
        let ipMatch;
        while ((ipMatch = ipRegex.exec(trimmed)) !== null) {
          const ip = ipMatch[0];
          const isTestFile = filePath.includes('test') || filePath.includes('fixture') || filePath.includes('seed');
          const isSafeIp = ['127.0.0.1', '0.0.0.0', '8.8.8.8', '1.1.1.1', '255.255.255.255'].includes(ip);
          const isUserAgent = trimmed.includes('Chrome/') || trimmed.includes('Mozilla/') || trimmed.includes('AppleWebKit/');
          const isIpBlock = ip.endsWith('.0.0.0') || ip.endsWith('.0.0');
          if (!isSafeIp && !isTestFile && !isUserAgent && !isIpBlock) {
            findings.push({
              ruleId: 'javascript:S1313',
              severity: 'MINOR',
              type: 'CODE_SMELL',
              line: lineNum,
              message: `Make sure using a hardcoded IP address ${ip} is safe here.`
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
      });

      const jsFuncRegex = /(?:(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(|([a-zA-Z0-9_$]+(?:\.[a-zA-Z0-9_$]+)*)\s*=\s*(?:async\s*)?(?:\((?:[^)]*)\)|[a-zA-Z0-9_$]+)\s*=>\s*\{)/g;
      let match;
      while ((match = jsFuncRegex.exec(content)) !== null) {
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

        const bodyWithoutRegex = body.replace(/\/.*?\//g, '');
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

      return findings;
    }
  },

  python: {
    extensions: ['.py'],
    check(content, filePath) {
      const findings = [];
      const lines = content.split(/\r?\n/);

      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();

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
      });

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s*)def\s+([a-zA-Z0-9_$]+)\s*\(/);
        if (match) {
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

      return findings;
    }
  },

  shell: {
    extensions: ['.sh'],
    check(content, filePath) {
      const findings = [];
      const lines = content.split(/\r?\n/);
      let inCase = false;
      let hasDefaultCase = false;
      let caseLine = 0;

      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();

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
          inCase = true;
          hasDefaultCase = false;
          caseLine = lineNum;
        }

        if (inCase) {
          if (trimmed.startsWith('*)')) hasDefaultCase = true;
          if (trimmed === 'esac') {
            if (!hasDefaultCase && caseLine > 0) {
              findings.push({
                ruleId: 'shell:S131',
                severity: 'CRITICAL',
                type: 'CODE_SMELL',
                line: caseLine,
                message: 'Add a default case (*) to handle unexpected values in case statements.'
              });
            }
            inCase = false;
          }
        }
      });
      return findings;
    }
  },

  k8s: {
    extensions: ['.yaml', '.yml'],
    check(content, filePath) {
      const cleanPath = cleanFilePath(filePath);
      if (!cleanPath.includes('k8s/') && !cleanPath.includes('manifests/')) return [];

      const findings = [];
      const lines = content.split(/\r?\n/);
      let inContainer = false;
      let hasResources = false;
      let containerLine = 0;
      let isK8sKind = false;

      for (const line of lines) {
        if (/^apiVersion:|^kind:/.test(line)) {
          isK8sKind = true;
          break;
        }
      }

      if (!isK8sKind) return [];

      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();

        if (trimmed.startsWith('- name:')) {
          if (inContainer && !hasResources && containerLine > 0) {
            findings.push({
              ruleId: 'kubernetes:S6864',
              severity: 'MAJOR',
              type: 'VULNERABILITY',
              line: containerLine,
              message: 'Specify memory/CPU request and limit limits for this container.'
            });
          }
          inContainer = true;
          hasResources = false;
          containerLine = lineNum;
        }

        if (inContainer) {
          if (trimmed.startsWith('resources:')) hasResources = true;
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

      if (inContainer && !hasResources && containerLine > 0) {
        findings.push({
          ruleId: 'kubernetes:S6864',
          severity: 'MAJOR',
          type: 'VULNERABILITY',
          line: containerLine,
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
      let hasUser = false;
      let lastUserLine = 0;
      let consecutiveRunCount = 0;

      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();

        if (trimmed.startsWith('#')) return;

        if (trimmed.startsWith('USER ')) {
          const user = trimmed.split('USER ')[1].trim();
          if (user !== 'root') hasUser = true;
          else hasUser = false;
          lastUserLine = lineNum;
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
          consecutiveRunCount++;
          if (consecutiveRunCount > 1) {
            findings.push({
              ruleId: 'docker:LayerCount',
              severity: 'MINOR',
              type: 'CODE_SMELL',
              line: lineNum,
              message: 'Consolidate consecutive RUN instructions to optimize image build times and reduce layer counts.'
            });
          }
        } else if (trimmed !== '' && !trimmed.endsWith('\\')) {
          consecutiveRunCount = 0;
        }
      });

      if (!hasUser) {
        findings.push({
          ruleId: 'docker:S6471',
          severity: 'MEDIUM',
          type: 'SECURITY_HOTSPOT',
          line: lastUserLine || 1,
          message: 'The Docker image runs with "root" as the default user. Make sure it is safe here.'
        });
      }

      return findings;
    }
  }
};

module.exports = { checkers };
