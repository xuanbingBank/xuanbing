import type { LocaleMessages } from 'vue-i18n';

const locale: LocaleMessages<I18nType.Schema> = {
  message: {
    system: {
      title: '玄冰是仓鼠'
    },
    routes: {
      dashboard: {
        dashboard: '仪表盘',
        analysis: '仪表盘',
        workbench: '工作台'
      },
      about: {
        about: '关于'
      }
    }
  }
};

export default locale;
