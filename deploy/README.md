# 生产部署

正式地址：<https://www.kultalab.com/>。`kultalab.com` 和 HTTP 访问统一跳转至该 HTTPS 域名。

## 当前服务器

- SSH：`ssh root@8.141.120.95`；密码仅在 SSH 提示中输入，不写入文件或命令。
- 公网由现有 Docker 容器 `kultalabweb-nginx-1` 提供，监听 80 / 443。
- Compose 项目：`/root/github/KultaLabWeb`。
- Nginx 配置：项目内 `nginx/default.conf`，对应本仓库的 [nginx.conf](nginx.conf)。
- Docker 卷：`kultalabweb_static_data`，容器内挂载到 `/app/staticfiles`。
- 网站目录：该卷内的 `beanlabs/releases/<release>/`；`beanlabs/current` 指向当前版本。
- 当前版本：`20260924T194219Z`。
- 上一版 BEAN LABS 备份：`/root/backups/beanlabs/20260924T194219Z/`；原发布目录 `releases/20260924T191458Z` 同时保留。
- 首次替换前的完整备份：`/root/backups/beanlabs/20260924T191458Z/`，包含旧项目、Nginx / Compose 配置、SQLite 一致性快照、静态和媒体文件、证书配置。

新站仅发布 Astro 的 `dist/`，由 Nginx 直接提供静态文件。原 Django 容器、数据库和媒体卷保持原样，供旧站回滚使用。无需为新站运行 Node、Gunicorn 或新的容器。

HTTPS 使用 `/etc/letsencrypt/live/kultalab.com/` 下的现有证书。`certbot.timer` 自动续期，部署钩子 `20-kultalab-nginx` 负责测试并重载 Nginx。80 端口的 ACME 验证目录 `/var/www/letsencrypt` 必须继续保留。

HTML 每次使用前重新验证；`/_astro/` 内容哈希资源缓存一年，其他图片、图标和字体缓存一小时。不存在的页面返回真正的 404。

## 后续更新

1. 本地运行 `npm run check` 和 `npm run test:e2e`，确认通过后使用生成的 `dist/`。
2. 上传到卷内全新的 `beanlabs/releases/<release>/` 目录。只上传构建产物，保留旧版本；上传后核对文件校验和。新版本的 `/_astro/` 同时保留上一版本的内容哈希资源，避免已打开旧页面的访客在切换时遇到资源缺失。
3. 在服务器上先记录旧版本，再原子切换版本：

```sh
base="$(docker volume inspect -f '{{.Mountpoint}}' kultalabweb_static_data)/beanlabs"
readlink "$base/current"
release=替换为已上传的版本目录名
ln -s "releases/$release" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
```

仅更新页面不需要重载 Nginx。若修改 Nginx 配置，先备份，再写入已挂载的 `nginx/default.conf`，执行 `docker exec kultalabweb-nginx-1 nginx -t`，通过后执行 `docker exec kultalabweb-nginx-1 nginx -s reload`。

注意：Docker 使用单文件挂载，更新配置须原位写入（例如 `cat new.conf > nginx/default.conf`），不可通过重命名替换该文件，否则容器可能仍读取旧 inode。

检查公网首页、Blog、Product、Join us、详情页、404、HTTPS、动画与移动端菜单。页面版本回滚时，以同样方式将 `current` 原子切回前一版本。

## 回滚到上一版 BEAN LABS

在服务器运行：

```sh
base="$(docker volume inspect -f '{{.Mountpoint}}' kultalabweb_static_data)/beanlabs"
ln -s releases/20260924T191458Z "$base/current.rollback"
mv -Tf "$base/current.rollback" "$base/current"
```

无需重载 Nginx。当前版本的发布校验清单和来源文件校验清单保存在对应备份目录中。

## 回滚到原 KultaLab 网站

在服务器运行：

```sh
backup=/root/backups/beanlabs/20260924T191458Z
cat "$backup/nginx.conf" > /root/github/KultaLabWeb/nginx/default.conf
docker start kultalabweb-web-1
docker exec kultalabweb-nginx-1 nginx -t
docker exec kultalabweb-nginx-1 nginx -s reload
```

原项目和数据保持在原位置，正常回滚无需恢复数据库。备份仅供额外恢复需要，包含私密配置，权限限定为 root；不要放入网站目录或提交到代码仓库。
