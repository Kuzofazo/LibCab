const fs = require('fs');
const path = require('path');

const targetDirs = [
    path.join(__dirname, 'web', 'src'),
    path.join(__dirname, 'web', 'prisma'),
    path.join(__dirname, 'web'),
    path.join(__dirname, 'mobile', 'app'),
    path.join(__dirname, 'mobile', 'components'),
    path.join(__dirname, 'mobile')
];

// We only process specific file extensions to avoid binary files.
const allowedExts = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.css', '.html'];
// Ignore these directories entirely
const ignoredDirs = ['node_modules', '.next', '.expo', 'dist', '.git'];

function processDirectory(directory) {
    if (!fs.existsSync(directory)) return;

    const files = fs.readdirSync(directory);
    for (const file of files) {
        if (ignoredDirs.includes(file)) continue;

        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else {
            const ext = path.extname(file).toLowerCase();
            // Process if it's an allowed extension, but we explicitly process important root files in 'web'/'mobile'
            if (allowedExts.includes(ext) || file === '.env' || file === 'app.json' || file === 'package.json') {
                try {
                    let content = fs.readFileSync(fullPath, 'utf8');
                    let newContent = content;

                    // Exclude specific files that shouldn't be touched regarding LibCab if needed.
                    // But here we want a global rename.
                    // Only replace if changes exist
                    const nameRegex1 = /LibCab/g;
                    const nameRegex2 = /libcab/g;
                    
                    if (nameRegex1.test(content) || nameRegex2.test(content)) {
                        newContent = content.replace(/LibCab/g, 'AfriCab').replace(/libcab/g, 'africab');
                        if (newContent !== content) {
                            fs.writeFileSync(fullPath, newContent, 'utf8');
                            console.log(`Updated: ${fullPath}`);
                        }
                    }
                } catch (e) {
                    console.error(`Error reading ${fullPath}:`, e.message);
                }
            }
        }
    }
}

targetDirs.forEach(dir => processDirectory(dir));

// Rename the logo files
const logoPathWeb = path.join(__dirname, 'web', 'public', 'libcab-logo.png');
const newLogoPathWeb = path.join(__dirname, 'web', 'public', 'africab-logo.png');

if (fs.existsSync(logoPathWeb)) {
    fs.renameSync(logoPathWeb, newLogoPathWeb);
    console.log(`Renamed logo in web/public`);
}

console.log("Renaming process complete.");
