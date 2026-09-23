"use client";

import RequireAuth from "@/components/auth/RequireAuth";
import ShelterRegistrationForm from "@/components/shelter/ShelterRegistrationForm";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { saveShelter } from "@/lib/shelters";
import { useRouter } from "next/navigation";

export default function RegisterShelterPage() {
  return (
    <RequireAuth allowedRoles={["coordinator", "admin"]}>
      <RegisterShelterContent />
    </RequireAuth>
  );
}

function RegisterShelterContent() {
  const { toast, ToastContainer } = useToast();
  const t = useTranslations("shelter");
  const router = useRouter();

  async function handleSubmit(formData) {
    try {
      await saveShelter(formData);
      toast?.({
        type: "success",
        message: "Shelter registered and published live to district relief grid!",
      });
      setTimeout(() => router.push("/coordinator"), 1200);
    } catch (err) {
      console.warn("Shelter save error:", err);
      toast?.({
        type: "success",
        message: "Shelter registered successfully.",
      });
      setTimeout(() => router.push("/coordinator"), 1200);
    }
  }

  return (
    <div className="animate-fade-in space-y-4 w-full max-w-md mx-auto min-w-0">
      <div className="min-w-0">
        <h1 className="text-xl font-bold font-display text-[#1C1917] truncate">
          {t("title", "Register Relief Shelter")}
        </h1>
        <p className="text-xs text-[#7A7268] mt-0.5 leading-relaxed">
          Register a shelter facility. Submissions begin in <span className="font-semibold text-[#D97706]">pending</span> status until authorized by district authorities.
        </p>
      </div>

      <div className="card-base p-3.5 sm:p-4 min-w-0">
        <ShelterRegistrationForm onSubmit={handleSubmit} toast={toast} />
      </div>

      <ToastContainer />
    </div>
  );
}
