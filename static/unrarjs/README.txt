node-unrar-js 2.0.2 (https://github.com/YuJianrong/node-unrar.js)
unrar.bundle.js 由官方 esm 构建打包而来（官方只发 ESM/CJS，import 路径不带扩展名，
浏览器无法直接加载），命令：
  npx esbuild@0.24.0 node_modules/node-unrar-js/esm/index.esm.js \
      --bundle --format=iife --global-name=unrarjs --platform=browser --minify \
      --outfile=unrar.bundle.js
unrar.wasm 直接取自 esm/js/unrar.wasm，运行时由 jPreview 读成 ArrayBuffer 通过
wasmBinary 传入，避免 emscripten 去猜路径。
