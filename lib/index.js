// gulp 处理完整示例
// 这里的依赖应该是安装到dependencies中的，因为这里我们是作为一个模块使用，而不是开发
const { src, dest, series, parallel } = require('gulp');
// const sass = require('gulp-sass');
// const babel = require('gulp-babel');
// const swig = require('gulp-swig');

// gulp-imagemin这个插件依赖许多二进制包，这些二进制包无法通过淘宝镜像下载，所以有些二进制包下载不下来
// 导致image任务会执行报错，尤其是gifsicle的二进制包就是下载不下来，很烦
// gifsicle安装的时候会跑 /bin/sh -c autoreconf -ivf这个命令，会报错
// 需要我们先安装一下automake这个东西，MAC os解决方式：brew install automake，windows不知道咋安装这个东西
// linux应该是走这个命令apt-get install dh-autoreconf
// const imagemin = require('gulp-imagemin');

// 使用gulp-watch插件进行文件监听

// 使用gulp-useref来对文件的依赖进行处理
// 例如此处我们在编译后的index.html中使用了诸如
// <!-- build:css assets/styles/vendor.css -->
// <link rel="stylesheet" href="/node_modules/bootstrap/dist/css/bootstrap.css">
// <!-- endbuild --></link>
// <!-- build:js assets/scripts/vendor.js -->
// <script src="/node_modules/jquery/dist/jquery.js"></script>
// <script src="/node_modules/popper.js/dist/umd/popper.js"></script>
// <script src="/node_modules/bootstrap/dist/js/bootstrap.js"></script>
// <!-- endbuild -->
// 这样的依赖来加载js和css，在开发环境中我们在bs.init的配置项routes中修改了其指向，所以没问题
// 但是在开发环境中直接这样使用就会有问题
// 这时候就需要gulp-useref这个插件来合并依赖并压缩代码
// 在上述的以来引入我们发现他是以注释build:css或者build:js开始，以endbuild为结束的，这就是我们的构建注释
// 意思是我们会将这一对构建注释中的文件合并压缩到一个文件中，上述就是合并压缩到vendor.css和vendor.js中
// 然后写入assets/styles或者styles/scripts中

// 使用gulp-load-plugins模块进行gulp插件的自动加载
// 像gulp-clean-css中这种插件gulp-load-plugins会帮我们输出成驼峰格式，即cleanCss
const loadPlugins = require('gulp-load-plugins');
// try {
//     const uglify = require('gulp-uglify');
// } catch (error) {
//     console.log('王八蛋')
// }
// 因为我们会用到一个gulp-if的插件用来判断文件类型，没法直接结构，所以需要loadPlugins()返回的对象进行赋值
const plugins = loadPlugins();
const {sass, babel, swig, imagemin, watch, useref, htmlmin, cleanCss, uglify } = plugins;
// del并不是gulp插件，所以我们单独引入
const del = require('del');
// 使用browser-sync模块创建一个服务器，该模块支持热更新
const browserSync = require('browser-sync');
const bs = browserSync.create();
// const data = {
//     menus: [
//       {
//         name: 'Home',
//         icon: 'aperture',
//         link: 'index.html'
//       },
//       {
//         name: 'Features',
//         link: 'features.html'
//       },
//       {
//         name: 'About',
//         link: 'about.html'
//       },
//       {
//         name: 'Contact',
//         link: '#',
//         children: [
//           {
//             name: 'Twitter',
//             link: 'https://twitter.com/w_zce'
//           },
//           {
//             name: 'About',
//             link: 'https://weibo.com/zceme'
//           },
//           {
//             name: 'divider'
//           },
//           {
//             name: 'About',
//             link: 'https://github.com/zce'
//           }
//         ]
//       }
//     ],
//     pkg: require('./package.json'),
//     date: new Date()
// }
// 返回命令行的工作目录
const cwd = process.cwd();
let config = {
    // default config
    // 这里可以放一些默认的配置项
    build: {
      src: 'src',
      dist: 'dist',
      temp: 'temp',
      public: 'public',
      paths: {
        styles: 'assets/styles/*.scss',
        scripts: 'assets/scripts/*.js',
        pages: '*.html',
        images: 'assets/images/**',
        fonts: 'assets/fonts/**',
        extra: 'public/**'
      }
    }
};
try {
  const loadConfig = require(`${cwd}/gsy.config.js`);
  config = Object.assign({}, config, loadConfig); 
} catch (error) {} // 这里不需要catch去进行操作，失败了就不会进行赋值操作，还是走我们一开始的配置
// 配置项base 表示以gulpSrc下的目录结构为基准输出到gulpDist下，是用来保证我们目录结构的完整性插件
const baseSrc = {
    base: config.build.src,
    // 默认是命令行运行的目录，即，在study-pro中运行命令行，值就是study-pro
    // 也可以设置为一个指定目录，这里我们指定为从config.build.src
    cwd: config.build.src
}
let { data } = config;

