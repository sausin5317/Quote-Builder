import fs from 'fs';
const filename = process.argv[2] || 'server.log';
console.log(`Reading ${filename}...`);
try {
    const content = fs.readFileSync(filename, 'utf16le');
    console.log(content.slice(0, 5000));
} catch (e) {
    try {
        const content = fs.readFileSync(filename, 'utf8');
        console.log(content.slice(0, 5000));
    } catch (e2) {
        console.error('Failed to read log:', e2.message);
    }
}
