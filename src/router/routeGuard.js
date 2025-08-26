import { useAuthStore } from "@/stores/useAuthStore";
import routesJson from "@/router/routeConfig.json";

// Normalize path (remove trailing slash, strip query/hash)
function normalize(path) {
  return path.replace(/\/+$/, "").split("?")[0].split("#")[0] || "/";
}

// function getRouteBySlug(path) {
//   const cleanPath = normalize(path);
//   console.log(`[GUARD] Cleaned path for matching: "${cleanPath}"`);
//   return routesJson.find(
//     (route) =>
//       normalize(route.slug) === cleanPath ||
//       (route.dynamicRoute &&
//         route.slug.includes("/:") &&
//         cleanPath.match(new RegExp(route.slug.replace(/:[^/]+/g, "[^/]+"))))
//   );
// }
function getRouteBySlug(path) {
  const cleanPath = normalize(path);
  console.log(`[GUARD] Cleaned path for matching: "${cleanPath}"`);
  let route = routesJson.find(
    (route) =>
      normalize(route.slug) === cleanPath ||
      (route.dynamicRoute &&
        route.slug.includes("/:") &&
        cleanPath.match(new RegExp(route.slug.replace(/:[^/]+/g, "[^/]+"))))
  );
if (route?.inheritConfigFromParent) {   const parentRoute = routesJson.find(r => r.slug === "/dashboard");
  console.log(`[GUARD] Inheriting config from parent for "${cleanPath}": ${JSON.stringify(parentRoute)}`);
  console.log(`[GUARD] Dynamic match pattern="${route.slug}" tested against="${cleanPath}" → MATCHED`);

  route = { ...parentRoute, ...route, requiresAuth: parentRoute.requiresAuth, redirectIfNotAuth: parentRoute.redirectIfNotAuth };
}
  return route;
}

function getParentRouteDeps(path) {
  const segments = normalize(path).split("/");
  const parents = [];
  while (segments.length > 1) {
    segments.pop();
    const parentPath = segments.join("/") || "/";
    const parent = getRouteBySlug(parentPath);
    if (parent?.inheritConfigFromParent) {
      console.log(`[GUARD] Found parent route for "${path}": "${parentPath}"`);
      parents.push(parent)};
  }
  return parents.reverse();
}

