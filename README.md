# BlackHole Renderer

A black hole physics renderer based on Three.js and WebGL, implementing gravitational lensing, accretion disk, and other physical effects.

**Live Demo**: [https://judgementh.github.io/BlackHole/](https://judgementh.github.io/BlackHole/)

## Demo

![Black Hole Rendering Demo](assets/demo.png)

## Project Structure

```
BlackHole/
├── index.html              # Main page
├── src/
│   ├── main.js             # Main entry point
│   ├── shaders/            # Shader files
│   │   ├── blackhole.vert  # Black hole vertex shader
│   │   ├── blackhole.frag  # Black hole fragment shader
│   │   ├── bloom_brightness.frag  # Bloom brightness extraction
│   │   ├── bloom_down.frag        # Bloom downsampling
│   │   ├── bloom_up.frag          # Bloom upsampling
│   │   ├── bloom_composite.frag   # Bloom composition
│   │   └── tonemapping.frag      # Tone mapping
│   └── utils/
│       └── shaderLoader.js # Shader loader utility
└── assets/                 # Asset files
    ├── color_map.png       # Color mapping texture
    └── skybox_nebula_dark/ # Skybox textures
        ├── back.png
        ├── bottom.png
        ├── front.png
        ├── left.png
        ├── right.png
        └── top.png
```

## Features

- **Black Hole Rendering**: Physically-based black hole visual effects
- **Gravitational Lensing**: Light bending effects
- **Accretion Disk**: Dynamic accretion disk rendering with noise and rotation
- **Bloom Effect**: Multi-level bloom post-processing
- **Tone Mapping**: ACES tone mapping algorithm
- **Real-time Controls**: GUI control panel for adjusting various parameters

## Usage

> ⚠️ **Note**: Due to ES modules (`type="module"`), you cannot open `index.html` directly by double-clicking (the `file://` protocol is blocked by browser CORS policy). You must run it through a local HTTP server.

1. Start a local server from the project root directory (choose one):
   - **Python 3**: `python -m http.server 8080`
   - **Node.js**: `npx serve` or `npx http-server`
2. Open `http://localhost:8080` (or the address shown in the terminal) in your browser
3. Use the GUI control panel on the right to adjust parameters:
   - **Camera**: Adjust field of view and zoom
   - **Black Hole**: Adjust step size, step count, gravitational lensing strength
   - **Accretion Disk**: Adjust various accretion disk parameters
   - **Bloom Effect**: Adjust bloom intensity and iteration count

## Technical Implementation

- **Three.js**: 3D rendering framework
- **WebGL**: Low-level graphics API
- **GLSL**: Shader language
- **lil-gui**: GUI control panel
- **Stats.js**: Performance monitoring

## Render Pipeline

1. **Black Hole Rendering**: Ray tracing algorithm for black hole and accretion disk
2. **Brightness Extraction**: Extract bright regions for bloom effect
3. **Bloom Processing**: Multi-level downsampling and upsampling
4. **Composition**: Composite base image with bloom effect
5. **Tone Mapping**: HDR to LDR conversion
6. **Output**: Final render to screen

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires a modern browser with WebGL 2.0 support.
