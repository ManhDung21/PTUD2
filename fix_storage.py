import os
import glob

def replace_in_files():
    frontend_dir = os.path.join(os.getcwd(), 'frontend')
    # Recursively find all .tsx files
    tsx_files = glob.glob(os.path.join(frontend_dir, '**', '*.tsx'), recursive=True)
    
    for filepath in tsx_files:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if 'sessionStorage' in content:
            new_content = content.replace('sessionStorage', 'localStorage')
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filepath}")

if __name__ == "__main__":
    replace_in_files()
