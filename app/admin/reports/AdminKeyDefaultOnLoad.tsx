"use client";

import { useEffect } from "react";

/** /admin/reports 初回表示時: ADMIN_KEY 未設定なら開発用デフォルトを入れる */
export default function AdminKeyDefaultOnLoad() {
  useEffect(() => {
    if (!localStorage.getItem("ADMIN_KEY")) {
      localStorage.setItem("ADMIN_KEY", "admin");
    }
  }, []);
  return null;
}
