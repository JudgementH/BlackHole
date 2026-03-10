/**
 * Black Hole Renderer - Main Program
 * Physically-based black hole rendering using Three.js and custom shaders
 */

import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module';
import { loadShader, loadShaderPair } from './utils/shaderLoader.js';


// Initialize Three.js core components
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// Full-screen quad geometry
const quad = new THREE.PlaneGeometry(2, 2);

// Load shaders and create black hole

/**
 * Create render target
 * @param {number} w - Width
 * @param {number} h - Height
 * @returns {THREE.WebGLRenderTarget} Render target
 */
function createTarget(w, h) {
    return new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        type: THREE.UnsignedByteType,
        format: THREE.RGBAFormat,
        depthBuffer: false,
        stencilBuffer: false,
    });
}

// Black hole render target
let renderedBlackhole = createTarget(innerWidth, innerHeight);

// Load shader files
const { vertex, fragment } = await loadShaderPair(
    'src/shaders/blackhole.vert',
    'src/shaders/blackhole.frag'
);

// Load textures
const loader = new THREE.TextureLoader();
const cubeLoader = new THREE.CubeTextureLoader();
const colorMapTex = loader.load('./assets/color_map.png');
const galaxyCubemap = cubeLoader.load([
    './assets/skybox_nebula_dark/right.png',
    './assets/skybox_nebula_dark/left.png',
    './assets/skybox_nebula_dark/top.png',
    './assets/skybox_nebula_dark/bottom.png',
    './assets/skybox_nebula_dark/front.png',
    './assets/skybox_nebula_dark/back.png',
]);

galaxyCubemap.colorSpace = THREE.SRGBColorSpace;
colorMapTex.colorSpace = THREE.SRGBColorSpace;

// Render parameters
const params = {
    STEP_SIZE: 0.1,
    N_STEP: 300,
    fovScale: 2,
    gravatationalLensing: 1.0,
    accretionDisk: 1.0,
    accretionDiskParticle: 1.0,
    accretionDiskInnerRadius: 2.6,
    accretionDiskOuterRadius: 12.0,
    accretionDiskHeight: 0.55,
    accretionDiskDensityV: 2.0,
    accretionDiskDensityH: 4.0,
    accretionDiskLit: 0.25,
    accretionDiskNoiseScale: 0.8,
    accretionDiskNoiseLOD: 5.0,
    accretionDiskSpeed: 0.5,
    MAX_BLOOM_ITER: 8,
    bloomStrength: 0.1,
};

