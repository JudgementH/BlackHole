/**
 * Shader Loader Utility
 * For async loading and managing shader files
 */

export class ShaderLoader {
    constructor() {
        this.cache = new Map(); // Cache for loaded shaders
    }

    /**
     * Load a single shader file
     * @param {string} url - Shader file path
     * @returns {Promise<string>} Shader source code
     */
    async loadShader(url) {
        // Check cache
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load shader file: ${url}, status: ${response.status}`);
            }
            
            const shaderCode = await response.text();
            
            // Cache result
            this.cache.set(url, shaderCode);
            
            console.log(`✅ Shader loaded successfully: ${url}`);
            return shaderCode;
        } catch (error) {
            console.error(`❌ Failed to load shader: ${url}`, error);
            throw error;
        }
    }

    /**
     * Load multiple shader files in batch
     * @param {Object} shaders - Shader config object, keys are names, values are file paths
     * @returns {Promise<Object>} Object containing all shader source code
     */
    async loadShaders(shaders) {
        const promises = Object.entries(shaders).map(async ([name, url]) => {
            try {
                const code = await this.loadShader(url);
                return [name, code];
            } catch (error) {
                console.error(`Failed to load shader "${name}":`, error);
                return [name, null];
            }
        });

        const results = await Promise.all(promises);
        return Object.fromEntries(results);
    }

    /**
     * Load vertex and fragment shader pair
     * @param {string} vertexUrl - Vertex shader file path
     * @param {string} fragmentUrl - Fragment shader file path
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
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Shader cache cleared');
    }

    /**
     * Get cache info
     * @returns {Object} Cache statistics
     */
    getCacheInfo() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Create default instance
export const shaderLoader = new ShaderLoader();

// Convenience functions
export const loadShader = (url) => shaderLoader.loadShader(url);
export const loadShaders = (shaders) => shaderLoader.loadShaders(shaders);
export const loadShaderPair = (vertexUrl, fragmentUrl) => shaderLoader.loadShaderPair(vertexUrl, fragmentUrl);
