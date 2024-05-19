const collection: AuthRoute.Route = {
	name: "collection",
	path: "/collection",
	component: "basic",
	children: [
		{
			name: "collection_webcollection",
			path: "/collection/webcollection",
			component: "self",
			meta: {
				title: "网址收藏库",
				requiresAuth: true,
				icon: "uiw:link",
			},
		},
		{
			name: "collection_codecollection",
			path: "/collection/codecollection",
			component: "self",
			meta: {
				title: "代码收藏库",
				requiresAuth: true,
				icon: "icons8:code-file",
			},
		},
		{
			name: "collection_fictioncollection",
			path: "/collection/fictioncollection",
			component: "self",
			meta: {
				title: "小说收藏库",
				requiresAuth: true,
				icon: "icons8:document",
			},
		},
		{
			name: "collection_imgcollection",
			path: "/collection/imgcollection",
			component: "self",
			meta: {
				title: "图片收藏库",
				requiresAuth: true,
				icon: "icons8:image-file",
			},
		},
		{
			name: "collection_videocollection",
			path: "/collection/videocollection",
			component: "self",
			meta: {
				title: "视频收藏库",
				requiresAuth: true,
				icon: "icons8:video-file",
			},
		}
	],
	meta: {
		title: "收藏库",
		icon: "icons8:opened-folder",
		order: 5
	},
};

export default collection;
