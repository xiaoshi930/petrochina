# 油价信息集成

## 项目简介

本项目是一个用于获取国内各省油价信息的集成工具，支持通过 API 获取实时油价数据，并显示在 Home Assistant 中。

## 安装指南

1. 将 `custom_components/oil_price` 文件夹复制到您的 Home Assistant 配置目录下的 `custom_components` 文件夹中。
2. 重启 Home Assistant。

## API 说明

- **API 地址**: `https://v2.xxapi.cn/api/oilPrice`
- **返回数据**: 包含全国 31 个省的油价信息，支持通过省份名称查询。

## 注意事项

1. 确保您的网络可以访问 `https://v2.xxapi.cn`。
2. 如果 API 返回错误，请检查日志以获取详细信息。
3. 默认更新间隔为 1 小时，可根据需求调整。
