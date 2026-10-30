"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase, supabaseConfigured } from "@/lib/supabase";

type Suggestion = {
  id: string;
  category: string;
  title: string;
  content: string;
  author_label: string;
  status: string;
  reply: string | null;
  likes: number;
  created_at: string;
};

const categories = ["급식", "기숙사", "학교 시설", "수업·학습", "학교생활", "학생 편의", "기타"];
const statuses = ["접수 완료", "검토 중", "답변 완료", "반영 완료"];

export default function Home() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("new");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ category: "", title: "", content: "", anonymous: true, author: "" });
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    if (!supabaseConfigured) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("suggestions")
      .select("id,category,title,content,author_label,status,reply,likes,created_at")
      .order("created_at", { ascending: false });
    if (error) setNotice("건의 목록을 불러오지 못했습니다. Supabase 설정과 데이터베이스 정책을 확인해 주세요.");
    else setItems((data || []) as Suggestion[]);
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, []);

  const filtered = useMemo(() => {
    let result = items.filter((item) =>
      (!category || item.category === category) &&
      (!status || item.status === status) &&
      (!query || `${item.title} ${item.content}`.toLowerCase().includes(query.toLowerCase()))
    );
    if (sort === "popular") result = [...result].sort((a, b) => b.likes - a.likes);
    return result;
  }, [items, category, status, query, sort]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabaseConfigured) { setNotice("먼저 Supabase 프로젝트와 환경 변수를 설정해야 합니다."); return; }
    if (!form.category || form.title.trim().length < 2 || form.content.trim().length < 5) {
      setNotice("분야를 선택하고 제목과 내용을 조금 더 자세히 작성해 주세요."); return;
    }
    if (!form.anonymous && !form.author.trim()) { setNotice("공개할 이름 또는 별칭을 입력해 주세요."); return; }
    setSubmitting(true); setNotice("");
    const { error } = await supabase.from("suggestions").insert({
      category: form.category,
      title: form.title.trim(),
      content: form.content.trim(),
      author_label: form.anonymous ? "익명" : form.author.trim(),
    });
    setSubmitting(false);
    if (error) setNotice("제출에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    else {
      setForm({ category: "", title: "", content: "", anonymous: true, author: "" });
      setNotice("건의가 접수되었습니다. 의견을 보내줘서 고맙습니다.");
      await refresh();
    }
  }

  async function like(id: string) {
    if (!supabaseConfigured) return;
    const key = `cnsm-voted-${id}`;
    if (localStorage.getItem(key)) { setNotice("이 브라우저에서는 이미 공감한 건의입니다."); return; }
    const voter = localStorage.getItem("cnsm-voter-id") || crypto.randomUUID();
    localStorage.setItem("cnsm-voter-id", voter);
    const { error } = await supabase.rpc("cast_suggestion_vote", { p_suggestion_id: id, p_voter_id: voter });
    if (error) setNotice("공감 등록에 실패했습니다. 데이터베이스 SQL 설정을 확인해 주세요.");
    else { localStorage.setItem(key, "1"); await refresh(); }
  }

  const reviewCount = items.filter((i) => i.status === "접수 완료" || i.status === "검토 중").length;
  const doneCount = items.filter((i) => i.status === "답변 완료" || i.status === "반영 완료").length;

  return (
    <>
      <header className="siteHeader">
        <div className="topbar wrap">
          <Link className="brand" href="/"><span className="brandMark">▦</span><span><strong>충남반도체마이스터고</strong><small>학생 소통 · 건의함</small></span></Link>
          <nav><a href="#board">건의 게시판</a><a href="#write">건의 작성</a><Link href="/admin">관리자</Link></nav>
        </div>
        <section className="hero wrap">
          <div><span className="eyebrow">STUDENT VOICE · SCHOOL IMPROVEMENT</span><h1>학생의 의견이<br />학교를 바꿉니다.</h1><p>학교생활의 불편한 점과 더 나은 학교를 위한 아이디어를 자유롭게 전달하세요.</p><a className="button primary" href="#write">＋ 건의사항 작성하기</a></div>
          <aside className="heroAside"><h2>더 나은 학교를 함께 만들어요</h2><p>구체적인 상황과 개선 방향을 알려주면 의견을 검토하는 데 도움이 됩니다.</p><div className="noticeBox">개인정보, 다른 학생의 실명, 비밀번호 등 민감한 정보는 작성하지 마세요.</div></aside>
        </section>
      </header>
      <main className="wrap main">
        {!supabaseConfigured && <div className="alert">아직 데이터베이스 연결 전입니다. README의 Supabase 설정을 완료하면 실제 저장 기능이 작동합니다.</div>}
        {notice && <div className="alert" role="status">{notice}</div>}
        <section className="stats">
          <div className="stat"><span>전체 건의</span><strong>{items.length}</strong></div>
          <div className="stat"><span>접수·검토 중</span><strong>{reviewCount}</strong></div>
          <div className="stat"><span>답변·반영 완료</span><strong>{doneCount}</strong></div>
        </section>
        <section id="write" className="section">
          <div className="sectionHeading"><div><span className="eyebrow dark">YOUR VOICE MATTERS</span><h2>건의사항 작성</h2></div><span className="tag">학생 참여</span></div>
          <form className="panel form" onSubmit={submit}>
            <div className="fieldGrid">
              <label>건의 분야 *<select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">분야 선택</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label>작성 방식<select value={form.anonymous ? "anonymous" : "named"} onChange={(e) => setForm({ ...form, anonymous: e.target.value === "anonymous" })}><option value="anonymous">익명으로 제출</option><option value="named">이름 또는 별칭 공개</option></select></label>
            </div>
            {!form.anonymous && <label>이름 또는 별칭 *<input value={form.author} maxLength={30} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="게시판에 표시할 이름" /></label>}
            <label>제목 *<input required minLength={2} maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="건의 내용을 한눈에 알 수 있게 작성해 주세요" /></label>
            <label>건의 내용 *<textarea required minLength={5} maxLength={3000} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="현재 상황, 불편한 점, 원하는 개선 방향을 적어주세요." rows={5} /></label>
            <p className="helper">건의 내용은 게시판에 공개됩니다. 비공개 상담 기능이 필요하면 학교 담당자와 별도 정책을 정한 뒤 추가하세요.</p>
            <button className="button primary" disabled={submitting}>{submitting ? "제출 중..." : "건의 제출하기"}</button>
          </form>
        </section>
        <section id="board" className="section">
          <div className="sectionHeading"><div><span className="eyebrow dark">SCHOOL COMMUNITY</span><h2>건의 게시판</h2></div><span className="tag">{filtered.length}건</span></div>
          <div className="filters"><input aria-label="건의 검색" placeholder="제목·내용 검색" value={query} onChange={(e) => setQuery(e.target.value)} /><select aria-label="분야 필터" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">모든 분야</option>{categories.map((c) => <option key={c}>{c}</option>)}</select><select aria-label="상태 필터" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">모든 상태</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select><select aria-label="정렬" value={sort} onChange={(e) => setSort(e.target.value)}><option value="new">최신순</option><option value="popular">공감순</option></select></div>
          <div className="cards">{loading ? <div className="empty">건의 목록을 불러오는 중입니다…</div> : filtered.length === 0 ? <div className="empty">등록된 건의가 없거나 검색 결과가 없습니다.</div> : filtered.map((item) => <article className="suggestion" key={item.id}><div className="suggestionTop"><div><div className="meta">{item.category} · {item.author_label} · {new Date(item.created_at).toLocaleDateString("ko-KR")}</div><h3>{item.title}</h3></div><span className={`status ${item.status === "반영 완료" || item.status === "답변 완료" ? "done" : item.status === "검토 중" ? "review" : ""}`}>{item.status}</span></div><p className="suggestionBody">{item.content}</p><div className="suggestionBottom"><button className="button secondary small" onClick={() => void like(item.id)}>♡ 공감 {item.likes}</button></div>{item.reply && <div className="reply"><strong>학교 답변</strong><p>{item.reply}</p></div>}</article>)}</div>
        </section>
      </main>
      <footer><strong>충남반도체마이스터고 학생 건의함</strong><p>학생들의 의견으로 더 나은 학교를 만듭니다.</p><small>학교 공식 운영 전 학교 측 승인 및 개인정보 처리 기준을 확인해 주세요.</small></footer>
    </>
  );
}
