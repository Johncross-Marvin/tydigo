// Legacy OTP page — redirects to new email-first auth
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const OtpPage = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate("/login", { replace: true }); }, [navigate]);
  return null;
};

export default OtpPage;
