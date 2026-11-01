import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { HelpCircle, Plus, Send, Eye, EyeOff } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Answer {
  username: string;
  display_name: string;
  answer: string;
  answered_at: string;
}

interface Question {
  id: string;
  question: string;
  asked_date: string;
  answers: Answer[];
  my_answer?: Answer;
  partner_answer?: Answer;
}

export default function QuestionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showReveal, setShowReveal] = useState<Record<string, boolean>>({});
  const [myAnswer, setMyAnswer] = useState('');
  const [newQ, setNewQ] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addingQ, setAddingQ] = useState(false);

  const { data: today, isLoading: todayLoading } = useQuery<Question>({
    queryKey: ['today-question'],
    queryFn: () => axios.get('/api/questions/today').then(r => r.data).catch(() => null),
  });

  const { data: history = [], isLoading: histLoading } = useQuery<Question[]>({
    queryKey: ['questions-history'],
    queryFn: () => axios.get('/api/questions').then(r => r.data),
  });

  const todayAnswered = today?.answers?.some(a => a.username === user?.username);

  async function submitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!myAnswer.trim() || !today) return;
    setSubmitting(true);
    try {
      await axios.post(`/api/questions/${today.id}/answer`, { answer: myAnswer });
      qc.invalidateQueries({ queryKey: ['today-question'] });
      qc.invalidateQueries({ queryKey: ['questions-history'] });
      setMyAnswer('');
    } catch { /* ignore */ } finally { setSubmitting(false); }
  }

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!newQ.trim()) return;
    setAddingQ(true);
    try {
      await axios.post('/api/questions', { question: newQ });
      qc.invalidateQueries({ queryKey: ['today-question'] });
      setNewQ('');
    } catch { /* ignore */ } finally { setAddingQ(false); }
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="mb-8">
        <h1 className="section-title">Daily Questions 💭</h1>
        <p className="section-subtitle">Connect a little deeper every day</p>
      </div>

      {/* Today's question */}
      {todayLoading ? (
        <div className="h-48 bg-cream-200 rounded-2xl shimmer mb-8" />
      ) : today ? (
        <div className="glass-card p-6 mb-8 bg-gradient-to-br from-blush-50 to-lavender-50 border-blush-100 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium bg-blush-200 text-rose-wine px-3 py-1 rounded-full">
              Today · {format(parseISO(today.asked_date), 'MMM d')}
            </span>
          </div>
          <p className="font-display text-2xl text-rose-wine mb-6">{today.question}</p>

          {/* Answers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {['divs', 'manuuu'].map(username => {
              const ans = today.answers?.find(a => a.username === username);
              const isMe = username === user?.username;
              return (
                <div key={username} className={`rounded-xl p-4 ${isMe ? 'bg-blush-100' : 'bg-lavender-100'}`}>
                  <p className="text-xs font-medium mb-2 text-stone-500">
                    {isMe ? '✍️ You' : `💌 ${username === 'divs' ? 'Divs' : 'Manuuu'}`}
                  </p>
                  {ans ? (
                    isMe || showReveal[today.id] ? (
                      <p className="font-handwriting text-base text-stone-700">{ans.answer}</p>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-stone-400 italic">Answer hidden</p>
                        <button onClick={() => setShowReveal(p => ({ ...p, [today.id]: true }))}
                          className="flex items-center gap-1 text-xs text-blush-500 hover:text-rose-wine">
                          <Eye size={12} /> Reveal
                        </button>
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-stone-400 italic">
                      {isMe ? 'Answer below ↓' : 'Not answered yet...'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {!todayAnswered && (
            <form onSubmit={submitAnswer} className="flex gap-3">
              <textarea value={myAnswer} onChange={e => setMyAnswer(e.target.value)}
                placeholder="Your answer..."
                className="input-dreamy flex-1 resize-none h-16 font-handwriting text-base" />
              <button type="submit" disabled={submitting || !myAnswer.trim()}
                className="btn-primary flex items-center gap-2 self-end">
                {submitting ? <span className="animate-spin">💗</span> : <Send size={16} />}
                {submitting ? '' : 'Answer'}
              </button>
            </form>
          )}
          {todayAnswered && (
            <p className="text-center text-sm text-blush-400 font-handwriting text-lg">
              You've answered today's question 💗
            </p>
          )}
        </div>
      ) : (
        <div className="glass-card p-8 mb-8 text-center">
          <div className="text-5xl mb-4">💭</div>
          <p className="font-handwriting text-2xl text-blush-300 mb-4">No question for today yet!</p>
          <p className="text-stone-400 text-sm mb-6">Add a question below to get started.</p>
        </div>
      )}

      {/* Add question */}
      <div className="glass-card p-5 mb-8">
        <h3 className="font-display text-base text-rose-wine mb-3 flex items-center gap-2">
          <Plus size={16} /> Add a Question
        </h3>
        <form onSubmit={addQuestion} className="flex gap-3">
          <input type="text" value={newQ} onChange={e => setNewQ(e.target.value)}
            placeholder="Ask something meaningful... e.g. What made you smile today?"
            className="input-dreamy flex-1" />
          <button type="submit" disabled={addingQ || !newQ.trim()}
            className="btn-secondary flex items-center gap-2 whitespace-nowrap">
            <HelpCircle size={16} /> {addingQ ? 'Adding...' : 'Add'}
          </button>
        </form>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="font-display text-lg text-rose-wine mb-4">Past Questions ✦</h2>
          <div className="space-y-4">
            {history.slice(0, 10).map(q => (
              <div key={q.id} className="glass-card p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs text-stone-400 mb-1">{format(parseISO(q.asked_date), 'MMMM d, yyyy')}</p>
                    <p className="font-display text-rose-wine">{q.question}</p>
                  </div>
                  <button onClick={() => setShowReveal(p => ({ ...p, [q.id]: !p[q.id] }))}
                    className="text-stone-400 hover:text-blush-400 p-1 transition-colors">
                    {showReveal[q.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {q.answers?.length > 0 && showReveal[q.id] && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {q.answers.map(a => (
                      <div key={a.username} className="bg-cream rounded-xl p-3">
                        <p className="text-xs font-medium text-stone-400 mb-1">{a.display_name}</p>
                        <p className="font-handwriting text-stone-600 text-sm">{a.answer}</p>
                      </div>
                    ))}
                  </div>
                )}
                {q.answers?.length === 0 && (
                  <p className="text-xs text-stone-400">No answers</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
