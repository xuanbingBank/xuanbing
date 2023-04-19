const { app, BrowserWindow } = require("electron");
const path = require("path");

//热加载
try {
  require("electron-reloader")(module);
} catch (_) {}

const createWindow = () => {
  const win = new BrowserWindow({
    title: "玄冰是仓鼠",
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    maxHeight: 1080,
    maxWidth: 1920,
    //是否有阴影
    hasShadow: false,
    //是否置顶
    alwaysOnTop: true,
    //是否任务栏显示
    skipTaskbar: true,
    //是否无边框
    // frame: false,
    //自动隐藏菜单栏
    autoHideMenuBar: true,

    webPreferences: {
      nodeIntegration: true,
    },
  });

  win.loadFile("index.html");
};

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});