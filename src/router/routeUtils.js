import routeConfig from "./routeConfig.json";

export function getRouteBySlug(path) {
  console.log(`[ROUTE_UTILS] Searching for route with path: "${path}"`);
 
  return routeConfig.find(
    (route) =>
      route.slug === path ||
      (route.dynamicRoute &&
        path.match(new RegExp(route.slug.replace(/:[^/]+/g, "[^/]+"))))
  );
}