// css编译
const style = () => {
    // src 可以蠢如第二个参数，该参数时src方法的配置项
    // 配置项base 表示以gulpSrc下的目录结构输出到gulpDist下 
    return src(config.build.paths.styles, baseSrc)
        // sass方法执行的时候会认为'_'开头的scss文件为其他文件的依赖，即在其他scss文件中会import这些'_'开头的文件
        // sass默认会将css结束的'}'放在最后一个css属性的后面像下面这样
        // .icon-aperture:before {
        //     content: '\e900'; }
        // outputStyle: 'expanded'表示把结束的'}'换行表示，像这样
        // .icon-aperture:before {
        //     content: '\e900';
        // }
        .pipe(sass({ outputStyle: 'expanded' }))
        // 由于userefFile任务中会对gulpDist目录同时进行读和写的操作，会出问题
        // 将编译结果输出到gulpTemp这个临时目录中
        .pipe(dest(config.build.temp))
        // 意思是将文件以流的方式推送到浏览器
        .pipe(bs.reload({ stream: true }));
}

// js编译
const script = () => {
    console.log('是这里么')
    console.log(config.build.paths.scripts, 'config.build.paths.scripts')
    return src(config.build.paths.scripts, baseSrc)
        // 这里使用babel需要手动安装@babel/core和@babel/preset-env两个模块
        // 因为gulp-babel插件没有帮我们安装babel的核心模块和预设模块
        // 可以直接使用require的方式进行直接导入@babel/preset-env模块
        // 如果不这么写babel会从使用gulp-stream-yds模块的项目中寻找，如果没有安装就会报错
        // 但是我们不应该把这个使用的权限交给使用gulp-stream-yds模块的项目
        // 这里直接require，就会从当前目录中寻找@babel/preset-env
        .pipe(babel({presets: [require('@babel/preset-env')]}))
        // 由于userefFile任务中会对gulpDist目录同时进行读和写的操作，会出问题
        // 将编译结果输出到gulpTemp这个临时目录中
        .pipe(dest(config.build.temp))
        // 意思是将文件以流的方式推送到浏览器
        .pipe(bs.reload({ stream: true }));
}

// html编译
// 这里使用的是swig模板引擎，我们需要安装gulp-swig插件
// defaults是swig的功能的配置项
// cache表示是否使用缓存
// 在我们热更新html的变化的时候，因为swig默认开启了缓存，所以页面可能看不到变化
// 这时候就需要我们关闭缓存功能，即cache属性设置为false
// 这里的模板文件不需要全部处理，比如leyouts/basic和partials下的html
// 我们只需要处理gulpSrc下的三个HTML文件即可
// 因为leyouts/basic.html和partials下的html这些swig模板引擎会自动帮我们处理
const  page = () => {
    return src(config.build.paths.pages, baseSrc)
        .pipe(swig({ data, defaults: { cache: false } }))
        // 由于userefFile任务中会对gulpDist目录同时进行读和写的操作，会出问题
        // 将编译结果输出到gulpTemp这个临时目录中
        .pipe(dest(config.build.temp))
        // 意思是将文件以流的方式推送到浏览器
        .pipe(bs.reload({ stream: true }));
}

// 图片处理
const image = () => {
    return src(config.build.paths.images, baseSrc)
        .pipe(imagemin())
        .pipe(dest(config.build.dist)); 
}

// 字体文件处理
// 字体文件中也会遇到svg文件，也可以使用imagemin压缩，imagemin遇到非图片格式文件就会跳过
// 字体文件没有啥好处理的地方，只是把文件复制过去
const font = () => {
    return src(config.paths.build.fonts, baseSrc)
        .pipe(imagemin())
        .pipe(dest(config.build.dist)); 
}

// public目录文件处理
const extra = () => {
    return src(config.paths.build.public, baseSrc)
        .pipe(imagemin())
        .pipe(dest(config.build.dist)); 
}

const clean = () => {
    return del([config.build.dist, config.build.temp]);
}

