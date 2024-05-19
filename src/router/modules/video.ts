const video: AuthRoute.Route = {
	name: "video",
	path: "/video",
	component: "basic",
	children: [
		{
			name: "video_localvideo",
			path: "/video/localvideo",
			component: "self",
			meta: {
				title: "本地视频库",
				requiresAuth: true,
				icon: "icons8:video-file",
			},
		},
		{
			name: "video_meshvideo",
			path: "/video/meshvideo",
			component: "self",
			meta: {
				title: "nas视频库",
				requiresAuth: true,
				icon: "icon-park-solid:add-music",
			},
		},
	],
	meta: {
		title: "视频库",
		icon: "icons8:video-call",
		order: 4
	},
};

export default video;
