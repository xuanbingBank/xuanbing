"use strict";
/**
 * @file ʵ�� IPC �����Ȩ���ж��߼���Ĭ�Ͼܾ�δ������δ��Ȩ������
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ROLE_PERMISSIONS = void 0;
exports.createPermissionChecker = createPermissionChecker;
/**
 * ����Ĭ�ϴ��ڽ�ɫȨ�ޱ���
 */
exports.DEFAULT_ROLE_PERMISSIONS = {
    main: ['public', 'app:read', 'file:read', 'window:control', 'task:run', 'task:cancel'],
    settings: ['public', 'app:read', 'file:read', 'window:control'],
    workerPanel: ['public', 'app:read', 'task:run', 'task:cancel']
};
/**
 * ����һ�����ڴ��ڽ�ɫ��Ȩ�޼������
 *
 * @param options Ȩ�޼�������á�
 * @returns Ȩ���ж�������
 */
function createPermissionChecker(options) {
    const rolePermissions = {
        ...exports.DEFAULT_ROLE_PERMISSIONS,
        ...options.rolePermissions
    };
    /**
     * �жϸ�����Լ�Ƿ�������ǰ���ڵ��á�
     *
     * @param input Ȩ���ж����롣
     * @returns �ж������
     */
    return function canAccess(input) {
        if (!input.contract.permission) {
            return { allowed: false, reason: 'missing-contract-permission' };
        }
        if (!input.windowRole) {
            return { allowed: false, reason: 'unknown-window-role' };
        }
        const allowedPermissions = rolePermissions[input.windowRole] ?? [];
        if (allowedPermissions.includes(input.contract.permission)) {
            return { allowed: true };
        }
        if (options.environment !== 'production' && input.contract.permission === 'devtools:open') {
            return { allowed: true };
        }
        return { allowed: false, reason: 'missing-permission' };
    };
}
