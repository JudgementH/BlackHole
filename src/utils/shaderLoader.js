/**
 * Shader 加载工具
 * 用于异步加载和管理 shader 文件
 */

export class ShaderLoader {
    constructor() {
        this.cache = new Map(); // 缓存已加载的 shader
    }

    /**
     * 加载单个 shader 文件
     * @param {string} url - shader 文件路径
     * @returns {Promise<string>} shader 源码
     */
    async loadShader(url) {
        // 检查缓存
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`无法加载 shader 文件: ${url}, 状态码: ${response.status}`);
            }
            
            const shaderCode = await response.text();
            
            // 缓存结果
            this.cache.set(url, shaderCode);
            
            console.log(`✅ 成功加载 shader: ${url}`);
            return shaderCode;
        } catch (error) {
            console.error(`❌ 加载 shader 失败: ${url}`, error);
            throw error;
        }
    }

    /**
     * 批量加载多个 shader 文件
     * @param {Object} shaders - shader 配置对象，键为名称，值为文件路径
     * @returns {Promise<Object>} 包含所有 shader 源码的对象
     */
    async loadShaders(shaders) {
        const promises = Object.entries(shaders).map(async ([name, url]) => {
            try {
                const code = await this.loadShader(url);
                return [name, code];
            } catch (error) {
                console.error(`加载 shader "${name}" 失败:`, error);
                return [name, null];
            }
        });

        const results = await Promise.all(promises);
        return Object.fromEntries(results);
    }

    /**
     * 加载 vertex 和 fragment shader 对
     * @param {string} vertexUrl - vertex shader 文件路径
     * @param {string} fragmentUrl - fragment shader 文件路径
     * @returns {Promise<{vertex: string, fragment: string}>}
     */
    async loadShaderPair(vertexUrl, fragmentUrl) {
        const [vertex, fragment] = await Promise.all([
            this.loadShader(vertexUrl),
            this.loadShader(fragmentUrl)
        ]);

        return { vertex, fragment };
    }

    /**
     * 清除缓存
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Shader 缓存已清除');
    }

    /**
     * 获取缓存信息
     * @returns {Object} 缓存统计信息
     */
    getCacheInfo() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// 创建默认实例
export const shaderLoader = new ShaderLoader();

// 便捷函数
export const loadShader = (url) => shaderLoader.loadShader(url);
export const loadShaders = (shaders) => shaderLoader.loadShaders(shaders);
export const loadShaderPair = (vertexUrl, fragmentUrl) => shaderLoader.loadShaderPair(vertexUrl, fragmentUrl);
