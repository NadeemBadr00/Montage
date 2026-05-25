import os
import time
import requests
from io import BytesIO
from PIL import Image
from rembg import remove
from duckduckgo_search import DDGS

animals = [
    "dog portrait looking at camera", "golden retriever face", "cute cat face portrait", 
    "fluffy kitten portrait", "lion face majestic", "tiger roaring portrait", 
    "elephant head frontal", "giraffe face portrait", "horse face portrait", 
    "panda bear portrait", "bald eagle face", "owl face portrait", 
    "wolf face portrait", "fox face portrait", "deer portrait", 
    "rabbit face portrait", "monkey face portrait", "gorilla portrait", 
    "zebra head portrait", "penguin standing", "dolphin jumping", 
    "shark fin", "turtle swimming", "parrot face portrait", "peacock showing feathers"
]

humans = [
    "portrait smiling young man white background", "portrait confident businesswoman", 
    "portrait happy girl student", "portrait handsome guy with glasses", 
    "portrait cute baby smiling", "portrait old man with beard", 
    "portrait stylish woman", "portrait boy playing", 
    "portrait girl laughing", "portrait man pointing finger", 
    "portrait woman giving thumbs up", "portrait shocked guy", 
    "portrait surprised woman", "portrait confused man", 
    "portrait happy family", "portrait young athlete runner", 
    "portrait chef in uniform", "portrait doctor with stethoscope", 
    "portrait construction worker", "portrait police officer", 
    "portrait firefighter", "portrait pilot", 
    "portrait musician playing guitar", "portrait singer holding mic", 
    "portrait dancer posing"
]

queries = [("animal", q) for q in animals] + [("human", q) for q in humans]
img_dir = os.path.join("public", "images")
os.makedirs(img_dir, exist_ok=True)

success_list = []

print(f"Starting to download and process {len(queries)} images...")
with DDGS() as ddgs:
    for idx, (ctype, q) in enumerate(queries):
        print(f"[{idx+1}/{len(queries)}] Searching: {q}")
        try:
            results = list(ddgs.images(q + " high quality isolated", region="wt-wt", safesearch="on", size="Medium", max_results=1))
            if not results:
                continue
            
            url = results[0]['image']
            resp = requests.get(url, timeout=10)
            if resp.status_code != 200:
                continue
            
            # Load image
            img = Image.open(BytesIO(resp.content)).convert("RGBA")
            
            # Resize if too large to speed up rembg
            img.thumbnail((800, 800))
            
            # Remove background
            output = remove(img)
            
            # Save
            filename = f"real_{ctype}_{idx}.png"
            filepath = os.path.join(img_dir, filename)
            output.save(filepath, format="PNG")
            
            success_list.append((filename, q.split()[1] + " " + q.split()[0].capitalize()))
            print(f"  -> Saved {filename}")
        except Exception as e:
            print(f"  -> Error: {e}")
        
        time.sleep(0.5) # Be gentle to APIs

print(f"Processed {len(success_list)} images successfully. Appending to templates...")

with open("src/assets/imageTemplates.ts", "r", encoding="utf-8") as f:
    content = f.read()

new_stickers = ""
for i, (filename, name) in enumerate(success_list):
    new_stickers += f"""
    {{
        "id": "img_real_{i}_{filename}",
        "name": "{name}",
        "type": "image",
        "src": "/images/{filename}",
        "duration": 5.0,
        "thumbnail": "/images/{filename}",
        "templateData": {{ "properties": {{ "scale": 60, "positionX": 0, "positionY": 0, "rotation": 0 }} }}
    }},"""

if "export const imageTemplates: Asset[] = [" in content:
    new_content = content.replace(
        "export const imageTemplates: Asset[] = [", 
        "export const imageTemplates: Asset[] = [\n" + new_stickers
    )
    with open("src/assets/imageTemplates.ts", "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"Successfully appended {len(success_list)} real stickers!")
else:
    print("Could not find array declaration.")
