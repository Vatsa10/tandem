// Themes Clerk's default widgets to match the app's paper/ink/rec brand
// tokens (see app/globals.css) instead of Clerk's stock indigo styling.
// Untyped (no `Appearance` type is re-exported from @clerk/nextjs) — the
// SignIn/SignUp `appearance` prop structurally accepts this shape.
export const clerkAppearance = {
  variables: {
    colorPrimary: "#15171d",
    colorBackground: "#f8f6ef",
    colorInputBackground: "#f8f6ef",
    colorInputText: "#15171d",
    colorText: "#15171d",
    colorTextSecondary: "#5b5d66",
    colorDanger: "#ff3b2f",
    colorNeutral: "#5b5d66",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-geist-sans)",
  },
  elements: {
    card: "shadow-none border border-line",
    headerTitle: "font-[family-name:var(--font-display)]",
    formButtonPrimary:
      "bg-ink hover:bg-ink/85 text-paper normal-case shadow-none",
    footerActionLink: "text-ink hover:text-ink/80",
    formFieldInput: "border-line focus:border-ink/30",
    dividerLine: "bg-line",
    socialButtonsBlockButton: "border-line hover:bg-paper-soft",
  },
};
