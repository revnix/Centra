"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { OnboardingResponse } from "@/lib/api/onboarding";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonalInfoFormProps {
    onboarding: OnboardingResponse;
    onSave: (data: any) => Promise<void>;
    isSaving: boolean;
    isLocked?: boolean;
}

type FormFields = {
    full_name: string;
    cnic_number: string;
    phone_number: string;
    current_address: string;
    emergency_contact: string;
    bank_name: string;
    bank_iban: string;
};

type FormErrors = Partial<Record<keyof FormFields, string>>;

/** Formats raw digits into CNIC display format XXXXX-XXXXXXX-X as the user types. */
function formatCnic(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/** Keeps only digits for phone fields (max 11). */
function formatPhone(value: string): string {
    return value.replace(/\D/g, "").slice(0, 11);
}

function validateField(name: keyof FormFields, value: string): string {
    const trimmed = value.trim();
    switch (name) {
        case "full_name":
            if (!trimmed) return "Full name is required";
            if (trimmed.length < 3) return "Name must be at least 3 characters";
            return "";
        case "cnic_number": {
            if (!trimmed) return "CNIC is required";
            const digits = trimmed.replace(/\D/g, "");
            if (digits.length !== 13) return "CNIC must be exactly 13 digits (XXXXX-XXXXXXX-X)";
            return "";
        }
        case "phone_number": {
            if (!trimmed) return "Phone number is required";
            const digits = trimmed.replace(/\D/g, "");
            if (digits.length !== 11) return "Phone number must be exactly 11 digits";
            if (!digits.startsWith("0")) return "Phone number must start with 0 (e.g. 03001234567)";
            return "";
        }
        case "current_address":
            if (!trimmed) return "Address is required";
            if (trimmed.length < 10) return "Please enter your complete address";
            return "";
        case "emergency_contact": {
            if (!trimmed) return ""; // optional
            const digits = trimmed.replace(/\D/g, "");
            if (digits.length !== 11) return "Contact number must be exactly 11 digits";
            if (!digits.startsWith("0")) return "Contact number must start with 0 (e.g. 03001234567)";
            return "";
        }
        case "bank_iban": {
            if (!trimmed) return ""; // optional
            const compact = trimmed.replace(/\s/g, "");
            if (compact.length < 10) return "Enter a valid IBAN or account number (min 10 characters)";
            return "";
        }
        default:
            return "";
    }
}

export function PersonalInfoForm({ onboarding, onSave, isSaving, isLocked }: PersonalInfoFormProps) {
    const [formData, setFormData] = useState<FormFields>({
        full_name: onboarding.candidate_name || "",
        cnic_number: onboarding.cnic_number || "",
        phone_number: onboarding.phone_number || "",
        current_address: onboarding.current_address || "",
        emergency_contact: onboarding.emergency_contact || "",
        bank_name: onboarding.bank_name || "",
        bank_iban: onboarding.bank_iban || "",
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Partial<Record<keyof FormFields, boolean>>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const name = e.target.name as keyof FormFields;
        let value = e.target.value;

        // Live input masks
        if (name === "cnic_number") value = formatCnic(value);
        if (name === "phone_number" || name === "emergency_contact") value = formatPhone(value);

        setFormData(prev => ({ ...prev, [name]: value }));
        // Re-validate live once the field has been touched, so the error clears as the user fixes it
        if (touched[name]) {
            setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const name = e.target.name as keyof FormFields;
        setTouched(prev => ({ ...prev, [name]: true }));
        setErrors(prev => ({ ...prev, [name]: validateField(name, e.target.value) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate everything on submit
        const newErrors: FormErrors = {};
        (Object.keys(formData) as (keyof FormFields)[]).forEach(name => {
            const msg = validateField(name, formData[name]);
            if (msg) newErrors[name] = msg;
        });
        setErrors(newErrors);
        setTouched({
            full_name: true, cnic_number: true, phone_number: true,
            current_address: true, emergency_contact: true, bank_name: true, bank_iban: true,
        });

        if (Object.keys(newErrors).length > 0) {
            // Focus the first invalid field
            const firstError = (Object.keys(newErrors) as (keyof FormFields)[])[0];
            document.getElementById(firstError)?.focus();
            return;
        }

        await onSave(formData);
    };

    const fieldError = (name: keyof FormFields) => (touched[name] && errors[name]) || "";

    const inputClass = (name: keyof FormFields) =>
        cn(
            "h-11 bg-slate-50 border-slate-200",
            fieldError(name) && "border-red-400 bg-red-50/50 focus-visible:ring-red-400"
        );

    const ErrorText = ({ name }: { name: keyof FormFields }) => {
        const msg = fieldError(name);
        if (!msg) return null;
        return (
            <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {msg}
            </p>
        );
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-sm font-semibold">Full Name *</Label>
                    <Input
                        id="full_name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="John Doe"
                        disabled={isLocked}
                        className={inputClass("full_name")}
                    />
                    <ErrorText name="full_name" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cnic_number" className="text-sm font-semibold">CNIC / National ID *</Label>
                    <Input
                        id="cnic_number"
                        name="cnic_number"
                        value={formData.cnic_number}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        inputMode="numeric"
                        placeholder="13302-1234567-1"
                        disabled={isLocked}
                        className={inputClass("cnic_number")}
                    />
                    <ErrorText name="cnic_number" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone_number" className="text-sm font-semibold">Phone Number *</Label>
                    <Input
                        id="phone_number"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        inputMode="numeric"
                        placeholder="03001234567"
                        disabled={isLocked}
                        className={inputClass("phone_number")}
                    />
                    <ErrorText name="phone_number" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="emergency_contact" className="text-sm font-semibold">Emergency Contact Number</Label>
                    <Input
                        id="emergency_contact"
                        name="emergency_contact"
                        value={formData.emergency_contact}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        inputMode="numeric"
                        placeholder="03001234567"
                        disabled={isLocked}
                        className={inputClass("emergency_contact")}
                    />
                    <ErrorText name="emergency_contact" />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="current_address" className="text-sm font-semibold">Current Address *</Label>
                    <Textarea
                        id="current_address"
                        name="current_address"
                        value={formData.current_address}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="House #123, Street #1, City"
                        disabled={isLocked}
                        className={cn(
                            "min-h-[100px] bg-slate-50 border-slate-200",
                            fieldError("current_address") && "border-red-400 bg-red-50/50 focus-visible:ring-red-400"
                        )}
                    />
                    <ErrorText name="current_address" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bank_name" className="text-sm font-semibold">Bank Name</Label>
                    <Input
                        id="bank_name"
                        name="bank_name"
                        value={formData.bank_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="HBL, Meezan, etc."
                        disabled={isLocked}
                        className={inputClass("bank_name")}
                    />
                    <ErrorText name="bank_name" />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bank_iban" className="text-sm font-semibold">Bank Details (IBAN/Account)</Label>
                    <Input
                        id="bank_iban"
                        name="bank_iban"
                        value={formData.bank_iban}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="PK00 HABL 0000 0000 0000 0000"
                        disabled={isLocked}
                        className={inputClass("bank_iban")}
                    />
                    <ErrorText name="bank_iban" />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    type="submit"
                    disabled={isSaving || isLocked}
                    className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-600/20"
                >
                    {isLocked ? "Information Locked" : isSaving ? "Saving..." : "Save & Continue"}
                </Button>
            </div>
        </form>
    );
}
