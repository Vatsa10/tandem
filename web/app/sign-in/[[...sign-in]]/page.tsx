import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex flex-1 items-center justify-center bg-paper">
      <SignIn path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
}
