# Deploy Skill

将本地代码推送到 GitHub 并更新生产服务器（root@claw，域名 https://a.gpoker.icu）。

## 执行步骤

1. **本地提交推送**（如有未提交变更）
   - `git add -A && git commit -m "..."` （若用户未指定 commit message，自动生成）
   - `git push origin main`

2. **服务器拉取构建重启**
   ```bash
   ssh root@claw "
     export NVM_DIR=\$HOME/.nvm && source \$NVM_DIR/nvm.sh && nvm use 20
     cd /data/AutoCard
     git pull
     rm -f shared/tsconfig.tsbuildinfo
     npm run build
     pm2 restart autocard-server
     pm2 save
   "
   ```

3. **验证**
   ```bash
   ssh root@claw "export NVM_DIR=\$HOME/.nvm && source \$NVM_DIR/nvm.sh && nvm use 20 && pm2 list"
   curl -s https://a.gpoker.icu/api/config/heroes | head -c 60
   ```

## 服务器信息

- **主机**：`root@claw`
- **代码目录**：`/data/AutoCard`
- **访问地址**：https://a.gpoker.icu
- **进程管理**：PM2（进程名 `autocard-server`）
- **Node 版本**：nvm v20（需 source nvm.sh）
