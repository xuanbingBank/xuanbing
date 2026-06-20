"use strict";
/**
 * @file ע���ļ��Ի�����ص� IPC ������
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFileIpc = registerFileIpc;
const shared_1 = require("../../shared");
const ipc_errors_1 = require("../ipc-errors");
/**
 * ע�� `file.openDialog` ʾ��������
 *
 * Ϊʲô������ main��
 * ԭ���ļ��Ի����뱾��·��ѡ������ϵͳ�������������������̵��á�
 *
 * renderer ���õ�ʲô��
 * ֻ���õ��û���ȷѡ���� `canceled` �� `filePaths` �����
 *
 * renderer �����õ�ʲô��
 * �ò��� `dialog` ʵ���������ļ�ϵͳ��д������δ���û�ѡ���·����
 *
 * �������У�飺
 * ʹ�ù�����Լ�е��ļ��Ի�������ģ�ͣ����Ʊ��⡢��ť���������������ʽ��
 *
 * ������У�飺
 * ʹ�ù�����Լ�е��ļ��Ի�����Ӧģ��У�鷵�ؽ����
 *
 * ʧ����η��أ�
 * ͳһ���ر�׼ `IpcError`�������ڲ�����ϸ����������
 *
 * ���ڹر����������
 * ��������һ���� request/response�����������ڼ�������Դ��
 *
 * @param bus ������ IPC ���ߡ�
 * @param dialog ԭ���Ի�����������
 */
function registerFileIpc(bus, dialog) {
    bus.registerHandler(shared_1.requestContracts[shared_1.IPC_CHANNELS.fileDialogOpen], async ({ input }) => {
        const fileDialogInput = input;
        if (fileDialogInput.properties?.includes('openDirectory') && fileDialogInput.properties?.includes('openFile')) {
            throw (0, ipc_errors_1.createIpcError)('IPC_UNSUPPORTED', 'Mixed file and directory selection is not supported in this example.');
        }
        return dialog.showOpenDialog({
            title: fileDialogInput.title,
            defaultPath: fileDialogInput.defaultPath,
            buttonLabel: fileDialogInput.buttonLabel,
            properties: fileDialogInput.properties,
            filters: fileDialogInput.filters
        });
    });
}
