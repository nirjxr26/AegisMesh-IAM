const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  bold: '\x1b[1m'
};
const esc = '\x1b[';
const RED = esc + '31m';
const YELLOW = esc + '33m';
const CYAN = esc + '36m';
const GREEN = esc + '32m';
const BOLD = esc + '1m';
const RESET = esc + '0m';

function cleanFilePath(filePath) {
  return path.relative(process.cwd(), filePath).replace(/\\/g, '/');
}

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('#')) return;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.substring(1, val.length - 1);
        process.env[key] = val;
      }
    });
  }
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON response: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.end();
  });
}

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (['node_modules', '.git', '.vscode', 'dist', 'build', '.antigravitycli', 'backups', '.archive', '.gemini', '.sonarqube_report', 'coverage', 'ci', 'verification'].includes(f)) {
        return;
      }
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

function getPriority(severity) {
  switch (severity) {
    case 'BLOCKER':
    case 'CRITICAL':
      return 'P1';
    case 'MAJOR':
      return 'P2';
    case 'MINOR':
    case 'MEDIUM':
      return 'P3';
    case 'INFO':
    case 'LOW':
    default:
      return 'P4';
  }
}

module.exports = {
  COLORS, RED, YELLOW, CYAN, GREEN, BOLD, RESET,
  cleanFilePath, loadEnv, requestJson, walkDir, getPriority,
};