// Create black hole material
const blackHoleMaterial = new THREE.ShaderMaterial({
    uniforms: {
        resolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
        time: { value: 0 },
        galaxy: { value: galaxyCubemap },
        colorMap: { value: colorMapTex },

        fovScale: { value: params.fovScale },
        gravatationalLensing: { value: params.gravatationalLensing },
        accretionDisk: { value: params.accretionDisk },
        accretionDiskParticle: { value: params.accretionDiskParticle },
        accretionDiskInnerRadius: { value: params.accretionDiskInnerRadius },
        accretionDiskOuterRadius: { value: params.accretionDiskOuterRadius },
        accretionDiskHeight: { value: params.accretionDiskHeight },
        accretionDiskDensityV: { value: params.accretionDiskDensityV },
        accretionDiskDensityH: { value: params.accretionDiskDensityH },
        accretionDiskLit: { value: params.accretionDiskLit },
        accretionDiskNoiseScale: { value: params.accretionDiskNoiseScale },
        accretionDiskNoiseLOD: { value: params.accretionDiskNoiseLOD },
        accretionDiskSpeed: { value: params.accretionDiskSpeed },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    defines: {
        STEP_SIZE: params.STEP_SIZE,
        N_STEP: params.N_STEP,
    },
});

// Create black hole mesh
const blackhole = new THREE.Mesh(quad, blackHoleMaterial);
scene.add(blackhole);

camera.position.z = 3;

// ==================== Bloom Post-processing ====================
// Bloom multi-level render targets
let bloomIterations = params.MAX_BLOOM_ITER;
let renderedDown = new Array(params.MAX_BLOOM_ITER).fill(null);
let renderedUp = new Array(params.MAX_BLOOM_ITER).fill(null);

/**
 * Ensure Bloom render targets are created
 * @param {number} w - Width
 * @param {number} h - Height
 */
function ensureBloomTargets(w, h) {
    for (let i = 0; i < params.MAX_BLOOM_ITER; i++) {
        const wDown = Math.max(1, w >> (i + 1));
        const hDown = Math.max(1, h >> (i + 1));
        const wUp = Math.max(1, w >> i);
        const hUp = Math.max(1, h >> i);
        if (renderedDown[i]) renderedDown[i].dispose();
        if (renderedUp[i]) renderedUp[i].dispose();
        renderedDown[i] = createTarget(wDown, hDown);
        renderedUp[i] = createTarget(wUp, hUp);
    }
}
ensureBloomTargets(innerWidth, innerHeight);

let renderedBrightness = createTarget(innerWidth, innerHeight);
const brightShader = await loadShader('src/shaders/bloom_brightness.frag');
const brightMat = new THREE.RawShaderMaterial({
    vertexShader: `precision highp float;\nlayout(location=0) in vec3 position; out vec2 vUv; void main(){ vUv=(position.xy+1.0)*0.5; gl_Position=vec4(position,1.0); }`,
    fragmentShader: brightShader,
    glslVersion: THREE.GLSL3,
    uniforms: {
        texture0: { value: renderedBlackhole.texture },
        resolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
    },
    depthTest: false,
    depthWrite: false,
});
const meshBright = new THREE.Mesh(quad, brightMat);
const sceneBright = new THREE.Scene();
sceneBright.add(meshBright);

// Bloom: Downsampling
const bloomDownShader = await loadShader('src/shaders/bloom_down.frag');
const downMat = new THREE.RawShaderMaterial({
    vertexShader: `precision highp float;\nlayout(location=0) in vec3 position; out vec2 vUv; void main(){ vUv=(position.xy+1.0)*0.5; gl_Position=vec4(position,1.0); }`,
    fragmentShader: bloomDownShader,
    glslVersion: THREE.GLSL3,
    uniforms: {
        texture0: { value: null },
        resolution: { value: new THREE.Vector2(1, 1) },
    },
    depthTest: false,
    depthWrite: false,
});
const meshDown = new THREE.Mesh(quad, downMat);
const sceneDown = new THREE.Scene();
sceneDown.add(meshDown);

// Bloom: Upsampling
const bloomUpShader = await loadShader('src/shaders/bloom_up.frag');
const upMat = new THREE.RawShaderMaterial({
    vertexShader: `precision highp float;\nlayout(location=0) in vec3 position; out vec2 vUv; void main(){ vUv=(position.xy+1.0)*0.5; gl_Position=vec4(position,1.0); }`,
    fragmentShader: bloomUpShader,
    glslVersion: THREE.GLSL3,
    uniforms: {
        texture0: { value: null },
        texture1: { value: null },
        resolution: { value: new THREE.Vector2(1, 1) },
    },
    depthTest: false,
    depthWrite: false,
});
const meshUp = new THREE.Mesh(quad, upMat);
const sceneUp = new THREE.Scene();
sceneUp.add(meshUp);

// Bloom: Composite (base image + bloom)
const bloomCompositeShader = await loadShader('src/shaders/bloom_composite.frag');
const compositeMat = new THREE.RawShaderMaterial({
    vertexShader: `precision highp float;\nlayout(location=0) in vec3 position; out vec2 vUv; void main(){ vUv=(position.xy+1.0)*0.5; gl_Position=vec4(position,1.0); }`,
    fragmentShader: bloomCompositeShader,
    glslVersion: THREE.GLSL3,
    uniforms: {
        tone: { value: 1.0 },
        bloomStrength: { value: params.bloomStrength },
        texture0: { value: renderedBlackhole.texture },
        texture1: { value: null },
        resolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
    },
    depthTest: false,
    depthWrite: false,
});
const meshComposite = new THREE.Mesh(quad, compositeMat);
const sceneComposite = new THREE.Scene();
sceneComposite.add(meshComposite);


// ==================== Tone Mapping Post-processing ====================
let renderedTonemap = createTarget(innerWidth, innerHeight);
let finalOutput = createTarget(innerWidth, innerHeight); // Final output render target

// Load tone mapping shader
const tonemappingShader = await loadShader('src/shaders/tonemapping.frag');
const tonemapMat = new THREE.RawShaderMaterial({
    vertexShader: `precision highp float;\nlayout(location=0) in vec3 position; out vec2 vUv; void main(){ vUv=(position.xy+1.0)*0.5; gl_Position=vec4(position,1.0); }`,
    fragmentShader: tonemappingShader,
    glslVersion: THREE.GLSL3,
    uniforms: {
        gamma: { value: 2.5 },
        tonemappingEnabled: { value: 1 },
        texture0: { value: renderedBlackhole.texture },
        resolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
    },
    depthTest: false,
    depthWrite: false,
});
const meshTonemap = new THREE.Mesh(quad, tonemapMat);
const sceneTonemap = new THREE.Scene();
sceneTonemap.add(meshTonemap);


// ==================== GUI Control Panel ====================
const gui = new GUI();
const g1 = gui.addFolder('Camera');
g1.add(params, 'fovScale', 0.1, 5.0, 0.01).name('fovScale').onChange((v) => {
    blackHoleMaterial.uniforms.fovScale.value = v;
});

const g2 = gui.addFolder('Black Hole');
g2.add(params, 'STEP_SIZE', 0.01, 1.0, 0.005).name('STEP_SIZE').onChange((v) => {
    blackHoleMaterial.defines.STEP_SIZE = v;
    blackHoleMaterial.needsUpdate = true;
});
g2.add(params, 'N_STEP', 1, 1000, 1).name('N_STEP').onChange((v) => {
    blackHoleMaterial.defines.N_STEP = Math.floor(v);
    blackHoleMaterial.needsUpdate = true;
});
g2.add(params, 'gravatationalLensing', 0.0, 1.0, 0.01).name('gravatationalLensing').onChange((v) => {
    blackHoleMaterial.uniforms.gravatationalLensing.value = v;
});

const g3 = gui.addFolder('Accretion Disk');
g3.add(blackHoleMaterial.uniforms.accretionDisk, 'value').name('accretionDisk').min(0).max(1).step(1);
g3.add(blackHoleMaterial.uniforms.accretionDiskParticle, 'value').name('accretionDiskParticle').min(0).max(1).step(1);
g3.add(blackHoleMaterial.uniforms.accretionDiskHeight, 'value', 0.0, 1.0, 0.01).name('accretionDiskHeight');
g3.add(blackHoleMaterial.uniforms.accretionDiskLit, 'value', 0.0, 4.0, 0.01).name('accretionDiskLit');
g3.add(blackHoleMaterial.uniforms.accretionDiskDensityV, 'value', 0.0, 10.0, 0.01).name('accretionDiskDensityV');
g3.add(blackHoleMaterial.uniforms.accretionDiskDensityH, 'value', 0.0, 10.0, 0.01).name('accretionDiskDensityH');
g3.add(blackHoleMaterial.uniforms.accretionDiskNoiseScale, 'value', 0.0, 10.0, 0.01).name('accretionDiskNoiseScale');
g3.add(blackHoleMaterial.uniforms.accretionDiskNoiseLOD, 'value', 1.0, 12.0, 1.0).name('accretionDiskNoiseLOD');
g3.add(blackHoleMaterial.uniforms.accretionDiskSpeed, 'value', 0.0, 1.0, 0.01).name('accretionDiskSpeed');

const g4 = gui.addFolder('Bloom Effect');
g4.add(params, 'MAX_BLOOM_ITER', 1, 12, 1).name('MAX_BLOOM_ITER').onChange((v) => {
    bloomIterations = Math.floor(v);
    // Recreate Bloom render targets
    renderedDown.forEach(target => target?.dispose());
    renderedUp.forEach(target => target?.dispose());
    renderedDown = new Array(params.MAX_BLOOM_ITER).fill(null);
    renderedUp = new Array(params.MAX_BLOOM_ITER).fill(null);
    ensureBloomTargets(innerWidth, innerHeight);
});
g4.add(params, 'bloomStrength', 0.0, 2.0, 0.01).name('bloomStrength').onChange((v) => {
    compositeMat.uniforms.bloomStrength.value = v;
});

// ==================== Save PNG Feature ====================
/**
 * Save current frame as PNG file
 */
function saveAsPNG() {
    // Create temporary canvas to read render result
    const canvas = document.createElement('canvas');
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const ctx = canvas.getContext('2d');
    
    // Read pixel data from WebGL renderer
    const imageData = ctx.createImageData(innerWidth, innerHeight);
    const pixels = new Uint8Array(innerWidth * innerHeight * 4);
    
    // Read pixel data from final output render target (includes full post-processing)
    renderer.readRenderTargetPixels(finalOutput, 0, 0, innerWidth, innerHeight, pixels);
    
    // Copy pixel data to ImageData
    imageData.data.set(pixels);
    
    // Draw ImageData to canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to PNG and download
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `blackhole_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 'image/png');
}

// Add save button to GUI
const g5 = gui.addFolder('Export');
g5.add({ savePNG: saveAsPNG }, 'savePNG').name('Save as PNG');

window.addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderedBlackhole.dispose();
    renderedBlackhole = createTarget(innerWidth, innerHeight);
    blackHoleMaterial.uniforms.resolution.value.set(innerWidth, innerHeight);

    // Recreate Bloom render targets
    renderedDown.forEach(target => target?.dispose());
    renderedUp.forEach(target => target?.dispose());
    renderedDown = new Array(params.MAX_BLOOM_ITER).fill(null);
    renderedUp = new Array(params.MAX_BLOOM_ITER).fill(null);
    ensureBloomTargets(innerWidth, innerHeight);

    renderedBrightness.dispose();
    renderedBrightness = createTarget(innerWidth, innerHeight);
    brightMat.uniforms.resolution.value.set(innerWidth, innerHeight);

    renderedTonemap.dispose();
    renderedTonemap = createTarget(innerWidth, innerHeight);
    finalOutput.dispose();
    finalOutput = createTarget(innerWidth, innerHeight);
    tonemapMat.uniforms.resolution.value.set(innerWidth, innerHeight);
    tonemapMat.uniforms.texture0.value = renderedBlackhole.texture;
});

const stats = new Stats();
document.body.appendChild(stats.dom);

/**
 * Main render loop
 */
function animate() {
    // Update time uniform
    blackHoleMaterial.uniforms.time.value = performance.now() * 0.001;
    requestAnimationFrame(animate);

    // 1) Render black hole to render target
    renderer.setRenderTarget(renderedBlackhole);
    renderer.render(scene, camera);

    // 2) Brightness threshold extraction
    brightMat.uniforms.texture0.value = renderedBlackhole.texture;
    renderer.setRenderTarget(renderedBrightness);
    renderer.render(sceneBright, camera);

    // 3) Bloom downsampling chain
    for (let level = 0; level < bloomIterations; level++) {
        const inputTex = (level === 0) ? renderedBrightness.texture : renderedDown[level - 1].texture;
        const tgt = renderedDown[level];
        downMat.uniforms.texture0.value = inputTex;
        downMat.uniforms.resolution.value.set(tgt.width, tgt.height);
        renderer.setRenderTarget(tgt);
        renderer.render(sceneDown, camera);
    }

    // 4) Bloom upsampling chain
    for (let level = bloomIterations - 1; level >= 0; level--) {
        const input0 = (level === bloomIterations - 1) ? renderedDown[level].texture : renderedUp[level + 1].texture;
        const input1 = (level === 0) ? renderedBrightness.texture : renderedDown[level - 1].texture;
        const tgt = renderedUp[level];
        upMat.uniforms.texture0.value = input0;
        upMat.uniforms.texture1.value = input1;
        upMat.uniforms.resolution.value.set(tgt.width, tgt.height);
        renderer.setRenderTarget(tgt);
        renderer.render(sceneUp, camera);
    }

    // 5) Composite base image and bloom
    compositeMat.uniforms.texture0.value = renderedBlackhole.texture;
    compositeMat.uniforms.texture1.value = renderedUp[0].texture;
    renderer.setRenderTarget(renderedTonemap);
    renderer.render(sceneComposite, camera);

    // 6) Tone mapping to final output
    tonemapMat.uniforms.texture0.value = renderedTonemap.texture;
    renderer.setRenderTarget(finalOutput);
    renderer.render(sceneTonemap, camera);
    
    // 7) Output to screen
    renderer.setRenderTarget(null);
    renderer.render(sceneTonemap, camera);

    // Update performance stats
    stats.update();
}

animate();
