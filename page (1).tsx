"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase, supabaseConfigured } from "@/lib/supabase";

type Suggestion = { id: string; category: string; title: string; content: string; author_label: string; status: string; reply: string | null; created_at: string; };
const statuses = ["접수 완료", "검토 중", "답변 완료", "반영 완료"];

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [message, setMessage] = useState("");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [statusesById, setStatusesById] = useState<Record<string, string>>({});

  async function loadAdmin() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setSession(false); setIsAdmin(false); return; }
    setSession(true);
    const { data: profile } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id).maybeSingle();
    if (profile?.role !== "admin") { setIsAdmin(false); setMessage("이 계정에는 관리자 권한이 없습니다. Supabase에서 관리자 권한을 설정해 주세요."); return; }
    setIsAdmin(true);
    const { data, error } = await supabase.from("suggestions").select("id,category,title,content,author_label,status,reply,created_at").order("created_at", { ascending: false });
    if (error) setMessage("건의를 불러오지 못했습니다. 데이터베이스 정책을 확인해 주세요.");
    else setItems((data || []) as Suggestion[]);
  }

  useEffect(() => { if (supabaseConfigured) void loadAdmin(); }, []);

  async function login(e: FormEvent) {
    e.preventDefault(); setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage("로그인에 실패했습니다. 관리자 계정과 비밀번호를 확인해 주세요.");
    else await loadAdmin();
  }

  async function update(item: Suggestion) {
    const { error } = await supabase.from("suggestions").update({
      status: statusesById[item.id] || item.status,
      reply: replies[item.id] ?? item.reply ?? "",
    }).eq("id", item.id);
    if (error) setMessage("저장에 실패했습니다. 관리자 권한과 RLS 정책을 확인해 주세요.");
    else { setMessage("답변과 처리 상태를 저장했습니다."); await loadAdmin(); }
  }

  async function logout() { await supabase.auth.signOut(); setSession(false); setIsAdmin(false); setItems([]); }

  return <main className="adminPage wrap">
    <div className="adminHeader"><Link className="brand darkBrand" href="/"><span className="brandMark">▦</span><span><strong>충남반도체마이스터고</strong><small>건의함 관리자</small></span></Link><Link href="/" className="button secondary">학생용 사이트로</Link></div>
    <div className="sectionHeading"><div><span className="eyebrow dark">STAFF ACCESS</span><h1>건의함 관리자</h1></div></div>
    {!supabaseConfigured && <div className="alert">먼저 프로젝트의 환경 변수와 Supabase 설정을 완료해 주세요.</div>}
    {message && <div className="alert" role="status">{message}</div>}
    {!isAdmin ? <form className="panel adminLogin" onSubmit={login}><h2>담당자 로그인</h2><p className="helper">학교에서 승인받은 담당자 계정만 사용하세요.</p><label>이메일<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>비밀번호<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label><button className="button primary" disabled={!supabaseConfigured}>로그인</button>{session && <p className="helper">로그인은 되었지만 관리자 권한이 확인되지 않았습니다.</p>}</form> :
      <><div className="adminActions"><p>접수된 건의 {items.length}건</p><button className="button secondary" onClick={() => void logout()}>로그아웃</button></div>
      <div className="cards">{items.map((item) => <article className="suggestion" key={item.id}><div className="meta">{item.category} · {item.author_label} · {new Date(item.created_at).toLocaleString("ko-KR")}</div><h3>{item.title}</h3><p className="suggestionBody">{item.content}</p><label>처리 상태<select value={statusesById[item.id] ?? item.status} onChange={(e) => setStatusesById({ ...statusesById, [item.id]: e.target.value })}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></label><label>학교 답변<textarea rows={3} value={replies[item.id] ?? item.reply ?? ""} onChange={(e) => setReplies({ ...replies, [item.id]: e.target.value })} placeholder="검토 결과와 안내 내용을 작성하세요." /></label><button className="button primary" onClick={() => void update(item)}>답변·상태 저장</button></article>)}</div></>}
  </main>;
}
