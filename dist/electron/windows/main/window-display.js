"use strict";
/**
 * @file 窗口显示器定位与边界矫正工具集。
 *
 * 全部函数均通过注入的 ScreenLike 接口操作显示器，不直接依赖 electron 模块，
 * 便于在测试环境与主进程中复用。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllDisplays = getAllDisplays;
exports.getPrimaryDisplay = getPrimaryDisplay;
exports.selectTargetDisplay = selectTargetDisplay;
exports.isBoundsVisible = isBoundsVisible;
exports.findDisplayContaining = findDisplayContaining;
exports.centerToDisplay = centerToDisplay;
exports.centerToParentWindow = centerToParentWindow;
exports.pullBackToVisible = pullBackToVisible;
exports.correctSize = correctSize;
exports.autoCorrectBounds = autoCorrectBounds;
/**
 * 获取全部显示器列表。
 *
 * @param screen 注入的 screen 模块。
 * @returns 显示器信息数组。
 */
function getAllDisplays(screen) {
    return screen.getAllDisplays();
}
/**
 * 获取主显示器。
 *
 * @param screen 注入的 screen 模块。
 * @returns 主显示器信息。
 */
function getPrimaryDisplay(screen) {
    if (screen.getPrimaryDisplay) {
        return screen.getPrimaryDisplay();
    }
    const displays = screen.getAllDisplays();
    const primary = displays.find((display) => display.isPrimary) ?? displays[0];
    if (!primary) {
        throw new Error('No display available.');
    }
    return primary;
}
/**
 * 根据策略选择目标显示器。
 *
 * @param screen 注入的 screen 模块。
 * @param strategy 选择策略。
 * @param options 额外参数（父窗口、上次使用的显示器、显式显示器 ID）。
 * @returns 目标显示器信息。
 */
function selectTargetDisplay(screen, strategy, options) {
    const displays = screen.getAllDisplays();
    if (displays.length === 0) {
        throw new Error('No display available.');
    }
    switch (strategy) {
        case 'primary':
            return getPrimaryDisplay(screen);
        case 'cursor': {
            const point = screen.getCursorScreenPoint?.();
            if (point) {
                const matched = displays.find((display) => point.x >= display.bounds.x &&
                    point.x < display.bounds.x + display.bounds.width &&
                    point.y >= display.bounds.y &&
                    point.y < display.bounds.y + display.bounds.height);
                if (matched) {
                    return matched;
                }
            }
            return getPrimaryDisplay(screen);
        }
        case 'parent': {
            const parent = options.parent;
            if (parent && !parent.isDestroyed()) {
                const parentBounds = parent.getBounds();
                if (screen.getDisplayMatching) {
                    return screen.getDisplayMatching(parentBounds);
                }
                const matched = findDisplayContaining(displays, parentBounds) ?? displays[0];
                if (matched) {
                    return matched;
                }
            }
            return getPrimaryDisplay(screen);
        }
        case 'last': {
            if (options.lastDisplayId !== undefined) {
                const matched = displays.find((display) => display.id === options.lastDisplayId);
                if (matched) {
                    return matched;
                }
            }
            if (options.currentBounds && screen.getDisplayMatching) {
                return screen.getDisplayMatching(options.currentBounds);
            }
            return getPrimaryDisplay(screen);
        }
        case 'explicit': {
            if (options.explicitDisplayId !== undefined) {
                const matched = displays.find((display) => display.id === options.explicitDisplayId);
                if (matched) {
                    return matched;
                }
            }
            return getPrimaryDisplay(screen);
        }
        default:
            return getPrimaryDisplay(screen);
    }
}
/**
 * 判断边界是否在任何显示器的可见区域内。
 *
 * @param displays 显示器列表。
 * @param bounds 待校验的边界。
 * @returns 是否可见。
 */
function isBoundsVisible(displays, bounds) {
    return displays.some((display) => bounds.x + bounds.width > display.bounds.x &&
        bounds.x < display.bounds.x + display.bounds.width &&
        bounds.y + bounds.height > display.bounds.y &&
        bounds.y < display.bounds.y + display.bounds.height);
}
/**
 * 查找包含指定边界（中心点）的显示器。
 *
 * @param displays 显示器列表。
 * @param bounds 待查找的边界。
 * @returns 匹配的显示器，未匹配时返回 undefined。
 */