export default function routeGuard(to, from, next) {
  const auth = useAuthStore();
  const user = auth.simulate || auth.currentUser;
  console.log(`[GUARD] Session hydration complete → ${JSON.stringify(user)}`);

  console.log(`[GUARD] Navigation request to "${to.path}" from "${from.path}"`);
  const route = getRouteBySlug(to.path);

  console.log(`[GUARD] Route : ${JSON.stringify(route)}`);

  // --- 1. Token expiration check ---
  const now = Math.floor(Date.now() / 1000);

  if(user?.raw?.exp){
    console.log(`[GUARD] Token expiry: ${user.raw.exp}, now: ${now}`)
    console.log(`[GUARD] Token details: ${JSON.stringify(user.raw)}`)
    if(now >= user.raw.exp){
      console.log("[GUARD] Token expired -> logging out & redirect to /log-in")
      auth.logout();
      return next("/log-in");
    }
  }
  // if (user?.raw?.exp && now >= user.raw.exp) {
  //   console.log("[GUARD] Token expired -> logging out & redirect to /log-in")
  //   auth.logout();
  //   return next("/log-in");
  // }

  // --- 2. Auth checks before 404 ---
  // if (route?.requiresAuth && !user) {
  //   return next(route.redirectIfNotAuth || "/log-in");
  // }
console.log(`[GUARD] Route detection → requiresAuth=${route?.requiresAuth}, redirectIfNotAuth=${route?.redirectIfNotAuth}, redirectIfLoggedIn=${route?.redirectIfLoggedIn}`);

  if(route?.requiresAuth) {
    console.log(`[GUARD] Route requires auth`)
    if(!user){
      console.warn(`[GUARD] No user session -> redirect to ${route.redirectIfNotAuth || "/log-in"}`)
      return next(route.redirectIfNotAuth || "/log-in");
    }
    console.log(`[GUARD] Auth check passed → user logged in`);
  }else{
    console.log(`[GUARD] Routes does not require auth`)
  }

  // if (route?.redirectIfLoggedIn && user) {
  //   return next(route.redirectIfLoggedIn);
  // }

  if(route?.redirectIfLoggedIn && user){
    if(user){
    console.warn(`[GUARD] User already logged in -> redirect to ${route.redirectIfLoggedIn}`)
    
    return next(route.redirectIfLoggedIn);
    }else {
      console.log(`[GUARD] RedirectIfLoggedIn not triggered → user not logged in`);

    }

  }

  // --- 3. Route existence check ---
  // if (!route) return next("/404");
  if(!route){
    console.error(`[GUARD] No matching route for "${to.path}" -> redirect to /404`)
    return next("/404");
  }
  console.log(`[GUARD] Matched route config: ${JSON.stringify(route)}`)

  // --- 4. Role-based restrictions ---
  // if (
  //   route.supportedRoles?.length &&
  //   !["any", "all"].includes(route.supportedRoles[0]) &&
  //   !route.supportedRoles.includes(user?.role)
  // ) {
  //   return next("/dashboard");
  // }

  if(route.supportedRoles?.length && !["any", "all"].includes(route.supportedRoles[0])){
    console.log(`[GUARD] Route supports roles: ${route.supportedRoles.join(", ")}`)
    if(!route.supportedRoles.includes(user?.role)){
       console.warn(`[GUARD]  User role "${user?.role}" not allowed → redirect to /dashboard`);
      return next("/dashboard");
    }
  }

  // --- 5. Dependencies (from parents + self) ---
  // const parentDeps = getParentRouteDeps(to.path);
  // const allDeps = [...parentDeps, route];

  // for (const r of allDeps) {
  //   const deps = r.dependencies || {};
  //   const roleDeps = deps.roles?.[user?.role] || {};

  //   for (const [key, val] of Object.entries(roleDeps)) {
  //     if (val?.required && !user?.[key]) {
  //       console.log(`[GUARD] ❌ User missing required dependency "${key}" for role "${user?.role}" → redirect to ${val.fallbackSlug || "/404"}`);
  //       return next(val.fallbackSlug || "/404");
  //     }
  //   }

  //   for (const [key, val] of Object.entries(deps)) {
  //     if (key !== "roles" && val?.required && !user?.[key]) {
  //       console.log(`[GUARD] ❌ User missing required dependency "${key}" → redirect to ${val.fallbackSlug || "/404"}`);
  //       return next(val.fallbackSlug || "/404");
  //     }
  //   }
  // }
  const parentDeps = getParentRouteDeps(to.path);
  const allDeps = [...parentDeps, route];

  for (const r of allDeps) {
    const deps = r.dependencies || {};
    const roleDeps = deps.roles?.[user?.role] || {};

    console.log(`[GUARD] Checking dependencies for route "${r.slug}"`);

    for (const [key, val] of Object.entries(roleDeps)) {
      console.log(`[GUARD] Role-based dep "${key}" required=${val?.required}, user=${user?.[key]}`);
      console.log(`[GUARD] Checking role-based dep "${key}" against user data: ${JSON.stringify(user)}`)
      if (val?.required && !user?.[key]) {
        console.warn(`[GUARD]  Missing dependency "${key}" → redirect to ${val.fallbackSlug || "/404"}`);
        return next(val.fallbackSlug || "/404");
      }
    }

    for (const [key, val] of Object.entries(deps)) {
      if (key === "roles") continue;
      console.log(`[GUARD] General dep "${key}" required=${val?.required}, user=${user?.[key]}`);
      if (val?.required && !user?.[key]) {
        console.warn(`[GUARD]  Missing dependency "${key}" → redirect to ${val.fallbackSlug || "/404"}`);
        return next(val.fallbackSlug || "/404");
      }
    }
  }


  // --- 6. Allow navigation ---
  console.log(`[GUARD]  All checks passed → allow navigation to "${to.path}"`);
  next();
}
