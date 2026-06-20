"use strict";
/**
 * @file 打开窗口组合式函数，提供按角色打开各类窗口的便捷方法。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useOpenWindow = useOpenWindow;
/**
 * 打开窗口组合式函数，封装常用的窗口打开操作。
 *
 * 该函数不使用生命周期钩子，可在任意位置调用。
 *
 * @returns 窗口打开方法集合。
 */
function useOpenWindow() {
    const open = async (role, options) => {
        return window.desktop.window.open(role, options);
    };
    const openSettings = () => open('settings');
    const openDetail = (id) => open('detail', { params: { id } });
    const openAbout = () => open('about');
    const openTaskCenter = () => open('taskCenter');
    const openLogViewer = () => open('logViewer');
    const openModal = (type) => open('modal', { params: { type } });
    return { open, openSettings, openDetail, openAbout, openTaskCenter, openLogViewer, openModal };
}