function findDisplayContaining(displays, bounds) {
    const centerX = bounds.x + Math.floor(bounds.width / 2);
    const centerY = bounds.y + Math.floor(bounds.height / 2);
    return displays.find((display) => centerX >= display.bounds.x &&
        centerX < display.bounds.x + display.bounds.width &&
        centerY >= display.bounds.y &&
        centerY < display.bounds.y + display.bounds.height);
}
/**
 * 将窗口居中到指定显示器。
 *
 * @param display 目标显示器。
 * @param windowWidth 窗口宽度。
 * @param windowHeight 窗口高度。
 * @returns 居中后的边界。
 */
function centerToDisplay(display, windowWidth, windowHeight) {
    const { x, y, width, height } = display.bounds;
    return {
        x: x + Math.max(0, Math.floor((width - windowWidth) / 2)),
        y: y + Math.max(0, Math.floor((height - windowHeight) / 2)),
        width: windowWidth,
        height: windowHeight
    };
}
/**
 * 将窗口居中到父窗口。
 *
 * @param parent 父窗口。
 * @param windowWidth 窗口宽度。
 * @param windowHeight 窗口高度。
 * @returns 居中后的边界。
 */
function centerToParentWindow(parent, windowWidth, windowHeight) {
    const parentBounds = parent.getBounds();
    return {
        x: parentBounds.x + Math.max(0, Math.floor((parentBounds.width - windowWidth) / 2)),
        y: parentBounds.y + Math.max(0, Math.floor((parentBounds.height - windowHeight) / 2)),
        width: windowWidth,
        height: windowHeight
    };
}
/**
 * 将离屏窗口拉回最近的可视显示器。
 *
 * @param displays 显示器列表。
 * @param bounds 当前边界。
 * @returns 校正后的边界。
 */
function pullBackToVisible(displays, bounds) {
    if (isBoundsVisible(displays, bounds)) {
        return bounds;
    }
    const primary = displays.find((display) => display.isPrimary) ?? displays[0];
    if (!primary) {
        return bounds;
    }
    return {
        x: primary.bounds.x + Math.max(0, Math.floor((primary.bounds.width - bounds.width) / 2)),
        y: primary.bounds.y + Math.max(0, Math.floor((primary.bounds.height - bounds.height) / 2)),
        width: bounds.width,
        height: bounds.height
    };
}
/**
 * 校正窗口尺寸，确保不小于最小宽高。
 *
 * @param bounds 当前边界。
 * @param minWidth 最小宽度。
 * @param minHeight 最小高度。
 * @param maxWidth 最大宽度（可选）。
 * @param maxHeight 最大高度（可选）。
 * @returns 校正后的边界。
 */
function correctSize(bounds, minWidth, minHeight, maxWidth, maxHeight) {
    let { width, height } = bounds;
    if (width < minWidth) {
        width = minWidth;
    }
    if (height < minHeight) {
        height = minHeight;
    }
    if (maxWidth !== undefined && width > maxWidth) {
        width = maxWidth;
    }
    if (maxHeight !== undefined && height > maxHeight) {
        height = maxHeight;
    }
    return { x: bounds.x, y: bounds.y, width, height };
}
/**
 * 综合校正窗口边界：先校正尺寸，再校正离屏位置。
 *
 * @param screen 注入的 screen 模块。
 * @param bounds 当前边界。
 * @param minWidth 最小宽度。
 * @param minHeight 最小高度。
 * @param maxWidth 最大宽度（可选）。
 * @param maxHeight 最大高度（可选）。
 * @returns 校正后的边界。
 */
function autoCorrectBounds(screen, bounds, minWidth, minHeight, maxWidth, maxHeight) {
    const sizeCorrected = correctSize(bounds, minWidth, minHeight, maxWidth, maxHeight);
    const displays = screen.getAllDisplays();
    return pullBackToVisible(displays, sizeCorrected);
}
