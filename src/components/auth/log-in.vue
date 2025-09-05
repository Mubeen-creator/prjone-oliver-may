<template>
  <div>
    <h1 class="bg-red-500 text-white p-4 text-2xl font-bold fs-pb-66 fs-fz-22 pb-44 fs-mt-120">AUTH SECTION - Login Page</h1>
    <form @submit.prevent="handleLogin" class="fs-w-300 fs-lh-32">
      <input v-model="email" type="email" placeholder="Email" required class="fs-pb-22 fs-fz-16" />
      <input v-model="password" type="password" placeholder="Password" required class="fs-pb-22 fs-fz-16" />
      <button type="submit" class="fs-h-100 fs-fz-20">{{ isLoading ? 'logging in...' : 'login' }}</button>
    </form>
    <p v-if="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { authHandler } from "@/services/authHandler";

const email = ref("");
const password = ref("");
const error = ref("");
const router = useRouter();
const auth = useAuthStore();
const isLoading = ref(false);

async function handleLogin() {
  try {
    isLoading.value = true;
    console.log("[LOGIN] Attempting login with:", email.value);
    const { idToken, accessToken, refreshToken } = await authHandler.login(
      email.value,
      password.value
    );

    localStorage.setItem("idToken", idToken);
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    auth.setTokenAndDecode(idToken);
    auth.startTokenRefreshLoop();
    isLoading.value = false;
    if (!auth.currentUser.onboardingPassed) {
      router.push("/sign-up/onboarding");
    } else if (
      auth.currentUser.role === "creator" &&
      !auth.currentUser.kycPassed
    ) {
      router.push("/sign-up/onboarding/kyc");
    } else {
      router.push("/dashboard");
    }
  } catch (err) {
    console.error("[LOGIN] Login failed:", err);
    error.value = "Login failed: " + (err.message || "Unknown error");
  }
}
</script>

<script>
export const assets = {
  critical: ["/css/auth.css"],
  high: [],
  normal: ["/images/auth-bg.jpg"],
};
</script>
