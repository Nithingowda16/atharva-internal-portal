from PIL import Image
import numpy as np
from collections import deque

def manual_dilation(mask, iterations=2):
    res = mask.copy()
    h, w = mask.shape
    for _ in range(iterations):
        padded = np.pad(res, 1, mode='constant', constant_values=False)
        res = (padded[:-2, 1:-1] | padded[2:, 1:-1] | padded[1:-1, :-2] | padded[1:-1, 2:] | res)
    return res

def create_transparent_logo():
    src = Image.open('public/logo.png').convert('RGB')
    src_arr = np.array(src, dtype=np.float32)
    h, w, _ = src_arr.shape

    # 1. Flood-fill from borders to find outer white background
    is_outer_white = np.all(src_arr > 240, axis=2)
    visited = np.zeros((h, w), dtype=bool)
    bg_mask = np.zeros((h, w), dtype=bool)
    
    queue = deque()
    # Add all border pixels that are near white
    for x in range(w):
        for y in [0, h-1]:
            if is_outer_white[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((x, y))
    for y in range(h):
        for x in [0, w-1]:
            if is_outer_white[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((x, y))

    while queue:
        cx, cy = queue.popleft()
        bg_mask[cy, cx] = True
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx]:
                if is_outer_white[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((nx, ny))

    # 2. De-matting: Compute alpha and recover un-whitened foreground
    out_arr = np.zeros((h, w, 4), dtype=np.float32)
    out_arr[:, :, :3] = src_arr
    out_arr[:, :, 3] = 255.0

    # Outside flood-fill background is completely transparent
    out_arr[bg_mask, 3] = 0.0

    # Find edge pixels that neighbor the bg_mask
    dilated_bg = manual_dilation(bg_mask, iterations=2)
    edge_mask = dilated_bg & (~bg_mask)

    for y, x in np.argwhere(edge_mask):
        pixel = src_arr[y, x]
        # Measure whiteness: min(R, G, B) relative to 255
        whiteness = np.min(pixel) / 255.0
        
        # If whiteness is high (> 0.82), smoothly taper alpha down and subtract white
        if whiteness > 0.82:
            alpha = (1.0 - whiteness) / 0.18
            alpha = np.clip(alpha, 0.0, 1.0)
            if alpha > 0.02:
                # Recover true foreground color without white wash
                recovered_rgb = (pixel - (1.0 - alpha) * 255.0) / alpha
                out_arr[y, x, :3] = np.clip(recovered_rgb, 0, 255)
                out_arr[y, x, 3] = alpha * 255.0
            else:
                out_arr[y, x, 3] = 0.0

    result = Image.fromarray(np.uint8(np.round(out_arr)), mode='RGBA')
    
    # 3. Crop tightly to visible content bounding box
    bbox = result.getbbox()
    cropped = result.crop(bbox)
    
    # 4. Center onto square canvas with 8% optical padding
    cw, ch = cropped.size
    max_dim = max(cw, ch)
    canvas_size = int(max_dim * 1.16)
    
    square_img = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    offset_x = (canvas_size - cw) // 2
    offset_y = (canvas_size - ch) // 2
    square_img.paste(cropped, (offset_x, offset_y), cropped)
    
    # Resize to standard high-res square 512x512 with Lanczos resampling
    square_512 = square_img.resize((512, 512), Image.Resampling.LANCZOS)
    
    return result, square_512

tight_logo, square_logo = create_transparent_logo()
print("Success! Tight:", tight_logo.size, "Square:", square_logo.size)
