const fs = require('fs');
const path = require('path');

const coursesDir = 'e:/Craft soft/Website/courses';

// Get all course subdirectories
const courseFolders = fs.readdirSync(coursesDir).filter(f => {
    const fullPath = path.join(coursesDir, f);
    return fs.statSync(fullPath).isDirectory();
});

let totalFixed = 0;

courseFolders.forEach(folder => {
    const indexPath = path.join(coursesDir, folder, 'index.html');
    if (fs.existsSync(indexPath)) {
        let content = fs.readFileSync(indexPath, 'utf8');
        let modified = false;

        // 1. Fix Related Course Links (.html -> ../{folder}/)
        const linkPatterns = [
            ['graphic-design.html', '../graphic-design/'],
            ['full-stack.html', '../full-stack/'],
            ['resume-interview.html', '../resume-interview/'],
            ['ui-ux.html', '../ui-ux/'],
            ['spoken-english.html', '../spoken-english/'],
            ['soft-skills.html', '../soft-skills/'],
            ['python.html', '../python/'],
            ['devops.html', '../devops/'],
            ['aws.html', '../aws/'],
            ['data-analytics.html', '../data-analytics/'],
            ['java.html', '../java/'],
            ['react.html', '../react/'],
            ['azure.html', '../azure/'],
            ['salesforce.html', '../salesforce/'],
            ['dsa.html', '../dsa/'],
            ['git-github.html', '../git-github/'],
            ['automation-python.html', '../automation-python/'],
            ['python-programming.html', '../python-programming/'],
            ['handwriting.html', '../handwriting/'],
            ['devsecops.html', '../devsecops/']
        ];

        linkPatterns.forEach(([from, to]) => {
            if (content.includes(from)) {
                content = content.replace(new RegExp(from, 'g'), to);
                modified = true;
                console.log(`  Fixed link: ${from} -> ${to}`);
            }
        });

        // 2. Fix Intermediate icon - replace corrupted character with proper icon
        // Pattern: <h3> followed by any non-ASCII char or empty, then "Intermediate"
        const intermediatePattern = /<h3>[\s\u0080-\uffff]*Intermediate/g;
        if (intermediatePattern.test(content)) {
            content = content.replace(/<h3>[\s\u0080-\uffff]*Intermediate/g, '<h3><i class="fas fa-cogs"></i> Intermediate');
            modified = true;
            console.log(`  Fixed Intermediate icon`);
        }

        // 3. Fix RESUME uppercase to Resume (only in visible text, not URLs/meta)
        // Be careful not to change URLs
        if (folder === 'resume-interview') {
            // Fix in title
            content = content.replace(/>RESUME Writing/g, '>Resume Writing');
            content = content.replace(/>RESUME & Interview/g, '>Resume & Interview');
            content = content.replace(/>RESUME Review/g, '>Resume Review');
            // Fix in breadcrumb
            content = content.replace(/RESUME & Interview Prep<\/li>/g, 'Resume & Interview Prep</li>');

            if (content.includes('Resume')) {
                modified = true;
                console.log(`  Fixed RESUME -> Resume`);
            }
        }

        if (modified) {
            fs.writeFileSync(indexPath, content, 'utf8');
            console.log(`Fixed: ${folder}/index.html`);
            totalFixed++;
        } else {
            console.log(`No changes: ${folder}/index.html`);
        }
    }
});

console.log(`\nTotal files fixed: ${totalFixed}`);
