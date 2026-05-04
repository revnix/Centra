"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { OnboardingResponse } from "@/lib/api/onboarding";
import { Save } from "lucide-react";

interface PersonalInfoFormProps {
    onboarding: OnboardingResponse;
    onSave: (data: any) => Promise<void>;
    isSaving: boolean;
    isLocked?: boolean;
}

export function PersonalInfoForm({ onboarding, onSave, isSaving, isLocked }: PersonalInfoFormProps) {
    const [formData, setFormData] = useState({
        full_name: onboarding.candidate_name || "",
        cnic_number: onboarding.cnic_number || "",
        phone_number: onboarding.phone_number || "",
        current_address: onboarding.current_address || "",
        emergency_contact: onboarding.emergency_contact || "",
        bank_name: onboarding.bank_name || "",
        bank_iban: onboarding.bank_iban || "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-sm font-semibold">Full Name</Label>
                    <Input
                        id="full_name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        disabled={isLocked}
                        className="h-11 bg-slate-50 border-slate-200"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cnic_number" className="text-sm font-semibold">CNIC / National ID *</Label>
                    <Input
                        id="cnic_number"
                        name="cnic_number"
                        value={formData.cnic_number}
                        onChange={handleChange}
                        required
                        placeholder="1234567890-1"
                        disabled={isLocked}
                        className="h-11 bg-slate-50 border-slate-200"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone_number" className="text-sm font-semibold">Phone Number *</Label>
                    <Input
                        id="phone_number"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        required
                        placeholder="0300-1234567"
                        disabled={isLocked}
                        className="h-11 bg-slate-50 border-slate-200"
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="current_address" className="text-sm font-semibold">Current Address *</Label>
                    <Textarea
                        id="current_address"
                        name="current_address"
                        value={formData.current_address}
                        onChange={handleChange}
                        required
                        placeholder="House #123, Street #1, City"
                        disabled={isLocked}
                        className="min-h-[100px] bg-slate-50 border-slate-200"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="emergency_contact" className="text-sm font-semibold">Emergency Contact</Label>
                    <Input
                        id="emergency_contact"
                        name="emergency_contact"
                        value={formData.emergency_contact}
                        onChange={handleChange}
                        placeholder="Name - 0300-1234567"
                        disabled={isLocked}
                        className="h-11 bg-slate-50 border-slate-200"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bank_name" className="text-sm font-semibold">Bank Name</Label>
                    <Input
                        id="bank_name"
                        name="bank_name"
                        value={formData.bank_name}
                        onChange={handleChange}
                        placeholder="HBL, Meezan, etc."
                        disabled={isLocked}
                        className="h-11 bg-slate-50 border-slate-200"
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bank_iban" className="text-sm font-semibold">Bank Details (IBAN/Account)</Label>
                    <Input
                        id="bank_iban"
                        name="bank_iban"
                        value={formData.bank_iban}
                        onChange={handleChange}
                        placeholder="PK00 HABL 0000 0000 0000 0000"
                        disabled={isLocked}
                        className="h-11 bg-slate-50 border-slate-200"
                    />
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
