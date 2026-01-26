# Icon Source Files

## Instructions

Place your original high-resolution PNG icons here with transparent backgrounds.

### Naming Convention

Use descriptive names for your icons:

- `pickaxe.png` - Mining pickaxe icon
- `helmet.png` - Safety helmet icon
- `shift.png` - Shift schedule icon
- etc.

### Requirements

- **Format:** PNG with transparent background
- **Resolution:** At least 2048×2048px (higher is fine, will be resized)
- **Quality:** High-resolution render from your 3D software

### What Happens Next

Once you place your icons here, run:

```bash
npm run process-icons
```

This will automatically:

1. Resize each icon to 3 versions (512×512, 1024×1024, 2048×2048)
2. Optimize file sizes
3. Place them in the correct folders (1x/, 2x/, 3x/)

### Example

If you place `pickaxe.png` here, it will create:

- `../1x/pickaxe.png` (512×512px)
- `../2x/pickaxe.png` (1024×1024px)
- `../3x/pickaxe.png` (2048×2048px)
