import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signUp: (input: {
    email: string;
    password: string;
    businessName?: string;
    firstName?: string;
    lastName?: string;
    businessPhone?: string;
    websiteUrl?: string;
    invitedSignup?: boolean;
  }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (input: {
    email: string;
    password: string;
    businessName?: string;
    firstName?: string;
    lastName?: string;
    businessPhone?: string;
    websiteUrl?: string;
    invitedSignup?: boolean;
  }) => {
    const { email, password, invitedSignup } = input;
    const businessPhone = input.businessPhone?.trim();
    const websiteUrl = input.websiteUrl?.trim();
    const businessName = input.businessName?.trim();
    const firstName = input.firstName?.trim();
    const lastName = input.lastName?.trim();

    if (!invitedSignup) {
      if (!businessName || !firstName || !lastName) {
        throw new Error("Missing required signup details");
      }
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          business_name: businessName || null,
          first_name: firstName || null,
          last_name: lastName || null,
          business_phone: businessPhone || null,
          website_url: websiteUrl || null,
          invited_signup: Boolean(invitedSignup),
        },
      },
    });

    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
