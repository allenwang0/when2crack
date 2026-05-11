# App Icons Required

## Critical: PWA Install Broken Without These Icons

The audit found that PWA installation fails because icon files are missing. You need to add the following image files:

### Required Icons

1. **`/public/icon.jpg`** (192x192px minimum)
   - Used by: Header logo, auth page, PWA manifest
   - Format: JPG or PNG
   - Recommended: 512x512px for best quality
   - Should be your app logo/branding

2. **`/public/icons/icon-192.png`** (192x192px exact)
   - Used by: PWA manifest for "add to home screen"
   - Format: PNG with transparency
   - Standard Android icon size

3. **`/public/icons/icon-512.png`** (512x512px exact)
   - Used by: PWA manifest for splash screen
   - Format: PNG with transparency
   - Standard iOS/Android icon size

### Current References

The following files reference these icons:
- `app/layout.tsx:44` - Header logo
- `app/page.tsx:52` - Auth page logo
- `app/(app)/layout.tsx:43` - App header logo
- `public/manifest.json:10-22` - PWA icons array

### How to Generate Icons

**Option 1: Use a logo generator**
1. Visit https://realfavicongenerator.net/ or similar
2. Upload your logo
3. Generate all sizes
4. Download and place in correct folders

**Option 2: Use design software**
1. Create a 512x512px design in Figma/Photoshop
2. Design should work at small sizes (will be shown at 48x48px often)
3. Export as PNG with transparency
4. Resize to 192x192px for smaller version
5. Convert one to JPG for the main icon.jpg

**Option 3: Use AI generation**
1. Use DALL-E, Midjourney, or similar
2. Prompt: "app icon for dating app called When2Crack, simple, modern, yellow and pink colors, clean design"
3. Export at 1024x1024px, then resize

### Quick Fix (Placeholder)

If you need to launch immediately, create a simple placeholder:
```bash
# Create a solid color placeholder (requires ImageMagick)
convert -size 512x512 xc:'#FFD93D' /Users/allenwang/Desktop/when2crack/public/icons/icon-512.png
convert -size 192x192 xc:'#FFD93D' /Users/allenwang/Desktop/when2crack/public/icons/icon-192.png
convert -size 512x512 xc:'#FFD93D' /Users/allenwang/Desktop/when2crack/public/icon.jpg
```

### Recommended Design

Based on the app's theme:
- **Colors:** Yellow (#FFD93D), Pink (#FFB6D9), Purple (#E4C1F9)
- **Style:** Modern, playful, dating-app vibes
- **Icon:** Could be:
  - A stylized "W2C" monogram
  - A calendar + heart icon
  - A lightning bolt (matches tonight feature)
  - An egg (matches color theme)
- **Background:** Solid color or gradient
- **Text:** Avoid small text (won't be readable at small sizes)

### After Adding Icons

1. Test PWA install on mobile (Chrome Android or Safari iOS)
2. Check that header logos display correctly
3. Verify manifest.json references correct paths
4. Clear browser cache to see new icons

### Priority

**SHOWSTOPPER** - App cannot be installed as PWA without these icons. Complete this before production launch.
