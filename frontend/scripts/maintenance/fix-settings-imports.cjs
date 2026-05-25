const fs = require('node:fs');
const path = require('node:path');

const settingsDir = 'src/pages/settings';

const files = fs.readdirSync(settingsDir);

files.forEach((file) => {
    const full = path.join(settingsDir, file);
    if (!full.endsWith('.jsx')) return;

    let content = fs.readFileSync(full, 'utf8');

    const replacements = [
        [/from '\.\.\//g, "from '../../"],
        [/from "\.\.\//g, 'from "../../'],
    ];

    replacements.forEach(([pattern, replacement]) => {
        content = content.replaceAll(
            pattern,
            replacement
        );
    });
    fs.writeFileSync(full, content);
    console.log('Fixed imports in: ' + full);
});