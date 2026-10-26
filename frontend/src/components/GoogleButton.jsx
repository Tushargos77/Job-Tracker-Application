import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function GoogleButton() {
  const { googleLogin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!window.google || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          await googleLogin(response.credential);
          toast.success("Welcome!");
          navigate("/");
        } catch (err) {
          toast.error(err.message);
        }
      },
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: 332,
      text: "continue_with",
    });
  }, [googleLogin, toast, navigate]);

  return <div ref={buttonRef} className="google-btn-wrap" />;
}