/**
 * Copyright 2019 Huawei Technologies Co., Ltd.All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const path = require("path");

/**
 * @param {String} dir
 * @return {String}
 */
function resolve(dir) {
  return path.join(__dirname, dir);
}

module.exports = {
  publicPath: process.env.NODE_ENV === "production" ? "./" : "/",
  outputDir: "dist",
  assetsDir: "static",

  // map
  productionSourceMap: false,

  configureWebpack: {
    devtool: "source-map",
  },

  chainWebpack: (config) => {
    config.resolve.alias.set("@", resolve("src"));

    config.plugins.delete("preload");
    config.plugins.delete("prefetch");
    config.module
      .rule("element-ui")
      .test(/element-ui.src.*?js$/)
      .use("babel")
      .loader("babel-loader")
      .end();

    const svgRule = config.module.rule("svg");

    svgRule.uses.clear();

    svgRule.use("vue-svg-loader").loader("vue-svg-loader");
  },

  devServer: {
    port: 8085,
    disableHostCheck: true,
    proxy: {
      "/mock": {
        target: "http://10.76.0.163:8089/",
        ws: true,
        changeOrigin: true,
        pathRewrite: {
          "^/mock": "",
        },
      },
    },
  },

  css: {
    loaderOptions: {
      less: {
        lessOptions: {
          javascriptEnabled: true,
        },
      },
    },
  },

  pluginOptions: {
    i18n: {
      locale: "zh-cn",
      fallbackLocale: "zh-cn",
      localeDir: "locales",
      enableInSFC: true,
    },
  },
};
