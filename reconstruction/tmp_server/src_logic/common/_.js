'use strict';
const path = require('path');
const glob = require('glob');
const colors = require('colors/safe');
const ext = '.common.js';
const commonBase = `./**/*${ext}`;

/**
 * @param {string} base @param {string} files
 * @return {array}
 * @description 自动加载指定目录下所有的文件
 */
function getFileList(base, files) {
    const fileList = glob.sync(files, {
        cwd: base,
    }).map(file => {
        return path.join(base, file);
    });
    return fileList;
}

/**
 * 
 * @param {string} base @param {string} files
 * @return {function}
 * @description 根据配置项加载目录下所有的 common 文件
 */
function createLibrary(base, files) {
    /**
     * @param {object} options
     * @return {object}
     */
    return function (options) {

        //比其余 common 文件更先加载
        const preList = options.pre || [];
        //查找是否预加载了 logger 模块
        const loggerIndex = preList.indexOf('logger');
        const fileList = getFileList(base, files);
        const preLoad = preList.reduce((pre, name) => {
            let res = {};
            try {
                res = require(path.join(base, `${name}${ext}`));
                res = res.apply(null, pre);
            } catch (e) { console.error(colors['red'](`[Easy-Monitor] <${name}${ext}> pre-load error: ${e}`)) }

            pre.push(res);
            return pre;
        }, [{ getFileList }]);

        const logger = preLoad[loggerIndex + 1];

        //以预加载的 common 文件为参数，加载剩余文件
        return fileList.reduce((pre, file) => {
            const basename = path.basename(file);
            const filename = basename.replace(ext, '');
            //预加载过的文件保存后剔除
            if (~preList.indexOf(filename)) {
                pre[filename] = preLoad[preList.indexOf(filename) + 1];
                return pre;
            };
            try {
                const fn = require(file);
                pre[filename] = fn.apply(null, preLoad);
            } catch (e) { logger & logger.error(`<${basename}> load error: ${e}`) }
            return pre;
        }, { getFileList, createLibrary })
    }
}

module.exports = createLibrary(__dirname, commonBase);
