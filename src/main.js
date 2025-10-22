import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module';
import { loadShader, loadShaderPair } from './utils/shaderLoader.js';

const RADIUS = 1;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);


const quad = new THREE.PlaneGeometry(2, 2);

// 加载 shader 并创建黑洞

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

let renderedBlackhole = createTarget(innerWidth, innerHeight);

// 加载 shader 文件
const { vertex, fragment } = await loadShaderPair(
	'src/shaders/blackhole.vert',
	'src/shaders/blackhole.frag'
);

// 加载贴图
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

// 参数与 GUI
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

// 创建材质
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

// 创建黑洞球体
const blackhole = new THREE.Mesh(quad, blackHoleMaterial);
scene.add(blackhole);

camera.position.z = 3;

// Bloom pass
// Bloom targets (multi-level)
let bloomIterations = params.MAX_BLOOM_ITER;
let renderedDown = new Array(params.MAX_BLOOM_ITER).fill(null);
let renderedUp = new Array(params.MAX_BLOOM_ITER).fill(null);

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

// Bloom: Downsample
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

// Bloom: Upsample
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

// Bloom: Composite (base + bloom)
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


// Tonemapping pass
let renderedTonemap = createTarget(innerWidth, innerHeight);

// load tone mapping shader
const tonemappingShader = await loadShader('src/shaders/tonemapping.frag');
const tonemapMat = new THREE.RawShaderMaterial({
	vertexShader: `precision highp float;\nlayout(location=0) in vec3 position; out vec2 vUv; void main(){ vUv=(position.xy+1.0)*0.5; gl_Position=vec4(position,1.0); }`,
	fragmentShader: tonemappingShader,
	glslVersion: THREE.GLSL3,
	uniforms: {
		gamma: { value: 2.5 },
		tonemappingEnabled: { value: 1 },
		texture0: { value: renderedBlackhole.texture },
		resolution: { value: new THREE.Vector2(params.width, params.height) },
	},
	depthTest: false,
	depthWrite: false,
});
const meshTonemap = new THREE.Mesh(quad, tonemapMat);
const sceneTonemap = new THREE.Scene();
sceneTonemap.add(meshTonemap);


// GUI 控制
const gui = new GUI();
const g1 = gui.addFolder('Camera');
g1.add(params, 'fovScale', 0.1, 5.0, 0.01).name('fovScale').onChange((v) => {
	blackHoleMaterial.uniforms.fovScale.value = v;
});

const g2 = gui.addFolder('BlackHole');
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

const g3 = gui.addFolder('AccretionDisk');
g3.add(blackHoleMaterial.uniforms.accretionDisk, 'value').name('accretionDisk').min(0).max(1).step(1);
g3.add(blackHoleMaterial.uniforms.accretionDiskParticle, 'value').name('accretionDiskParticle').min(0).max(1).step(1);
g3.add(blackHoleMaterial.uniforms.accretionDiskHeight, 'value', 0.0, 1.0, 0.01).name('accretionDiskHeight');
g3.add(blackHoleMaterial.uniforms.accretionDiskLit, 'value', 0.0, 4.0, 0.01).name('accretionDiskLit');
g3.add(blackHoleMaterial.uniforms.accretionDiskDensityV, 'value', 0.0, 10.0, 0.01).name('accretionDiskDensityV');
g3.add(blackHoleMaterial.uniforms.accretionDiskDensityH, 'value', 0.0, 10.0, 0.01).name('accretionDiskDensityH');
g3.add(blackHoleMaterial.uniforms.accretionDiskNoiseScale, 'value', 0.0, 10.0, 0.01).name('accretionDiskNoiseScale');
g3.add(blackHoleMaterial.uniforms.accretionDiskNoiseLOD, 'value', 1.0, 12.0, 1.0).name('accretionDiskNoiseLOD');
g3.add(blackHoleMaterial.uniforms.accretionDiskSpeed, 'value', 0.0, 1.0, 0.01).name('accretionDiskSpeed');

const g4 = gui.addFolder('Bloom');
g4.add(params, 'MAX_BLOOM_ITER', 1, 12, 1).name('MAX_BLOOM_ITER').onChange((v) => {
	bloomIterations = Math.floor(v);
	// 重新创建bloom targets
	renderedDown.forEach(target => target?.dispose());
	renderedUp.forEach(target => target?.dispose());
	renderedDown = new Array(params.MAX_BLOOM_ITER).fill(null);
	renderedUp = new Array(params.MAX_BLOOM_ITER).fill(null);
	ensureBloomTargets(innerWidth, innerHeight);
});
g4.add(params, 'bloomStrength', 0.0, 2.0, 0.01).name('bloomStrength').onChange((v) => {
	compositeMat.uniforms.bloomStrength.value = v;
});

window.addEventListener('resize', () => {
	renderer.setSize(innerWidth, innerHeight);
	camera.aspect = innerWidth / innerHeight;
	camera.updateProjectionMatrix();
	renderedBlackhole.dispose();
	renderedBlackhole = createTarget(innerWidth, innerHeight);
	blackHoleMaterial.uniforms.resolution.value.set(innerWidth, innerHeight);

	// 重新创建bloom targets
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
	tonemapMat.uniforms.resolution.value.set(innerWidth, innerHeight);
	tonemapMat.uniforms.texture0.value = renderedBlackhole.texture;

});

const stats = new Stats();
document.body.appendChild(stats.dom);

function animate() {

	// update uniforms
	blackHoleMaterial.uniforms.time.value = performance.now() * 0.001;
	requestAnimationFrame(animate);


	renderer.setRenderTarget(renderedBlackhole);
	renderer.render(scene, camera);

	// 2) brightness threshold
	brightMat.uniforms.texture0.value = renderedBlackhole.texture;
	renderer.setRenderTarget(renderedBrightness);
	renderer.render(sceneBright, camera);

	// 3) downsample chain
	for (let level = 0; level < bloomIterations; level++) {
		const inputTex = (level === 0) ? renderedBrightness.texture : renderedDown[level - 1].texture;
		const tgt = renderedDown[level];
		downMat.uniforms.texture0.value = inputTex;
		downMat.uniforms.resolution.value.set(tgt.width, tgt.height);
		renderer.setRenderTarget(tgt);
		renderer.render(sceneDown, camera);
	}

	// 4) upsample chain
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

	// 5) composite base + bloom
	compositeMat.uniforms.texture0.value = renderedBlackhole.texture;
	compositeMat.uniforms.texture1.value = renderedUp[0].texture;
	renderer.setRenderTarget(renderedTonemap);
	renderer.render(sceneComposite, camera);

	// 6) tonemap to screen
	tonemapMat.uniforms.texture0.value = renderedTonemap.texture;
	renderer.setRenderTarget(null);
	renderer.render(sceneTonemap, camera);

	stats.update();
}

animate();
