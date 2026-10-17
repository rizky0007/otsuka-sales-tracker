"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  LoaderCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setMessage("");
    setIsError(false);

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setIsError(true);
      setMessage("Email dan password wajib diisi.");
      return;
    }

    if (password.length < 8) {
      setIsError(true);
      setMessage("Password harus terdiri dari minimal 8 karakter.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        window.location.href = "/";
        return;
      }

      setMessage(
        "Pendaftaran berhasil. Periksa email untuk konfirmasi akun, lalu login menggunakan akun Anda."
      );
    } catch (err) {
      console.error("Register error:", err);

      setIsError(true);
      setMessage(
        err instanceof Error
          ? err.message
          : "Pendaftaran gagal. Silakan coba kembali."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="page-content">
        <section className="register-card">
          <aside className="visual-panel">
            <div className="visual-copy">
              <div className="brand-label">
                <span className="brand-mark" />
                OTSUKA SALES TRACKER
              </div>

              <h1>
                JOIN
                <br />
                US.
              </h1>

              <p className="visual-subtitle">
                YOUR PERFORMANCE, OUR PRIORITY.
              </p>

              <p className="visual-description">
                Mulai perjalanan Anda bersama Otsuka Sales Tracker. Kelola
                target penjualan, pantau transaksi outlet, dan evaluasi
                pencapaian harian dalam satu sistem.
              </p>

              <div className="visual-divider" />

              <div className="visual-caption">
                <span className="online-dot" />
                SALES MANAGEMENT SYSTEM
              </div>
            </div>

            <div className="bubble bubble-one" />
            <div className="bubble bubble-two" />
            <div className="bubble bubble-three" />
          </aside>

          <section className="form-panel">
            <div className="form-inner">
              <div className="mobile-brand">
                <span className="mobile-mark" />
                <div>
                  <strong>OTSUKA</strong>
                  <span>SALES TRACKER</span>
                </div>
              </div>

              <header className="form-heading">
                <span className="section-label">CREATE ACCOUNT</span>
                <h2>Sign up</h2>
                <p>Buat akun baru untuk mulai menggunakan sistem.</p>
              </header>

              <form onSubmit={handleRegister} noValidate>

                <div className="field">
                  <label htmlFor="email">Alamat email</label>
                  <div className="input-wrap">
                    <Mail size={18} aria-hidden="true" />
                    <input
                      id="email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="nama@email.com"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (message) setMessage("");
                      }}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="password">Buat password</label>
                  <div className="input-wrap">
                    <LockKeyhole size={18} aria-hidden="true" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="new-password"
                      placeholder="Minimal 8 karakter"
                      minLength={8}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        if (message) setMessage("");
                      }}
                      disabled={loading}
                      required
                    />

                    <button
                      type="button"
                      className="show-password"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Lihat password"
                      }
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                      <span>{showPassword ? "HIDE" : "SHOW"}</span>
                    </button>
                  </div>
                </div>

                {message && (
                  <div
                    className={isError ? "error-message" : "success-message"}
                    role={isError ? "alert" : "status"}
                  >
                    {message}
                  </div>
                )}

                <button
                  className="register-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <LoaderCircle size={17} className="button-spinner" />
                      Memproses pendaftaran...
                    </>
                  ) : (
                    <>
                      Sign up
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>

              <div className="separator">
                <span />
                <span>OR</span>
                <span />
              </div>

              <p className="signup-caption">
                Sudah punya akun? <Link href="/login">Sign in</Link>
              </p>

              <div className="security-note">
                <ShieldCheck size={15} />
                <span>AKSES KHUSUS PENGGUNA TERDAFTAR</span>
              </div>
            </div>
          </section>
        </section>

        <footer className="page-footer">
          OTSUKA SALES TRACKER <span>·</span> SALES PERFORMANCE, SIMPLIFIED
        </footer>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          background: linear-gradient(145deg, #0785df, #0665ad 53%, #084575);
          font-family: Arial, Helvetica, sans-serif;
        }

        .page-content {
          width: 100%;
          max-width: 1000px;
          margin: auto;
        }

        .register-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          width: 100%;
          min-height: 550px;
          overflow: hidden;
          border-radius: 17px;
          background: #fff;
          box-shadow: 0 22px 55px rgba(0, 28, 61, 0.19);
          animation: enter 0.35s ease-out both;
        }

        .visual-panel {
          isolation: isolate;
          position: relative;
          display: flex;
          align-items: center;
          min-width: 0;
          padding: 48px;
          overflow: hidden;
          color: #fff;
          background: linear-gradient(145deg, #0788e8, #075399);
        }

        .visual-panel::after {
          content: "";
          position: absolute;
          z-index: -1;
          top: -12%;
          right: -43%;
          width: 70%;
          height: 124%;
          border-radius: 50%;
          background: #fff;
        }

        .visual-copy {
          z-index: 2;
          width: 100%;
          max-width: 300px;
        }

        .brand-label {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 31px;
          color: #e4f3ff;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.7px;
        }

        .brand-mark,
        .mobile-mark {
          width: 9px;
          height: 9px;
          flex-shrink: 0;
          border-radius: 3px;
          background: #fff;
        }

        .visual-copy h1 {
          margin: 0 0 15px;
          font-size: clamp(39px, 4.3vw, 52px);
          font-weight: 800;
          line-height: 1.02;
          letter-spacing: 1px;
        }

        .visual-subtitle {
          margin: 0 0 16px;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.7;
          letter-spacing: 1px;
        }

        .visual-description {
          max-width: 270px;
          margin: 0;
          color: #d8edff;
          font-size: 11px;
          line-height: 1.9;
        }

        .visual-divider {
          width: 39px;
          height: 3px;
          margin-top: 25px;
          border-radius: 3px;
          background: #fff;
        }

        .visual-caption {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 28px;
          color: #e2f2ff;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .online-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #8de5b8;
        }

        .bubble {
          position: absolute;
          z-index: 1;
          pointer-events: none;
          border-radius: 50%;
          background: linear-gradient(145deg, #078fed, #0564ad);
        }

        .bubble-one {
          right: 5%;
          bottom: 7%;
          width: 140px;
          aspect-ratio: 1;
        }

        .bubble-two {
          left: -55px;
          bottom: -64px;
          width: 150px;
          aspect-ratio: 1;
        }

        .bubble-three {
          top: -42px;
          left: 22%;
          width: 90px;
          aspect-ratio: 1;
        }

        .form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 0;
          padding: 38px 45px;
          background: #fff;
        }

        .form-inner {
          width: 100%;
          max-width: 350px;
          min-width: 0;
        }

        .mobile-brand {
          display: none;
        }

        .section-label {
          color: #0873bd;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.8px;
        }

        .form-heading h2 {
          margin: 10px 0 7px;
          color: #172033;
          font-size: 38px;
          line-height: 1.15;
          letter-spacing: -1.1px;
          font-weight: 800;
        }

        .form-heading p {
          margin: 0 0 23px;
          color: #7b8493;
          font-size: 12px;
          line-height: 1.7;
        }

        .field {
          margin-bottom: 15px;
        }

        .field label {
          display: block;
          margin-bottom: 8px;
          color: #354154;
          font-size: 11px;
          font-weight: 700;
        }

        .input-wrap {
          display: flex;
          align-items: center;
          width: 100%;
          height: 46px;
          min-width: 0;
          gap: 11px;
          padding: 0 12px;
          border: 1px solid #e5e9ef;
          border-radius: 7px;
          background: #f5f6f8;
          color: #667386;
          transition: border-color 0.18s, background 0.18s;
        }

        .input-wrap:focus-within {
          border-color: #167bc2;
          background: #fff;
        }

        .input-wrap > svg {
          flex-shrink: 0;
        }

        .input-wrap input {
          flex: 1;
          width: 0;
          min-width: 0;
          height: 100%;
          padding: 0;
          border: 0;
          outline: 0;
          color: #1d2939;
          background: transparent;
          font-family: inherit;
          font-size: 12px;
        }

        .input-wrap input::placeholder {
          color: #9aa3af;
        }

        .input-wrap input:read-only {
          color: #667386;
          cursor: default;
        }

        .field-note {
          margin: 6px 0 0;
          color: #929ba8;
          font-size: 10px;
        }

        .show-password {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          gap: 5px;
          padding: 5px 0 5px 3px;
          border: 0;
          color: #07528b;
          background: transparent;
          cursor: pointer;
          font-size: 9px;
          font-weight: 700;
        }

        .show-password:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message,
        .success-message {
          margin: 0 0 14px;
          padding: 10px 12px;
          border-radius: 7px;
          font-size: 11px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .error-message {
          border: 1px solid #fecaca;
          background: #fff1f2;
          color: #b42332;
        }

        .success-message {
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          color: #166534;
        }

        .register-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          min-height: 47px;
          padding: 11px 15px;
          border: 1px solid #073b69;
          border-radius: 7px;
          background: #07477d;
          color: #fff;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.18s, transform 0.18s;
        }

        .register-button:hover:not(:disabled) {
          background: #06385f;
        }

        .register-button:active:not(:disabled) {
          transform: translateY(1px);
        }

        .register-button:disabled {
          cursor: wait;
          opacity: 0.75;
        }

        .button-spinner {
          animation: spin 0.8s linear infinite;
        }

        .separator {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 17px 0;
          color: #929aa6;
          font-size: 10px;
        }

        .separator span:first-child,
        .separator span:last-child {
          flex: 1;
          height: 1px;
          background: #e4e8ee;
        }

        .signup-caption {
          margin: 17px 0 0;
          color: #808a99;
          text-align: center;
          font-size: 10px;
          line-height: 1.7;
        }

        .signup-caption a {
          color: #07558f;
          font-weight: 700;
          text-decoration: none;
        }

        .signup-caption a:hover {
          text-decoration: underline;
        }

        .security-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 23px;
          color: #929ba8;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-align: center;
        }

        .security-note svg {
          flex-shrink: 0;
        }

        .page-footer {
          margin-top: 22px;
          color: rgba(255, 255, 255, 0.8);
          text-align: center;
          font-size: 9px;
          font-weight: 600;
          line-height: 1.8;
          letter-spacing: 1.2px;
        }

        .page-footer span {
          padding: 0 5px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes enter {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 760px) {
          .page {
            padding: 24px 16px;
          }

          .register-card {
            display: block;
            max-width: 420px;
            min-height: 0;
            margin: auto;
            border-radius: 13px;
          }

          .visual-panel {
            display: none;
          }

          .form-panel {
            display: block;
            padding: 30px 26px 27px;
          }

          .mobile-brand {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 30px;
          }

          .mobile-mark {
            width: 10px;
            height: 10px;
            background: #0876c4;
          }

          .mobile-brand div {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }

          .mobile-brand strong {
            color: #123d65;
            font-size: 11px;
            letter-spacing: 1px;
          }

          .mobile-brand div span {
            color: #778496;
            font-size: 9px;
            letter-spacing: 1px;
          }

          .form-heading h2 {
            font-size: 34px;
          }

          .form-heading p {
            margin-bottom: 22px;
          }

          .page-footer {
            max-width: 320px;
            margin: 18px auto 0;
            font-size: 8px;
          }
        }

        @media (max-width: 360px) {
          .page {
            padding: 14px 10px;
          }

          .form-panel {
            padding: 25px 18px 23px;
          }

          .input-wrap {
            gap: 8px;
            padding: 0 10px;
          }

          .show-password {
            gap: 4px;
            font-size: 8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .register-card {
            animation: none;
          }

          .input-wrap,
          .register-button {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}