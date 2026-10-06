# v1.9.20 上传与自动更新

本次包含红发香克斯独立牌背和装扮打开加速，Android versionCode=210。

正式安装包：`output/apk/hongzhong-mahjong-1.9.20.apk`，13,523,932字节，约12.90MiB，非调试包。SHA-256：`5348dfad639c13db7e69d6768410195d770fa86c9b0df68cd560189752bf38f7`。签名与原正式包相同，可覆盖安装并保留原设备数据。安装前无需卸载旧版。

APK已内置所有13款桌布、2款牌面、3款牌背、声音与字体。联机和离线都使用本地资源。启动队列准备素材，装扮整桌预览提前生成并缓存；无需另外下载图片包或为了缓存增加无关内容。物理设备上的点击毫秒值、实际安装器与显示效果未验证。

## 线上发布状态

本机未检测到有Space写权限的HF登录或HF_TOKEN，因此**未上传、未发布、未向用户推送更新**。公有上传目录／ZIP和版本清单已准备，不能据此宣称线上已更新。

目标为现有Space：`mark060509/Ldc-Red-Dragon-Mahjong`。将 `output/huggingface-v1.9.20/` 内的文件按原相对路径上传到该Space的“Files”根目录，或解压 `output/huggingface-v1.9.20.zip` 后上传其内容。ZIP本身不是运行项目。上传列表与逐文件哈希见 `docs/deploy/v1.9.20/upload-manifest.json`。

必须一同提交：

- `static/`：全部当前前端及本地素材，包含装扮缓存实现和两张香克斯WebP。
- `game/`、`app.py`、`Dockerfile`、`requirements.txt`：保持当前服务兼容；本次没有变更规则或房间协议。
- `releases/latest.json`：当前版本210、三条更新内容、APK下载地址、大小和SHA-256。
- `releases/hongzhong-mahjong-1.9.20.apk`：当前完整签名包。
- `releases/redeem-codes.json`：保留原已有兑换码哈希。本次没有新增码或清空领取记录。
- `README.md`、`更新日志.md`、两份本次交付文档。

不要上传 `output/android-signing/`、私有兑换码明文、设备钱包／存档、`data/`、任何领取数据库、HF令牌或本次隔离QA钱包。不要删除线上已领取记录，也不要用本地测试数据覆盖线上持久化数据。

## 发布后如何提示玩家

现有自动更新机制已在APK内保留：启动资源进度完成后，在主界面展示新版提示和三条主要改动；“设置”也能主动检查。旧APK必须原本包含自动检查功能，才会看到该提示。不是强制静默安装，也没有群发聊天消息。

本次清单下载地址：
`https://huggingface.co/spaces/mark060509/Ldc-Red-Dragon-Mahjong/resolve/main/releases/hongzhong-mahjong-1.9.20.apk?download=true`

只有实际上传并验证可下载后，该地址才代表可供用户升级的版本。保留原有自动更新服务地址、网络超时、错误回退和静音／装扮偏好。

## 本机脚本

`tools/prepare_ui_release.py` 根据签名包、逐字节校验和当前源码生成公有上传包。准备包不上传网络。

`tools/publish_ui_release.py` 默认只检查凭据是否可用，不显示令牌。配置有该Space写权限的本地凭据后，可在本机执行 `python tools/publish_ui_release.py --publish`。该脚本检查旧兑换码哈希、远端版本与父提交，用一个仅增加／替换文件的提交上传运行文件、APK和清单，再核验APK哈希和Space重新运行。它不会上传私有存档或删除线上文件。

本次浏览器更新检查使用生产弹层与隔离的原生异步结果模拟，见 `output/playwright/shanks-back/update/`；不等同真实公网下载、Android安装器或已向玩家推送。
