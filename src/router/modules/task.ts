const task: AuthRoute.Route = {
	name: "task",
	path: "/task",
	component: "basic",
	children: [
		{
			name: "task_done",
			path: "/task/done",
			component: "self",
			meta: {
				title: "已完成",
				requiresAuth: true,
				icon: "icons8:checked",
			},
		},
		{
			name: "task_progress",
			path: "/task/progress",
			component: "self",
			meta: {
				title: "进行中",
				requiresAuth: true,
				icon: "icons8:circle",
			},
		},
		{
			name: "task_unfinished",
			path: "/task/unfinished",
			component: "self",
			meta: {
				title: "未完成",
				requiresAuth: true,
				icon: "icons8:cancel",
			},
		},
	],
	meta: {
		title: "任务表",
		icon: "icons8:numbered-list",
		order: 3
	},
};

export default task;
