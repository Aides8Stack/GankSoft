# Windows 11 x64 程序包

交付 GankSoft-v0.5.0-Windows11-x64.zip，包含 GankSoft.exe、Electron 44.7.2 Windows x64运行时、应用资源、ts-fsrs与Windows图片解码模块1.15.0。

完整解压后双击GankSoft.exe；不需要Node.js，不要单独移动EXE。程序包不包含用户学习数据库。

本轮验证：EXE产品版本0.5.0.0；45个编译文件逐字节匹配；图片原生模块解包到app.asar.unpacked；Windows运行文件与官方运行时比对；PE x64架构和节边界；ZIP CRC与逐文件SHA256。详细结果见validation-results/windows-*.json。未进行Windows11实机执行测试，EXE未签名。

可复现打包：在Windows安装Node24，npm ci，然后npm run package:portable:win。Linux交叉打包需先取得与图片模块版本匹配的@napi-rs/image-win32-x64-msvc原生Windows包（实际名称见tools/package-windows.mjs），传入其解压目录：

    npm run build
    node tools/package-windows.mjs WINDOWS_NATIVE_PACKAGE_DIR OUTPUT_DIR

源码包含打包脚本和验证脚本，完整源码与源码文件哈希为本次交付依据。
