<p align="center">
  <img src="public/openscreen.png" alt="Ocal Screen Logo" width="80" />
</p>

<h1 align="center">Ocal Screen</h1>

<p align="center">
  <strong>A fork of the original OpenScreen — enhanced with better UI, theme support, accent colors, and a refined layout.</strong>
</p>

<p align="center">
  <a href="https://github.com/neelkanth-patel26/Ocal-Screen/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License" />
  </a>
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform" />
  <img src="https://img.shields.io/badge/Status-Active-brightgreen" alt="Status" />
  <a href="https://gamingnetworkstudio.vercel.app">
    <img src="https://img.shields.io/badge/Managed%20by-Gaming%20Network%20Studio%20Media%20Group-blueviolet" alt="Managed by Gaming Network Studio" />
  </a>
</p>

<p align="center">
  <img src="public/demo.png" alt="Ocal Screen Demo" width="80%" />
</p>

---

> [!NOTE]
> **This is a fork** of the original [OpenScreen](https://github.com/siddharthvaddem/openscreen) project by Siddharth Vaddem, which has been archived. This fork is actively maintained by **Gaming Network Studio Media Group** with improved UI, theming, and layout enhancements.

> [!IMPORTANT]
> Managed and maintained by **Gaming Network Studio Media Group**
> 🌐 [gamingnetworkstudio.vercel.app](https://gamingnetworkstudio.vercel.app)

---

## ✨ What's Different in This Fork

This fork preserves all core functionality from the original OpenScreen and adds:

- 🎨 **Dynamic Accent Color System** — Choose from Neon Lime, Electric Cyan, Sunset Orange, Emerald Green, Royal Purple, or Hot Pink
- 🌗 **Light & Dark Mode Support** — Full light/dark theming across all dialogs, modals, and popups
- 🖌️ **Redesigned UI** — Premium rounded components, glassmorphism cards, and refined layouts
- 👤 **User Profile & Settings Panel** — Set your display name, theme, accent color, and HUD layout from one place
- 🪟 **Consistent Styling** — Screen Picker, Export Dialog, Unsaved Changes, Auto-Captions, and Shortcuts dialogs all respect your chosen theme and accent color
- ⚡ **Real-time Preference Sync** — Theme and color changes apply instantly across all open windows

---

## 🧰 Core Features

- Record a specific window, or your whole screen
- Record microphone and system audio
- Webcam overlay with picture-in-picture, drag-to-position, mirroring, and shape options
- Auto or manual zooms with adjustable depth, duration, easing, and pixel-precise position
- Custom cursor size, smoothing, and click effects with cursor themes and path smoothing
- Automatic captions for voiceovers, generated on-device (works offline)
- Wallpapers, solid colors, gradients, or your own background image
- Motion blur
- Crop, trim, and per-segment speed control on the timeline
- Text, arrow, and image annotations with text animation presets
- Timeline snapping guides and audio waveform
- Customizable keyboard shortcuts
- Export to **MP4** or **GIF** in multiple aspect ratios and resolutions
- 13+ languages supported: Arabic, English, Spanish, French, Italian, Japanese, Korean, Portuguese (Brazil), Russian, Turkish, Vietnamese, Simplified Chinese, Traditional Chinese

---

## 📦 Installation

Download the latest installer for your platform from the [GitHub Releases](https://github.com/neelkanth-patel26/Ocal-Screen/releases) page.

### macOS

```bash
# Manual install via .dmg from Releases page
# After installation, run if Gatekeeper blocks the app:
xattr -rd com.apple.quarantine /Applications/OcalScreen.app
```

Grant permissions in **System Settings → Privacy & Security** for **Screen Recording** and **Accessibility**.

### Windows

Download the `.exe` installer from the [Releases page](https://github.com/neelkanth-patel26/Ocal-Screen/releases) and run it.

### Linux

Pick the package that matches your distro from [Releases](https://github.com/neelkanth-patel26/Ocal-Screen/releases):

**Debian / Ubuntu (`.deb`)**
```bash
sudo apt install ./OcalScreen-Linux-latest.deb
```

**Arch / Manjaro (`.pacman`)**
```bash
sudo pacman -U OcalScreen-Linux-latest.pacman
```

**Any distro (`.AppImage`)**
```bash
chmod +x OcalScreen-Linux-*.AppImage
./OcalScreen-Linux-*.AppImage
```

> [!NOTE]
> If the AppImage fails with a sandbox error: `./OcalScreen-Linux-*.AppImage --no-sandbox`

---

## 🛠️ Building from Source

```bash
# Clone the repository
git clone https://github.com/neelkanth-patel26/Ocal-Screen.git
cd Ocal-Screen

# Install dependencies
npm install

# Start in development mode
npm run dev

# Build for production
npm run build
```

---

## 🖥️ Platform Differences

| Feature | macOS | Windows | Linux |
|---------|-------|---------|-------|
| Native recording pipeline | ✅ ScreenCaptureKit | ✅ Windows Graphics Capture | ❌ Browser pipeline |
| Custom cursor capture | ✅ | ✅ | ⚠️ Position only |
| Webcam overlay | ✅ Native | ✅ Native | ✅ Browser |
| System audio | ✅ macOS 13+ | ✅ Out of the box | ⚠️ Requires PipeWire |

---

## 📝 Original Project

This is a fork of **[OpenScreen](https://github.com/siddharthvaddem/openscreen)** by Siddharth Vaddem.
The original project has been archived. This fork continues its development under the stewardship of **Gaming Network Studio Media Group**.

---

## 🏢 Maintained By

<p align="center">
  <strong>Gaming Network Studio Media Group</strong><br />
  <a href="https://gamingnetworkstudio.vercel.app">🌐 gamingnetworkstudio.vercel.app</a>
</p>

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE). By using this software, you agree that the authors are not liable for any issues, damages, or claims arising from its use.
