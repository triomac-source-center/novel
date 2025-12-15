"use client";

import React from "react";
import { Button } from "@/components/Button";
import { signInWithGoogle } from "@/lib/auth-actions";

const SignInWithGoogleButton = () => {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => signInWithGoogle()}
    >
      Login with Google
    </Button>
  );
};

export default SignInWithGoogleButton;
