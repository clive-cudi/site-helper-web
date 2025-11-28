import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import {
  Role,
  Permission,
  hasPermission as checkPermission,
  canManageRole as checkCanManageRole,
} from "../services/permissions";

// Types and Interfaces
export interface TeamMember {
  id: string;
  business_account_id: string;
  user_id: string;
  role: Role;
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
  status: "active" | "invited" | "suspended";
}

export interface BusinessAccount {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamContextType {
  currentMember: TeamMember | null;
  businessAccount: BusinessAccount | null;
  teamMembers: TeamMember[];
  loading: boolean;
  hasPermission: (permission: Permission) => boolean;
  canManageRole: (targetRole: Role) => boolean;
  refreshTeam: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null);
  const [businessAccount, setBusinessAccount] =
    useState<BusinessAccount | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Load team data when user changes
  useEffect(() => {
    console.log({ user });
    if (user) {
      loadTeamData();
    } else {
      // Clear data when user logs out
      setCurrentMember(null);
      setBusinessAccount(null);
      setTeamMembers([]);
      setLoading(false);
    }
  }, [user]);

  /**
   * Load all team-related data for the current user
   */
  const loadTeamData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load current user's team member record
      const { data: memberData, error: memberError } = await supabase
        .from("team_members")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      console.log({ memberData });

      if (memberError) {
        console.error("Error loading team member:", memberError);
        setLoading(false);
        return;
      }

      setCurrentMember(memberData);

      // Load business account information
      const { data: accountData, error: accountError } = await supabase
        .from("business_accounts")
        .select("*")
        .eq("id", memberData.business_account_id)
        .single();

      if (accountError) {
        console.error("Error loading business account:", accountError);
      } else {
        setBusinessAccount(accountData);
      }

      // Load all team members for the business account
      const { data: membersData, error: membersError } = await supabase
        .from("team_members")
        .select("*")
        .eq("business_account_id", memberData.business_account_id)
        .order("joined_at", { ascending: true });

      if (membersError) {
        console.error("Error loading team members:", membersError);
      } else {
        setTeamMembers(membersData || []);
      }
    } catch (error) {
      console.error("Error loading team data:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh team data (useful after updates)
   */
  const refreshTeam = async () => {
    // await loadTeamData();
    return;
  };

  /**
   * Check if the current user has a specific permission
   */
  const hasPermission = (permission: Permission): boolean => {
    if (!currentMember) {
      return false;
    }
    return checkPermission(currentMember.role, permission);
  };

  /**
   * Check if the current user can manage a specific role
   */
  const canManageRole = (targetRole: Role): boolean => {
    if (!currentMember) {
      return false;
    }
    return checkCanManageRole(currentMember.role, targetRole);
  };

  const value: TeamContextType = {
    currentMember,
    businessAccount,
    teamMembers,
    loading,
    hasPermission,
    canManageRole,
    refreshTeam,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

/**
 * Hook to access team context
 * Must be used within a TeamProvider
 */
export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}
