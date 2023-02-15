var path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");
const ThreadsPlugin = require('threads-plugin');

const optimization = {
  minimize: true,
  minimizer: [
    new TerserPlugin({
      terserOptions: {
        warnings: false,
        compress: {
          comparisons: false,
          drop_console: true,
          // pure_funcs: ['console.log'],
        },
        parse: {},
        mangle: true,
        output: {
          comments: false,
          ascii_only: true,
        },
      },
      parallel: true,
      cache: true,
      sourceMap: false,
    }),
  ],
  nodeEnv: "production",
};

const devConfig = {
  mode: "development",
};

const prodConfig = {
  mode: "production",
  optimization,
};

const aliasConfig = {
  resolve: {
    alias: {
      "@lib": path.resolve(__dirname, "lib"),
      "@privacy-wasm": path.resolve(__dirname, "privacy.wasm"),
      "@ledgerhq/devices": "@ledgerhq/devices/lib-es",
    },
  },
};

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";

  const cfg = {
    name: "wallet",
    devtool: "source-map",
    entry: {
      wallet: "./lib/wallet.js",
    },
    output: {
      path: path.resolve(__dirname),
      filename: "build/[name].js",
      library: "",
      libraryTarget: "umd",
    },
    target: "web",
    node: {
      fs: "empty",
    },
    module: {
      rules: [{
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        options: {
          plugins: ["lodash", "@babel/plugin-proposal-class-properties"],
          presets: ["@babel/preset-env"],
          ignore: [/wasm_exec|sjcl/],
        },
      },],
    },
    plugins: [
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
    ],
    ...(isProduction ? prodConfig : devConfig),
    ...aliasConfig,
  };
  const nodeCfg = {
    name: "lib",
    devtool: "source-map",
    entry: {
      inc: "./lib/lib.js",
    },
    output: {
      path: path.resolve(__dirname, "build-node"),
      filename: "[name].js",
      library: "",
      libraryTarget: "umd",
      chunkFilename: "wallet.js",
    },
    target: "node",
    module: {
      defaultRules: [{
        type: "javascript/auto",
        resolve: {}
      }, {
        test: /\.json$/i,
        type: "json"
      }],
      rules: [{
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        options: {
          plugins: ["lodash", "@babel/plugin-proposal-class-properties"],
          presets: [
            ["@babel/preset-env", {
              "targets": {
                "node": "12"
              }
            }],
          ],
          ignore: [/wasm_exec|sjcl/],
        },
      }, {
        test: /\.wasm$/,
        loader: 'file-loader',
        options: {
          name: "privacy.wasm",
          outputPath: "",
          emitFile: false
        }
      },],
    },
    plugins: [
      new ThreadsPlugin(),
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
    ],
    ...(isProduction ? prodConfig : devConfig),
    resolve: {
      alias: {
        "@lib/wasm": path.resolve(__dirname, "lib/wasm-node"),
        "@lib": path.resolve(__dirname, "lib"),
        "@privacy-wasm": path.resolve(__dirname, "privacy.wasm"),
        "@ledgerhq/devices": "@ledgerhq/devices/lib-es",
      },
    },
  };

  const webCfg = {
    name: "wallet-web",
    devtool: "source-map",
    entry: {
      "wallet": ["./lib/wallet-web.js"],
    },
    output: {
      path: path.resolve(__dirname, "build/web"),
      publicPath: "/assets/",
      library: "wallet",
      libraryTarget: "umd",
      chunkFilename: "wallet.js",
    },
    target: "web",
    module: {
      defaultRules: [{
        type: "javascript/auto",
        resolve: {}
      }, {
        test: /\.json$/i,
        type: "json"
      }],
      rules: [{
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        options: {
          plugins: ["lodash", "@babel/plugin-proposal-class-properties", "@babel/plugin-transform-runtime"],
          presets: [
            ["@babel/preset-env", {
              useBuiltIns: "entry",
              corejs: "3.10.2"
            }],
          ],
          ignore: [/wasm_exec|sjcl/],
        },
      }, {
        test: /\.wasm$/,
        loader: 'file-loader',
        options: {
          name: "privacy.wasm",
          outputPath: "",
          publicPath: '/assets/',
          emitFile: false
        }
      },],
    },
    plugins: [
      new ThreadsPlugin({
        globalObject: 'self',
      }),
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
    ],
    ...(isProduction ? prodConfig : devConfig),
    ...aliasConfig,
  };
  return [nodeCfg, webCfg];
};