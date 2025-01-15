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

