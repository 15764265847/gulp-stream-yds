#!/usr/bin/env node

// 添加命令行参数，因为我们执行yarn gulp [任务名称]的时候可以在后面添加--cwd和--gulpfile两个参数
// --cwd [路径] 指定的是我们命令行的执行目录
// --gulpfile 指定的就是gulpfile.js所在的目录
// 添加命令行执行目录
process.argv.push('--cwd');
process.argv.push(process.cwd());
// 添加hulpfile.js所在目录
process.argv.push('--gulpfile');
// require.resolve方法是用来找到模块对应的路径
// 此处可以直接传'..'，因为直接传..是找到上册目录，这里上层目录就是根目录，此时就会自动查找package.json中配置的main属性对应的文件
process.argv.push(require.resolve('../lib/index'));

// gulp/bin/gulp中是使用require('gulp-cli')()进行执行的
// 我们这里直接require一下'gulp/bin/gulp'，就会直接执行require('gulp-cli')()
require('gulp/bin/gulp');
