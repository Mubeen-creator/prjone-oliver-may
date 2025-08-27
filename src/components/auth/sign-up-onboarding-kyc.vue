<template>
  <div>
    <h1>KYC</h1>
    <p>Complete your KYC here (placeholder form).</p>
    <button @click="completeKyc">Complete KYC</button>
    <p v-if="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { authHandler } from "@/services/authHandler";

const router = useRouter();
const auth = useAuthStore();
const error = ref("");

async function completeKyc() {
  try {
    const start = performance.now();
    console.log("[KYC] Starting KYC completion at:", start);

    await authHandler.updateProfileAttributes({ "custom:kyc": "true" });

    const mid = performance.now();
    console.log(`[KYC] updateProfileAttributes took ${(mid - start).toFixed(2)} ms`);

    const { idToken } = await authHandler.restoreSession();

    const end = performance.now();
    console.log(`[KYC] restoreSession took ${(end - mid).toFixed(2)} ms`);
    console.log(`[KYC] Total KYC completion flow took ${(end - start).toFixed(2)} ms`);

    auth.setTokenAndDecode(idToken);
    router.push("/dashboard");
  } catch (err) {
    error.value = "Failed to complete KYC: " + (err.message || "Unknown error");
    console.error("[KYC] Error during KYC completion:", err);
  }
}

</script>
<script>
export const assets = {
  critical: ["/css/onboarding.css"],
  high: [],
  normal: ["/images/kyc-bg.jpg"],
};
</script>
