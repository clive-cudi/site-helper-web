import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Authentication failed";
}

function isValidName(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z\s'-]{1,49}$/.test(value);
}

function isLikelyValidBusinessName(value: string): boolean {
  return value.length >= 2 && value.length <= 80;
}

function isValidBusinessPhone(value: string): boolean {
  return /^\+?[0-9()\-\s]{7,20}$/.test(value);
}

function isValidWebsiteUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(normalized);
    return Boolean(parsed.hostname) && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signUp, signIn } = useAuth();
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);

  const validateForm = (): string | null => {
    const emailValue = email.trim();
    const passwordValue = password.trim();

    if (!emailValue) return "Email is required";
    if (!passwordValue) return "Password is required";
    if (passwordValue.length < 6) return "Password must be at least 6 characters";

    if (!isSignUp) return null;

    const businessNameValue = businessName.trim();
    const firstNameValue = firstName.trim();
    const lastNameValue = lastName.trim();
    const businessPhoneValue = businessPhone.trim();
    const websiteUrlValue = websiteUrl.trim();

    if (!isLikelyValidBusinessName(businessNameValue)) {
      return "Business name must be between 2 and 80 characters";
    }
    if (!isValidName(firstNameValue)) {
      return "Enter a valid first name";
    }
    if (!isValidName(lastNameValue)) {
      return "Enter a valid last name";
    }
    if (businessPhoneValue && !isValidBusinessPhone(businessPhoneValue)) {
      return "Enter a valid business phone number";
    }
    if (!isValidWebsiteUrl(websiteUrlValue)) {
      return "Enter a valid website URL";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp({
          email: email.trim(),
          password: password.trim(),
          businessName: businessName.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          businessPhone: businessPhone.trim(),
          websiteUrl: websiteUrl.trim(),
        });
      } else {
        await signIn(email.trim(), password.trim());
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div
        className={`${isSignUp ? "max-w-2xl" : "max-w-md"} w-full bg-white rounded-2xl shadow-xl p-8`}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isSignUp ? "Registration" : "Login"}
          </h1>
          <p className="text-gray-600">AI-Powered Customer Support</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-2 gap-y-2 gap-x-3"
        >
          {isSignUp && (
            <>
              <div>
                <label
                  htmlFor="businessName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Business Name
                </label>
                <input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={80}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Acme Inc."
                />
              </div>

              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={50}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John"
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={50}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label
                  htmlFor="businessPhone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Business Phone (Optional)
                </label>
                <input
                  id="businessPhone"
                  type="tel"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  minLength={7}
                  maxLength={20}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1 555 123 4567"
                />
              </div>

              <div>
                <label
                  htmlFor="websiteUrl"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Business Website (Optional)
                </label>
                <input
                  id="websiteUrl"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>
            </>
          )}
          <div className={`${isSignUp ? "" : "col-span-2"}`}>
            <label
              htmlFor="email"
              className={`block text-sm font-medium text-gray-700 mb-2`}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div className={`${isSignUp ? "" : "col-span-2"}`}>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type={isPasswordVisible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          {isSignUp && (
            <>
              <div>
                <label
                  htmlFor="confirm_password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirm Password
                </label>
                <input
                  id="confirm_password"
                  type={isPasswordVisible ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center gap-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="show_password"
                  onChange={(e) => {
                    setIsPasswordVisible(e.target.checked);
                  }}
                />
                <label
                  htmlFor="show_password"
                  className="block text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Show Password
                </label>
              </div>
              <div></div>
            </>
          )}

          {error && (
            <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 col-span-2 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
