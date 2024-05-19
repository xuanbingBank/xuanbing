const dashboard: AuthRoute.Route = {
  name: 'dashboard',
  path: '/dashboard',
  component: 'basic',
  children: [
    {
      name: 'dashboard_analysis',
      path: '/dashboard/analysis',
      component: 'self',
      meta: {
        title: '仪表盘',
        requiresAuth: true,
        icon: 'icon-park-outline:analysis'
      }
    },
    {
      name: 'dashboard_workbench',
      path: '/dashboard/workbench',
      component: 'self',
      meta: {
        title: '工作站',
        requiresAuth: true,
        icon: 'icon-park-outline:workbench'
      }
    },
		{
      name: 'dashboard_dataauxiliaryscreen',
      path: '/dashboard/dataauxiliaryscreen',
      component: 'self',
      meta: {
        title: '数据副屏',
        requiresAuth: true,
        icon: 'icon-park-outline:workbench'
      }
    },
  ],
  meta: {
    title: '主页',
    icon: 'mdi:monitor-dashboard',
    order: 1
  }
};

export default dashboard;
