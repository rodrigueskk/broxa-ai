
import re

def check_tags(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove strings to avoid counting tags inside strings
    content = re.sub(r"'(?:\\.|[^'])*'", "", content)
    content = re.sub(r'"(?:\\.|[^"])*"', "", content)
    content = re.sub(r"`(?:\\.|[^`])*`", "", content)
    
    # Remove comments
    content = re.sub(r'//.*', '', content)
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    
    opening_divs = len(re.findall(r'<div(?!\w)', content))
    closing_divs = len(re.findall(r'</div>', content))
    
    opening_motion_divs = len(re.findall(r'<motion\.div', content))
    closing_motion_divs = len(re.findall(r'</motion\.div>', content))
    
    opening_animate_presence = len(re.findall(r'<AnimatePresence', content))
    closing_animate_presence = len(re.findall(r'</AnimatePresence>', content))
    
    opening_braces = content.count('{')
    closing_braces = content.count('}')
    
    print(f"Opening divs: {opening_divs}")
    print(f"Closing divs: {closing_divs}")
    print(f"Opening motion.divs: {opening_motion_divs}")
    print(f"Closing motion.divs: {closing_motion_divs}")
    print(f"Opening AnimatePresence: {opening_animate_presence}")
    print(f"Closing AnimatePresence: {closing_animate_presence}")
    print(f"Opening braces: {opening_braces}")
    print(f"Closing braces: {closing_braces}")

if __name__ == "__main__":
    check_tags('src/pages/ChatPage.tsx')
