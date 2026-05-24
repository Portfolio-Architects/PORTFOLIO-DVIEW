from PIL import Image
import os
import glob

# Paths
public_dir = r"c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\public"

def process_image(filepath):
    try:
        img = Image.open(filepath)
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            print(f"Processing {filepath}")
            # Create a white background image
            bg = Image.new("RGBA", img.size, "WHITE")
            # Use img as mask if it has alpha channel
            mask = img if img.mode == 'RGBA' else None
            if img.mode == 'P' and 'transparency' in img.info:
                img = img.convert('RGBA')
                mask = img
            bg.paste(img, (0, 0), mask)
            
            # Save as RGBA PNG
            bg.save(filepath, format='PNG')
            print(f"Saved {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

# Process png files in public
for file in glob.glob(os.path.join(public_dir, "*.png")):
    process_image(file)

print("Done")
