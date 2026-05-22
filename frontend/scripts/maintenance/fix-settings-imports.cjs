const fs = require('fs');
const path = require('path');

const settingsDir = 'src/pages/settings';

const files = fs.readdirSync(settingsDir);

files.forEach((file) => {
    const full = path.join(settingsDir, file);
    if (!full.endsWith('.jsx')) return;

    let content = fs.readFileSync(full, 'utf8');

    content = content.replace(/from '\.\.\//g, "from '../../");
    content = content.replace(/from \"\.\.\//g, 'from "../../');

    fs.writeFileSync(full, content);
    console.log('Fixed imports in: ' + full);
});