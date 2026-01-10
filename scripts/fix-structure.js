const fs = require('fs');
const path = require('path');

const coursesDir = 'e:/Craft soft/Website/courses';

// Get all course subdirectories
const courseFolders = fs.readdirSync(coursesDir).filter(f => {
    const fullPath = path.join(coursesDir, f);
    return fs.statSync(fullPath).isDirectory();
});

courseFolders.forEach(folder => {
    const indexPath = path.join(coursesDir, folder, 'index.html');
    if (fs.existsSync(indexPath)) {
        let content = fs.readFileSync(indexPath, 'utf8');

        // Remove the rogue </div> that appears alone on a line at the start (column 0)
        // This closes the container prematurely
        // Pattern: newline followed by </div> at the very start of the line (no indentation)
        // followed by something that looks like it's still part of the course content

        // Replace the pattern: </div> followed by course-cta-card or course-curriculum
        // which indicates the container was closed too early

        // First, remove rogue </div> lines that break the container
        const lines = content.split('\n');
        const fixedLines = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const nextLine = lines[i + 1] || '';

            // If this line is just </div> at column 0-1 and next line contains course-cta or course-curriculum
            // then this is a rogue closing div - skip it
            if ((line.trim() === '</div>' && line.indexOf('</div>') < 2) &&
                (nextLine.includes('course-cta-card') || nextLine.includes('course-curriculum'))) {
                console.log(`Removing rogue </div> at line ${i + 1} in ${folder}`);
                continue; // Skip this line
            }

            fixedLines.push(line);
        }

        const fixedContent = fixedLines.join('\n');

        if (content !== fixedContent) {
            fs.writeFileSync(indexPath, fixedContent, 'utf8');
            console.log(`Fixed: ${folder}/index.html`);
        } else {
            console.log(`No fixes needed: ${folder}/index.html`);
        }
    }
});

console.log('Structure fix complete!');
