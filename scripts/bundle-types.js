import fs from 'fs';
import path from 'path';

const tempDir = './dist/types-temp/src';
const outputFile = './dist/types.d.ts';
const headerFile = './src/types.d.ts';
const esmFile = './dist/store2-deep.esm.js';

// Только эти файлы содержат публичные декларации функций
const publicTypeFiles = ['deepReactive.d.ts', 'raw.d.ts'];

function bundleTypes() {
    let finalContent = '';

    // 1. Заголовок с публичными интерфейсами
    if (fs.existsSync(headerFile)) {
        finalContent += fs.readFileSync(headerFile, 'utf8') + '\n';
    }

    // 2. Собираем только публичные файлы
    const allFiles = fs
        .readdirSync(tempDir, { recursive: true })
        .filter(file => file.endsWith('.d.ts') && path.basename(file) !== 'index.d.ts');

    const files = allFiles.filter(file => publicTypeFiles.includes(path.basename(file)));

    console.log(`Found ${files.length} public type files to bundle...`);

    files.forEach(file => {
        const filePath = path.join(tempDir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // Удаляем импорты и ре-экспорты
        content = content
            .replace(/^(import|export).*?from\s+['"].*?['"];?/gm, '')
            .replace(/import\(['"].*?['"]\)\./g, '')
            .trim();

        if (content) {
            finalContent += `\n/* From ${file} */\n` + content + '\n';
        }
    });

    // 3. Убираем лишние пустые строки и #private
    finalContent = finalContent.replace(/^\s*#private;/gm, '');
    finalContent = finalContent.replace(/\n{3,}/g, '\n\n');

    fs.writeFileSync(outputFile, finalContent);
    console.log(`Bundle created: ${outputFile}`);
}

function fixEsm() {
    let content = fs.readFileSync(esmFile, 'utf8');
    content = content.replace(/(\.\.\/)+types\.d\.ts/g, './types.d.ts');
    fs.writeFileSync(esmFile, content);
}

bundleTypes();
fixEsm();
