
import subprocess

def get_git_file(commit, path):
    result = subprocess.run(['git', 'show', f'{commit}:{path}'], capture_output=True)
    return result.stdout.decode('utf-8', errors='ignore')

content = get_git_file('2a8ef08', 'assets/css/pages/all-pages.css')
with open('original_all_pages.css', 'w', encoding='utf-8') as f:
    f.write(content)
