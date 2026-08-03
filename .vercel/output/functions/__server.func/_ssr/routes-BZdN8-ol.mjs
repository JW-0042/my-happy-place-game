import { g as require_jsx_runtime, h as ClientOnly } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BZdN8-ol.js
var import_jsx_runtime = require_jsx_runtime();
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "h-[calc(100dvh-var(--grok-banner-h,0px))] overflow-hidden",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientOnly, { fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "desktop-wallpaper flex h-full items-center justify-center",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-white/70",
				children: "Starting Windoors 11.2…"
			})
		}) })
	});
}
//#endregion
export { Home as component };
