# Shader 加载器

一个用于 Three.js 项目的 shader 文件加载工具，支持异步加载、缓存管理和错误处理。

## 功能特性

- ✅ 异步加载 shader 文件
- ✅ 自动缓存管理
- ✅ 批量加载支持
- ✅ 错误处理和回退机制
- ✅ TypeScript 友好的 API
- ✅ 支持 shader 对加载

## 基本用法

### 1. 导入模块

```javascript
import { loadShader, loadShaders, loadShaderPair, ShaderLoader } from './utils/shaderLoader.js';
```

### 2. 加载单个 shader

```javascript
try {
    const vertexCode = await loadShader('src/shaders/example.vert');
    console.log('加载成功:', vertexCode);
} catch (error) {
    console.error('加载失败:', error);
}
```

### 3. 批量加载多个 shader

```javascript
const shaders = {
    vertex: 'src/shaders/example.vert',
    fragment: 'src/shaders/example.frag'
};

const loadedShaders = await loadShaders(shaders);
console.log(loadedShaders.vertex); // vertex shader 代码
console.log(loadedShaders.fragment); // fragment shader 代码
```

### 4. 加载 shader 对

```javascript
const { vertex, fragment } = await loadShaderPair(
    'src/shaders/example.vert',
    'src/shaders/example.frag'
);

const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
        time: { value: 0 }
    }
});
```

## API 参考

### ShaderLoader 类

#### 构造函数
```javascript
const loader = new ShaderLoader();
```

#### 方法

##### `loadShader(url)`
加载单个 shader 文件
- **参数**: `url` (string) - shader 文件路径
- **返回**: `Promise<string>` - shader 源码

##### `loadShaders(shaders)`
批量加载多个 shader 文件
- **参数**: `shaders` (Object) - 键值对对象，键为名称，值为文件路径
- **返回**: `Promise<Object>` - 包含所有 shader 源码的对象

##### `loadShaderPair(vertexUrl, fragmentUrl)`
加载 vertex 和 fragment shader 对
- **参数**: 
  - `vertexUrl` (string) - vertex shader 文件路径
  - `fragmentUrl` (string) - fragment shader 文件路径
- **返回**: `Promise<{vertex: string, fragment: string}>`

##### `clearCache()`
清除所有缓存

##### `getCacheInfo()`
获取缓存信息
- **返回**: `{size: number, keys: string[]}`

### 便捷函数

- `loadShader(url)` - 使用默认实例加载单个 shader
- `loadShaders(shaders)` - 使用默认实例批量加载
- `loadShaderPair(vertexUrl, fragmentUrl)` - 使用默认实例加载 shader 对

## 实际使用示例

### 在 Three.js 项目中使用

```javascript
import * as THREE from 'three';
import { loadShaderPair } from './utils/shaderLoader.js';

async function createCustomMaterial() {
    try {
        // 加载 shader 文件
        const { vertex, fragment } = await loadShaderPair(
            'src/shaders/custom.vert',
            'src/shaders/custom.frag'
        );

        // 创建材质
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(1, 0, 0) }
            },
            vertexShader: vertex,
            fragmentShader: fragment
        });

        return material;
    } catch (error) {
        console.error('创建材质失败:', error);
        // 返回默认材质作为回退
        return new THREE.MeshBasicMaterial({ color: 0xff0000 });
    }
}

// 使用
const material = await createCustomMaterial();
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);
```

## 错误处理

加载器包含完善的错误处理机制：

1. **网络错误**: 当文件无法访问时抛出错误
2. **文件不存在**: 返回 404 错误
3. **解析错误**: 当文件内容无法读取时处理错误
4. **回退机制**: 提供默认材质作为回退方案

## 缓存管理

- 自动缓存已加载的 shader 文件
- 避免重复网络请求
- 支持手动清除缓存
- 提供缓存统计信息

## 注意事项

1. 确保 shader 文件路径正确
2. 在服务器环境中运行（避免 CORS 问题）
3. 合理使用缓存，避免内存泄漏
4. 处理异步加载的错误情况

## 文件结构

```
src/
├── utils/
│   ├── shaderLoader.js          # 主要加载器
│   ├── shaderLoader.example.js  # 使用示例
│   └── README.md               # 说明文档
└── shaders/
    ├── blackhole.vert          # 示例 vertex shader
    └── blackhole.frag          # 示例 fragment shader
```
