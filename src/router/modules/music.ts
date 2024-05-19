const music: AuthRoute.Route = {
	name: "music",
	path: "/music",
	component: "basic",
	children: [
		{
			name: "music_localmusic",
			path: "/music/localmusic",
			component: "self",
			meta: {
				title: "本地音乐",
				requiresAuth: true,
				icon: "f7:music-house",
			},
		},
		{
			name: "music_meshmusic",
			path: "/music/meshmusic",
			component: "self",
			meta: {
				title: "网易云音乐",
				requiresAuth: true,
				icon: "icon-park-solid:add-music",
			},
		},
	],
	meta: {
		title: "音乐",
		icon: "icon-park-twotone:music",
		order: 3
	},
};

export default music;
