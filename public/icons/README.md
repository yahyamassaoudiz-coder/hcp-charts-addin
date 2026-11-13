# Icons

The SVG files are placeholders. For production, convert them to PNG:

**Using Inkscape (CLI):**
```bash
for size in 16 32 64 80 128; do
  inkscape icon-${size}.svg -w ${size} -h ${size} -o icon-${size}.png
done
```

**Using ImageMagick:**
```bash
for size in 16 32 64 80 128; do
  convert icon-${size}.svg icon-${size}.png
done
```

**Online:** Use https://svgtopng.com or https://cloudconvert.com

The manifest.xml references PNG files. Either convert the SVGs
or update the manifest to use .svg extensions.
