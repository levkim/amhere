import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  relation: string | null;
};

// 데모 모드 로컬 상태
let demoContacts: EmergencyContact[] = [];

export function useMyContacts() {
  return useQuery({
    queryKey: ["emergency-contacts"],
    queryFn: async (): Promise<EmergencyContact[]> => {
      if (!supabase) return [...demoContacts];
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("id, name, phone, relation")
        .order("created_at");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useAddContact() {
  return useMutation({
    mutationFn: async (input: { name: string; phone: string; relation: string | null }) => {
      if (!supabase) {
        demoContacts = [...demoContacts, { id: `demo-${Date.now()}`, ...input }];
        return;
      }
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("로그인이 필요해요.");
      const { error } = await supabase
        .from("emergency_contacts")
        .insert({ user_id: user.id, ...input });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emergency-contacts"] }),
  });
}

export function useDeleteContact() {
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) {
        demoContacts = demoContacts.filter((c) => c.id !== id);
        return;
      }
      const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emergency-contacts"] }),
  });
}
