import os

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

for i, line in enumerate(content.split('\n')):
    if 'hash' in line.lower() or 'location' in line.lower() or 'route' in line.lower() or 'active' in line.lower():
        if len(line.strip()) < 120:
            print(f"Line {i+1}: {line.strip()}")
