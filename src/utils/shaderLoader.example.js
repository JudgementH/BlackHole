/**
 * Shader 加载器使用示例
 * 展示如何使用 ShaderLoader 类
 */

import { ShaderLoader, loadShader, loadShaderPair, loadShaders } from './shaderLoader.js';

// 示例 1: 使用默认实例加载单个 shader
async function example1() {
    try {
        const vertexCode = await loadShader('src/shaders/example.vert');
        console.log('加载的 vertex shader:', vertexCode);
    } catch (error) {
        console.error('加载失败:', error);
    }
}

// 示例 2: 批量加载多个 shader
async function example2() {
    const shaders = {
        vertex: 'src/shaders/example.vert',
        fragment: 'src/shaders/example.frag',
        compute: 'src/shaders/example.comp'
    };

    try {
        const loadedShaders = await loadShaders(shaders);
        console.log('批量加载结果:', loadedShaders);
    } catch (error) {
        console.error('批量加载失败:', error);
    }
}

// 示例 3: 加载 shader 对
async function example3() {
    try {
        const { vertex, fragment } = await loadShaderPair(
            'src/shaders/example.vert',
            'src/shaders/example.frag'
        );
        
        // 创建 Three.js 材质
        const material = new THREE.ShaderMaterial({
            vertexShader: vertex,
            fragmentShader: fragment,
            uniforms: {
                time: { value: 0 }
            }
        });
        
        console.log('材质创建成功:', material);
    } catch (error) {
        console.error('加载 shader 对失败:', error);
    }
}

// 示例 4: 使用自定义 ShaderLoader 实例
async function example4() {
    const customLoader = new ShaderLoader();
    
    try {
        // 加载 shader
        const shader = await customLoader.loadShader('src/shaders/example.vert');
        
        // 查看缓存信息
        console.log('缓存信息:', customLoader.getCacheInfo());
        
        // 清除缓存
        customLoader.clearCache();
        
    } catch (error) {
        console.error('自定义加载器失败:', error);
    }
}

// 示例 5: 在 Three.js 项目中的实际使用
async function createCustomMaterial() {
    try {
        // 加载 shader 文件
        const { vertex, fragment } = await loadShaderPair(
            'src/shaders/custom.vert',
            'src/shaders/custom.frag'
        );

        // 创建自定义材质
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                color: { value: new THREE.Color(1, 0, 0) }
            },
            vertexShader: vertex,
            fragmentShader: fragment,
            transparent: true
        });

        return material;
    } catch (error) {
        console.error('创建自定义材质失败:', error);
        // 返回默认材质作为回退
        return new THREE.MeshBasicMaterial({ color: 0xff0000 });
    }
}

// 导出示例函数
export {
    createCustomMaterial, example1,
    example2,
    example3,
    example4
};

