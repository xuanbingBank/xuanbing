const node: AuthRoute.Route = {
	name: "node",
	path: "/node",
	component: "basic",
	children: [
		{
			name: "node_knowledgebase",
			path: "/node/knowledgebase",
			component: "self",
			meta: {
				title: "笔记库",
				requiresAuth: true,
				icon: "f7:music-house",
			},
		},
		{
			name: "node_notebase",
			path: "/node/notebase",
			component: "self",
			meta: {
				title: "知识库",
				requiresAuth: true,
				icon: "icon-park-solid:add-music",
			},
		},
	],
	meta: {
		title: "笔记",
		icon: "icons8:notebook",
		order: 2
	},
};

export default node;
