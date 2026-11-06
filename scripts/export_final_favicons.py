import sys
sys.path.insert(0, '.')
from PIL import Image
from scripts.process_logo import create_transparent_logo

tight_logo, square_logo = create_transparent_logo()

# 1. Favicon .ico with 16x16, 32x32, 48x48 resolutions
square_logo.save(
    'public/favicon.ico',
    format='ICO',
    sizes=[(16, 16), (32, 32), (48, 48)]
)
print("Saved public/favicon.ico with multi-resolution 16x16, 32x32, 48x48")

# 2. Native App Router icon.png (512x512)
square_logo.save('src/app/icon.png', format='PNG', optimize=True)
print("Saved src/app/icon.png (512x512)")

# 3. Apple Touch Icon (180x180)
apple_icon = square_logo.resize((180, 180), Image.Resampling.LANCZOS)
apple_icon.save('src/app/apple-icon.png', format='PNG', optimize=True)
print("Saved src/app/apple-icon.png (180x180)")

# 4. Public icon.png (192x192)
pwa_icon = square_logo.resize((192, 192), Image.Resampling.LANCZOS)
pwa_icon.save('public/icon.png', format='PNG', optimize=True)
print("Saved public/icon.png (192x192)")

# 5. Public logo.png (transparent)
tight_logo.save('public/logo.png', format='PNG', optimize=True)
print("Saved public/logo.png (transparent tight aspect)")

# Clean up test files if any
import os
for f in ['scripts/test_dark_tab.png', 'scripts/test_white_tab.png', 'scripts/test_apple_tab.png']:
    if os.path.exists(f):
        os.remove(f)

print("All favicon and logo assets generated successfully with 100% transparent background!")