const serve = () => {
    // watch监听到文件变化后会自动调用对应的任务
    // watch方法传入两个参数
    // 第一个是需要监听的文件，可以是一个字符串，表示要监听的文件目录，
    // 也可以是一个数组，表示要监听的文件目录列表
    // 第二个是监听到文件变化后需要跑的任务
    watch(config.build.paths.styles, { cwd: config.build.src }, style);
    watch(config.build.paths.scripts, { cwd: config.build.src }, script);
    watch(config.build.paths.pages, { cwd: config.build.src }, page);
    // 这里图片文字等的变化在开发时候进行压缩等操作意义不大
    // 这些东西只有在我们进行构建发布的时候才有意义
    // 开发阶段进行压缩等操作开降低我们开发阶段的编译效率
    // watch('gulpSrc/assets/images/**', image);
    // watch('gulpSrc/assets/fonts/**', font);
    // watch('gulpSrc/public/**', extra);
    // watch参数可以接受一个数组，表示要监听的目录列表
    // 当我们监听到部分文件变动，且这些文件发生后都是进行相同的任务时，我们就可以使用数组参数
    // 此处就是在监听到图片或者字体变动时重新加载这些文件
    // bs.raload这个Api就是browser-sync提供给我们的可以用来监听到图片或者文字文件变化后进行重新加载的任务
    watch([
        config.build.paths.images,
        config.build.paths.fonts,
        config.build.paths.public
    ], { cwd: config.build.src }, bs.reload);

    bs.init({
        server: {
            // server启动时会在右上角有一个默认有一个browser-sync是否已连接的小提示，设置为false就会关闭这个功能
            notifyL: false,
            // 设置端口，默认是3000
            post: 2080,
            // 热更新功能，监听哪些文件的修改
            // 此处是监听gulpDist下的所有的文件
            // 此处也可以不使用files这个属性
            // 可以在文件pipe的时候进行bs.reload操作
            // files: 'gulpDist/**',

            // server启动时会自动帮我们打开浏览器，可以设置open属性为false关闭该功能
            // 但是我觉着这里需要，所以不设置该属性为false
            // open: false,

            // baseDir支持传入数组
            // 传入数组的意思在于当请求进来时，会依次查找数组中的目录，直到找到请求的对应文件
            // 此处设置的意思就是当我们请求图片或者字体的的时候，我们查找gulpSrc目录尽可以，不用查找gulpDist目录
            // 因为开发的时候我们可能并不会有压缩图片的操作，所以查找gulpDist记载图片意义不大
            // 当图片或者字体的请求进入本地服务器时会先查找gulpDist目录，如果没有找就会找gulpSrc目录
            // 如果还找不到就会顺序往后面的目录查找，直到找到，当然这里只有['gulpDist', 'gulpSrc']
            // 导师的示例是有三个['gulpDist', 'gulpSrc', 'public']
            // 但是因为这个地方我们的public文件夹放在了gulpSrc下，而不是和gulpSrc同级，所以只有两个
            // baseDir: 'gulpDist',
            baseDir: [config.build.temp, config.build.src],

            // 将文件中的某些文件路径修改指向
            // 例我们的html中使用/node_modules/bootstrap/dist/css/bootstrap.css来引入css文件
            // 但是我们HTML坐在的目录下并没有/node_modules这个目录
            // 这个时候就可以使用routes这个属性，该属性权限高于baseDir
            // 即server启动的时候会优先查找routes定义的，如果routes没有定义对应的文件路径就会查找baseDir
            // 此配置当前意思就是查找以'/node_modules'开头的路径时直接从根目录开始查找node_modules
            // 此处值'node_modules'是一个相对路径
            routes: {
                '/node_modules': 'node_modules'
            }
        }
    })
}

// 处理html中的css和js引入问题
// 此处我们对gulpDist目录同时进行了读和写的操作，就会对产生有些文件中没有东西的问题
// 所以我们需要加一个临时文件进行操作
// 就是在编译js、css、和html的时候，编译到一个临时文件(此处示例的临时目录是gulpTemp)中，然后进行压缩
// 最后再将临时文件的内容复制到gulpDist目录下
const userefFile = () => {
    // 这里我们直接读取编译好的html（即从dist中直接读取）的
    // 应该也可以在HTML编译前做这件事情
    // 假如在HTML编译前做这件事情的话，就必须先编译js（因为这个操作需要合并js），然后才能编译html
    // 这样js、html就无法并行编译了
    return src(config.build.temp + '/' + config.build.paths.pages, { base: config.build.temp })
        // 配置项searchPath为我们从哪个目录下查找我们的依赖
        // 此处的意思就是先从dist目录下查找，找不到就从当前目录（即根目录）开始查找
        // 该操作会合并相应的文件并写入到对应的文件下
        // 当执行useref的时候如果html中的构建注释被删掉了，useref就会因为找不到构建注释而跳过文件
        // 这时候需要先重新compile一下
        .pipe(useref({ searchPath: [config.build.temp, '.'] }))
        // 压缩操作
        // 此处需要压缩三种文件html、js、css
        // HTML需要用到gulp-htmlmin插件，js需要gulp-uglify，css需要gulp-clean-css
        // 因为此处需要分别操作不同的文件所以需要使用gulp-if这样一个插件
        // 第一个参数是条件，这里就是匹配时都是js或者其他类型的文件
        // 第二个参数就是转换流（stream中的transform），这里就是uglify转换流
        .pipe(plugins.if(/\.js$/, uglify()))
        .pipe(plugins.if(/\.css$/, cleanCss()))
        // collapseWhitespace表示是否折叠空白字符
        // minifyCSS表示时都压缩style标签内的css
        // minifyJS是否压缩script标签内的js
        .pipe(plugins.if(/\.html$/, htmlmin({ 
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true
        })))
        .pipe(dest(config.build.dist)); 
}
// compile任务只进行js、html、css的编译
const compile = parallel(style, script, page);
// 将图片和文字以及其他一些文件的处理拿出来形成一个新的任务，在构建的任务中执行
const imageAndFont = parallel(image, font, extra);
// 上线前的构建任务，包含清除原本的已编译的文件以及重新编译我们的js等文件和压缩图片等操作
const build = series(clean, parallel(series(compile, userefFile), imageAndFont));
// 开发阶段的构建任务，包含编译js、html、css文件以及启动我们本地服务器
const developBuild = series(compile, serve);

module.exports = {
    build,
    developBuild
}