# 53 Calendar V3

日本垃圾分类日历。

## Zeabur 部署

在 Zeabur 新建服务，选择用 Docker 镜像部署，镜像名填写：

```text
ghcr.io/kumacoolgo/53calendar-v3:latest
```

端口使用：

```text
80
```

如果 Zeabur 拉取镜像失败，去 GitHub 的 Packages 页面，把 `53calendar-v3` 镜像设为 Public。

## 本地运行

如果只是本地看页面：

```bash
python -m http.server 4173
```

然后打开：

```text
http://127.0.0.1:4173/index.html
```

如果用 Docker 本地运行：

```bash
docker run --rm -p 8080:80 ghcr.io/kumacoolgo/53calendar-v3:latest
```

然后打开：

```text
http://127.0.0.1:8080
```

## 使用方法

1. 打开网页后，会看到当前月份的垃圾分类日历。
2. 点左右箭头切换月份。
3. 点「今日」回到当前月份。
4. 点某一天，可以查看当天要丢的垃圾。
5. 点右上角设置按钮，可以修改分类和收集规则。
6. 点打印按钮，可以导出当前月或全年 PDF。

## 手机使用

用手机浏览器打开部署后的网址。

可以添加到手机主屏幕，当作应用使用。

桌面小组件功能需要打包成 iOS / Android App 后接入系统小组件，单纯网页不能直接变成 iPhone 桌面小组件。
