import path from 'path'
import { Configuration } from 'webpack'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import CopyFilePlugin from 'copy-webpack-plugin'

import Dotenv from 'dotenv-webpack'
const isDev = process.env.NODE_ENV === 'development'
const base: Configuration = {
    mode: isDev ? 'development' : 'production',
    node: {
        __dirname: false,
        __filename: false,
    },
    externals: {
        fsevents: "require('fsevents')",
        asset: true,
    },
    resolve: {
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
        alias: {
            //'src': path.resolve(process.cwd(), 'src'),
            components: path.resolve(__dirname, 'src/components/'),
            features: path.resolve(__dirname, 'src/features/'),
            types: path.resolve(__dirname, 'src/types/'),
            libs: path.resolve(__dirname, 'src/libs/'),
            styles: path.resolve(__dirname, 'src/styles/'),
            pages: path.resolve(__dirname, 'src/pages/'),
            services: path.resolve(__dirname, 'src/services/'),
            slices: path.resolve(__dirname, 'src/slices/'),
            store: path.resolve(__dirname, 'src/store/'),
        },
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: './',
        filename: '[name].js',
        assetModuleFilename: 'images/[name][ext]',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: 'ts-loader',
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: { sourceMap: isDev, modules: true },
                    },
                ],
            },
            {
                test: /\.(bmp|ico|gif|jpe?g|png|svg|ttf|eot|woff?2?)$/,
                type: 'asset/resource',
            },
            {
                test: /\.json5$/i,
                loader: 'json5-loader',
                options: {
                    esModule: false,
                },
                type: 'javascript/auto',
            },
        ],
    },
    devtool: isDev ? 'inline-source-map' : false,
}
const main: Configuration = {
    // 共通設定の読み込み
    ...base,
    target: 'electron-main',
    entry: {
        main: './src/electron/main.ts',
    },
}

const preload: Configuration = {
    ...base,
    target: 'electron-preload',
    entry: {
        preload: './src/electron/preload.ts',
    },
}
const renderer: Configuration = {
    ...base,
    target: 'web',
    entry: {
        renderer: './src/index.tsx',
    },
    plugins: [
        new Dotenv({ systemvars: true }),
        new HtmlWebpackPlugin({
            template: './src/index.html',
            minify: !isDev,
            inject: 'body',
            filename: 'index.html',
            scriptLoading: 'blocking',
        }),
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash].css',
        }),
        new CopyFilePlugin({
            patterns: [
                {
                    from: '**/**/*.pem',
                    to: 'tls/',
                    context: 'src/server/tls',
                },
            ],
        }),
    ],
}

export default [main, preload, renderer]
