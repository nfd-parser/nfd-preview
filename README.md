# netdisk-fast-download预览模块 jPreview实现

# jPreview
fork https://gitee.com/raingad/j-preview
#### 介绍
一款纯JQ实现的预览插件，支持office文档，图片，音乐，视频，pdf等常用的文件！部分不支持的文档采用officeOnline在线预览。

支持doc、docx、ppt、pptx、wps、xls、xlsx、pdf、mp4、mp3、jpg、png、markdown、txt等常用的文件。
支持源码文件(js、cpp、java等)高亮展示。

其他文件支持持续更新中...

#### 软件架构

```html
jpreview/
    ├─source         # 预览资源库，使用时只需要使用static文件内的内容即可
    ├─static         # 静态资源库
    │  └─jPreview.js # 核心文件
    ├─index.html     # demo
    └─preview.html   # 实现预览的页面
```



#### 使用说明

1.  引入Jquery，和主文件
``` html
<!-- css -->
<link rel="stylesheet" href="static/common/css/main.css">
<link rel="stylesheet" href="static/common/css/audio.css">
<link rel="stylesheet" href="static/luckysheet/css/pluginsCss.css">
<link rel="stylesheet" href="static/luckysheet/css/plugins.css">
<link rel="stylesheet" href="static/luckysheet/css/luckysheet.css">
<link rel="stylesheet" href="static/luckysheet/css/iconfont.css">
<link rel="stylesheet" href="static/pptxjs/css/pptxjs.css">
<link rel="stylesheet" href="static/viewer/viewer.css">

<!-- js -->
<script type="text/javascript" src="static/common/js/jquery-2.0.3.min.js"></script>
<script type="text/javascript" src="static/common/js/jPreview.js"></script>
```
2.  初始化

```javascript
jPreview.preview({
    container:"container", // 容器id
    staticPath:"./static", // 静态资源路径
    url:"", // 预览资源路径，没有的话获取url中scr参数
    ext:"",  // 资源后缀，如果url中没有的话，必须传入后缀名，否则无法识别文件类型
    name:"",  // 资源名称
    watermarkTxt:"文件预览系统", // 水印文字
    watermarkSize:"", // 水印文字大小
    priority:1, // 优先级 1：使用插件预览 2：使用office在线预览，
    oburl:"", // 可自动设置在线设置office线上预览地址，不需要的话可以不传
});
```
3.  将静态资源放入到你需要的地方，并在初始化的时候，把相对路径填入`staticPath`中。
4.  pdf预览插件是采用的mjs，需要在服务端中运行，并且在服务端设置MIME类型，以下是nginx的配置方法，不明白的可以百度。

```javascript
http {
	...
	types {
		application/javascript mjs;
	}
	...
}
```
#### 开源库

1.  `docx-preview` docx文档
2.  `pptxjs` pptx演示文稿
3.  `luckysheet` excel表格
4.  `sheetjs` excel表格，支持xls
5.  `superVideo` 视频播放器
6.  `yAudio` 音频播放器
7.  `watermark` 水印
8.  `viewer.js` 图片预览
9.  `pdf.js` pdf预览

#### 已知bug

pdf文档暂时不支持中文路径，并且PDF文件预览会造成XSS攻击，获取用户信息。



## 高清 MKV / MOV / AVI 播放增强

`preview.html` 使用 [Movi Player](https://github.com/MrUjjwalG/movi-player) 0.4.1 (Apache-2.0) 的 Slim Web Component。对于 MKV/MOV/AVI/TS/M2TS/MTS/HEVC/H265 使用增强播放器；MP4、WebM、FLV 等保持原来的 DPlayer，避免普通媒体额外下载解码器。文件扩展名无法判断视频是否为 4K，4K MP4 可通过查询参数 `player=movi` 强制增强；`player=dplayer` 切换回旧播放器。即使直接下载 URL 无扩展名，也可传 `ext=mkv`。

增强播放器 JS 和 `movi.wasm` 仅在需要时加载。先尝试国内 npm CDN `https://npm.elemecdn.com/movi-player@0.4.1/dist/`，失败后尝试 `https://cdn.jsdelivr.net/npm/movi-player@0.4.1/dist/`。下载的 WASM 会检查 magic bytes 并转成 Blob URL，避免重复网络下载；这两个公共 CDN 的中国三网可达性、同步及时性及性能尚未实测。建议正式生产环境镜像固定版本的这两个静态资源到自行控制的国内 CDN。

跨域视频 URL 必须允许 CORS，服务端最好支持 HTTP Range/206。302 的最终资源地址也需要 CORS；原生 DPlayer 不一定能播放 MKV 的不兼容音轨。上线前应实际验证 AC-3/E-AC-3、多音轨、字幕（SRT/ASS/PGS）、4K HEVC、视频 seek、弱网、浏览器差异，以及云盘下载站防盗链。

此变更独立于主站构建，保持原有 `preview.html` 参数及非视频文件预览行为。高清增强路径默认采用第三方组件版本锁定，JS/WASM 失败会回退到 DPlayer。
