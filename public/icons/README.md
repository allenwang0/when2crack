# PWA Icons

This directory should contain the following icons for the PWA:

- `icon-192.png` - 192x192 PNG icon
- `icon-512.png` - 512x512 PNG icon

## Generating Icons

You can use a tool like [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator) or create them manually.

### Design Guidelines

- Use the When2Crack pink (#ff6b9d) as the primary color
- Include the app name or a simple "W2C" monogram
- Keep it minimal and recognizable at small sizes
- Ensure contrast against both light and dark backgrounds

### Quick Generation with ImageMagick

```bash
# Create a simple icon (requires ImageMagick)
convert -size 512x512 xc:#ff6b9d -gravity center -pointsize 200 -fill white -annotate +0+0 'W2C' icon-512.png
convert icon-512.png -resize 192x192 icon-192.png
```

Until proper icons are created, the PWA will use the default browser icon.
