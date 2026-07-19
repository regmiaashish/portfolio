import { useState } from "react";
import { MdArrowOutward, MdCopyright } from "react-icons/md";
import "./styles/Contact.css";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiUrl}/api/v1/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Something went wrong");
      }
      setStatus("success");
      setForm({ name: "", email: "", message: "" });
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="contact-section section-container" id="contact">
      <div className="contact-container">
        <div className="contact-header">
          <h3>Got a project?</h3>
          <p className="contact-subtitle">
            Let's build something great together. Drop me a line and I'll get back to you as soon as possible. I'm always
            open to interesting conversations and new opportunities.
          </p>
        </div>

        <div className="contact-email-hero">
          <a
            href="mailto:regmiaashish660@gmail.com"
            className="contact-email-link"
            data-cursor="disable"
          >
            <span className="contact-email-label">Quick reach</span>
            <span className="contact-email-address">
              regmiaashish660@gmail.com
              <MdArrowOutward className="contact-email-arrow" />
            </span>
          </a>
        </div>

        <div className="contact-main">
          <div className="contact-form-box">
            <h4>Or drop a message directly</h4>
            {status === "success" ? (
              <div className="contact-success">
                <p>Message sent! I'll get back to you soon.</p>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                <input
                  type="text"
                  name="name"
                  placeholder="Your name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  data-cursor="disable"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Your email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  data-cursor="disable"
                />
                <textarea
                  name="message"
                  placeholder="Your message"
                  rows={5}
                  value={form.message}
                  onChange={handleChange}
                  required
                  data-cursor="disable"
                />
                {status === "error" && (
                  <p className="contact-error">{errorMsg}</p>
                )}
                <button type="submit" disabled={status === "loading"} data-cursor="disable">
                  {status === "loading" ? "Sending..." : "Send"}
                </button>
              </form>
            )}
          </div>

          <div className="contact-side">
            <div className="contact-socials">
              <span className="contact-socials-label">Find me on</span>
              <div className="contact-socials-row">
                <a
                  href="https://github.com/regmiaashish"
                  target="_blank"
                  data-cursor="disable"
                  className="contact-social-pill"
                >
                  Github <MdArrowOutward />
                </a>
                <a
                  href="https://www.linkedin.com/in/aashish-regmi-228868309"
                  target="_blank"
                  data-cursor="disable"
                  className="contact-social-pill"
                >
                  Linkedin <MdArrowOutward />
                </a>
                <a
                  href="https://www.instagram.com/regs.exe"
                  target="_blank"
                  data-cursor="disable"
                  className="contact-social-pill"
                >
                  Instagram <MdArrowOutward />
                </a>
              </div>
            </div>

            <div className="contact-phone">
              <span className="contact-socials-label">Phone</span>
              <a href="tel:+9779840046034" data-cursor="disable" className="contact-phone-link">
                +977 9840046034
              </a>
            </div>
          </div>
        </div>

        <div className="contact-footer">
          <h2>
            Designed & Developed by <span>Aashish Regmi</span>
          </h2>
          <h5>
            <MdCopyright /> 2026
          </h5>
        </div>
      </div>
    </div>
  );
};

export default Contact;
